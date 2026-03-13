/**
 * CodeClash - Lobby Durable Object
 *
 * Singleton per tournament. Manages player registration, tournament lifecycle,
 * bracket generation, and match orchestration via MatchDO instances.
 */

import type {
  PlayerInfo,
  TournamentFormat,
  TournamentPhase,
  BracketPhase,
  RoundRobinPhase,
  TournamentStanding,
  MatchConfig,
  MatchResultReport,
  MatchSummary,
  ClientToLobbyMessage,
  LobbyToClientMessage,
  AdminToLobbyMessage,
  LobbyToAdminMessage,
} from "../src/protocol/messages";
import {
  kvKeys,
  kvPut,
  type TournamentMeta,
  type PhaseResults,
} from "../src/protocol/kv-schema";

interface Env {
  RESULTS: KVNamespace;
  MATCH: DurableObjectNamespace;
  ADMIN_SECRET: string;
}

interface ConnectedPlayer {
  id: string;
  name: string;
  author: string;
  ws: WebSocket;
  ready: boolean;
  connected: boolean;
}

interface MatchTracker {
  matchId: string;
  playerIds: string[];
  phase: BracketPhase | RoundRobinPhase;
  complete: boolean;
  summary?: MatchSummary;
}

export class LobbyDO implements DurableObject {
  private players: Map<string, ConnectedPlayer> = new Map();
  private adminSockets: Set<WebSocket> = new Set();
  private tournamentId: string = "";
  private phase: TournamentPhase = "waiting";
  private format: TournamentFormat = "round-robin";
  private gamesPerMatch = 20;
  private moveTimeoutMs = 1000;

  // Match tracking
  private activeMatches: Map<string, MatchTracker> = new Map();
  private currentPhaseIndex = 0;
  private phases: MatchTracker[][] = [];
  private standings: TournamentStanding[] = [];

  constructor(
    private ctx: DurableObjectState,
    private env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Match completion callback from MatchDO
    if (url.pathname === "/match-complete" && request.method === "POST") {
      const report = (await request.json()) as MatchResultReport;
      await this.handleMatchComplete(report);
      return new Response("ok", { status: 200 });
    }

    // Admin status endpoint (HTTP, non-WebSocket)
    if (url.pathname === "/admin/status" && request.method === "GET") {
      return Response.json(this.getStatusPayload());
    }

    // WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      const isAdmin = url.pathname === "/ws/admin";

      // Admin auth check
      if (isAdmin) {
        const token = url.searchParams.get("token") ||
          request.headers.get("X-Admin-Token");
        if (token !== this.env.ADMIN_SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.ctx.acceptWebSocket(server);

      if (isAdmin) {
        this.adminSockets.add(server);
      }

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer): Promise<void> {
    if (typeof data !== "string") return;

    let msg: ClientToLobbyMessage | AdminToLobbyMessage;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    // Check if this is an admin socket
    if (this.adminSockets.has(ws)) {
      await this.handleAdminMessage(ws, msg as AdminToLobbyMessage);
    } else {
      await this.handlePlayerMessage(ws, msg as ClientToLobbyMessage);
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    // Remove admin socket
    if (this.adminSockets.has(ws)) {
      this.adminSockets.delete(ws);
      return;
    }

    // Mark player as disconnected
    for (const player of this.players.values()) {
      if (player.ws === ws) {
        player.connected = false;
        this.broadcastLobbyStatus();
        this.broadcastAdminEvent(`${player.name} disconnected`);
        break;
      }
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  // ---------------------------------------------------------------------------
  // Player Message Handling
  // ---------------------------------------------------------------------------

  private async handlePlayerMessage(ws: WebSocket, msg: ClientToLobbyMessage): Promise<void> {
    switch (msg.type) {
      case "join":
        this.handleJoin(ws, msg.name, msg.author, msg.tournament);
        break;
      case "ready":
        this.handleReady(ws);
        break;
    }
  }

  private handleJoin(ws: WebSocket, name: string, author: string, tournament: string): void {
    if (this.phase !== "waiting") {
      this.sendToPlayer(ws, { type: "error", message: "Tournament already in progress" });
      return;
    }

    // Check for duplicate names
    for (const player of this.players.values()) {
      if (player.name === name && player.connected) {
        this.sendToPlayer(ws, { type: "error", message: `Name "${name}" is already taken` });
        return;
      }
    }

    this.tournamentId = tournament || `tournament-${Date.now()}`;
    const playerId = crypto.randomUUID();

    const player: ConnectedPlayer = {
      id: playerId,
      name,
      author,
      ws,
      ready: false,
      connected: true,
    };

    this.players.set(playerId, player);

    this.sendToPlayer(ws, { type: "joined", playerId });
    this.broadcastLobbyStatus();
    this.broadcastAdminEvent(`${name} (${author}) joined the lobby`);
  }

  private handleReady(ws: WebSocket): void {
    for (const player of this.players.values()) {
      if (player.ws === ws) {
        player.ready = true;
        this.broadcastLobbyStatus();
        this.broadcastAdminEvent(`${player.name} is ready`);
        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Admin Message Handling
  // ---------------------------------------------------------------------------

  private async handleAdminMessage(ws: WebSocket, msg: AdminToLobbyMessage): Promise<void> {
    switch (msg.type) {
      case "admin_join":
        this.sendToAdmin(ws, this.getStatusPayload());
        break;

      case "start":
        await this.startTournament(msg.format, msg.gamesPerMatch);
        break;

      case "kick":
        this.kickPlayer(msg.playerId);
        break;

      case "reset":
        this.resetLobby();
        break;

      case "status":
        this.sendToAdmin(ws, this.getStatusPayload());
        break;
    }
  }

  private kickPlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;

    this.sendToPlayer(player.ws, { type: "error", message: "You have been removed from the tournament" });
    try { player.ws.close(1000, "Kicked"); } catch {}
    this.players.delete(playerId);
    this.broadcastLobbyStatus();
    this.broadcastAdminEvent(`${player.name} was kicked`);
  }

  private resetLobby(): void {
    // Disconnect all players
    for (const player of this.players.values()) {
      try { player.ws.close(1000, "Tournament reset"); } catch {}
    }

    this.players.clear();
    this.activeMatches.clear();
    this.phases = [];
    this.currentPhaseIndex = 0;
    this.standings = [];
    this.phase = "waiting";

    this.broadcastAdminEvent("Lobby has been reset");
  }

  // ---------------------------------------------------------------------------
  // Tournament Orchestration
  // ---------------------------------------------------------------------------

  private async startTournament(format: TournamentFormat, gamesPerMatch: number): Promise<void> {
    const connectedPlayers = [...this.players.values()].filter((p) => p.connected);

    if (connectedPlayers.length < 2) {
      this.broadcastAdminEvent("Need at least 2 connected players to start");
      return;
    }

    this.format = format;
    this.gamesPerMatch = gamesPerMatch;
    this.phase = "running";

    this.broadcastAdminEvent(`Tournament started: ${format} format, ${gamesPerMatch} games per match`);

    // Generate matchups based on format
    if (format === "bracket") {
      this.phases = this.generateBracketPhases(connectedPlayers);
    } else {
      this.phases = this.generateRoundRobinPhases(connectedPlayers);
    }

    // Write tournament metadata to KV
    const meta: TournamentMeta = {
      id: this.tournamentId,
      format,
      status: "running",
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      gamesPerMatch,
      moveTimeoutMs: this.moveTimeoutMs,
      totalPhases: this.phases.length,
      currentPhase: 1,
      playerCount: connectedPlayers.length,
    };
    await kvPut(this.env.RESULTS, kvKeys.tournamentMeta(this.tournamentId), meta);
    await kvPut(this.env.RESULTS, kvKeys.currentTournament(), this.tournamentId);

    // Start first phase
    await this.startPhase(0);
  }

  private generateBracketPhases(players: ConnectedPlayer[]): MatchTracker[][] {
    // Seed the bracket — pad to next power of 2 with byes
    const sorted = [...players];
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(sorted.length)));
    const phases: MatchTracker[][] = [];

    let currentPlayers = sorted.map((p) => p.id);
    // Pad with null for byes
    while (currentPlayers.length < bracketSize) {
      currentPlayers.push("BYE");
    }

    const phaseName = (round: number, total: number): BracketPhase => {
      if (round === total - 1) return "final";
      if (round === total - 2) return "semifinal";
      return "quarterfinal";
    };

    const totalRounds = Math.log2(bracketSize);

    // Generate first round
    const firstRound: MatchTracker[] = [];
    for (let i = 0; i < currentPlayers.length; i += 2) {
      const p1 = currentPlayers[i];
      const p2 = currentPlayers[i + 1];

      if (p1 === "BYE" || p2 === "BYE") continue; // Skip byes

      firstRound.push({
        matchId: crypto.randomUUID(),
        playerIds: [p1, p2],
        phase: phaseName(0, totalRounds),
        complete: false,
      });
    }
    phases.push(firstRound);

    // Later rounds are generated dynamically as matches complete
    // Store total rounds needed so we know when we're done
    return phases;
  }

  private generateRoundRobinPhases(players: ConnectedPlayer[]): MatchTracker[][] {
    const ids = players.map((p) => p.id);
    const phase: MatchTracker[] = [];

    // All pairings — each pair plays once (not twice like local tournament)
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        phase.push({
          matchId: crypto.randomUUID(),
          playerIds: [ids[i], ids[j]],
          phase: "qualifying",
          complete: false,
        });
      }
    }

    return [phase];
  }

  private async startPhase(phaseIndex: number): Promise<void> {
    this.currentPhaseIndex = phaseIndex;

    if (phaseIndex >= this.phases.length) {
      // Tournament complete
      await this.completeTournament();
      return;
    }

    const matches = this.phases[phaseIndex];
    this.broadcastAdminEvent(`Starting phase ${phaseIndex + 1} with ${matches.length} matches`);

    for (const match of matches) {
      this.activeMatches.set(match.matchId, match);
      await this.spawnMatch(match);
    }
  }

  private async spawnMatch(match: MatchTracker): Promise<void> {
    const matchDOId = this.env.MATCH.newUniqueId();
    const matchDO = this.env.MATCH.get(matchDOId);

    // Build player name map
    const playerNames: Record<string, string> = {};
    for (const id of match.playerIds) {
      const player = this.players.get(id);
      playerNames[id] = player?.name || id;
    }

    // Configure the MatchDO
    const config: MatchConfig = {
      matchId: match.matchId,
      tournamentId: this.tournamentId,
      phase: match.phase,
      playerIds: match.playerIds,
      playerNames,
      totalGames: this.gamesPerMatch,
      moveTimeoutMs: this.moveTimeoutMs,
      mode: "tournament",
    };

    await matchDO.fetch(new Request("https://internal/configure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    }));

    // Notify players of their match assignment
    for (const playerId of match.playerIds) {
      const player = this.players.get(playerId);
      if (!player || !player.connected) continue;

      const opponents = match.playerIds
        .filter((id) => id !== playerId)
        .map((id) => playerNames[id] || id);

      this.sendToPlayer(player.ws, {
        type: "match_assigned",
        matchId: match.matchId,
        opponents,
        phase: match.phase,
      });
    }

    this.broadcastAdminEvent(
      `Match started: ${match.playerIds.map((id) => playerNames[id]).join(" vs ")} (${match.phase})`
    );
  }

  // ---------------------------------------------------------------------------
  // Match Completion
  // ---------------------------------------------------------------------------

  private async handleMatchComplete(report: MatchResultReport): Promise<void> {
    const match = this.activeMatches.get(report.matchId);
    if (!match) return;

    match.complete = true;
    match.summary = report.summary;

    this.broadcastAdminEvent(
      `Match complete: ${report.summary.players.map((p) => `${p.name} (${p.wins}W)`).join(" vs ")} — Winner: ${report.summary.winner || "Draw"}`
    );

    // Check if all matches in current phase are done
    const currentPhase = this.phases[this.currentPhaseIndex];
    const allComplete = currentPhase.every((m) => m.complete);

    if (allComplete) {
      // Write phase results to KV
      const phaseResults: PhaseResults = {
        phase: this.currentPhaseIndex + 1,
        matches: currentPhase.map((m) => m.summary!).filter(Boolean),
        completedAt: new Date().toISOString(),
      };
      await kvPut(
        this.env.RESULTS,
        kvKeys.phaseResults(this.tournamentId, this.currentPhaseIndex + 1),
        phaseResults
      );

      // Update standings
      this.updateStandings();

      // For bracket format, generate next round from winners
      if (this.format === "bracket") {
        // Winner names → player IDs
        const nameToId = new Map<string, string>();
        for (const player of this.players.values()) {
          nameToId.set(player.name, player.id);
        }
        const winners = currentPhase
          .map((m) => m.summary?.winner)
          .filter((w): w is string => w !== null && w !== undefined)
          .map((name) => nameToId.get(name))
          .filter((id): id is string => id !== undefined);

        if (winners.length >= 2) {
          const nextPhase: MatchTracker[] = [];
          const bracketSize = Math.pow(2, Math.ceil(Math.log2([...this.players.values()].length)));
          const totalRounds = Math.log2(bracketSize);
          const nextRoundIndex = this.currentPhaseIndex + 1;

          const phaseName: BracketPhase =
            nextRoundIndex === totalRounds - 1 ? "final" :
            nextRoundIndex === totalRounds - 2 ? "semifinal" : "quarterfinal";

          for (let i = 0; i < winners.length; i += 2) {
            if (i + 1 < winners.length) {
              nextPhase.push({
                matchId: crypto.randomUUID(),
                playerIds: [winners[i], winners[i + 1]],
                phase: phaseName,
                complete: false,
              });
            }
          }

          if (nextPhase.length > 0) {
            this.phases.push(nextPhase);
          }
        }
      }

      // Start next phase
      await this.startPhase(this.currentPhaseIndex + 1);
    }
  }

  private updateStandings(): void {
    const stats: Map<string, { wins: number; losses: number; draws: number; totalPoints: number }> = new Map();

    // Initialize for all players
    for (const player of this.players.values()) {
      stats.set(player.id, { wins: 0, losses: 0, draws: 0, totalPoints: 0 });
    }

    // Build name→id lookup
    const nameToId = new Map<string, string>();
    for (const player of this.players.values()) {
      nameToId.set(player.name, player.id);
    }

    // Accumulate from all completed matches across all phases
    for (const phase of this.phases) {
      for (const match of phase) {
        if (!match.summary) continue;

        for (const result of match.summary.players) {
          const playerId = nameToId.get(result.name);
          if (!playerId) continue;
          const s = stats.get(playerId);
          if (!s) continue;
          s.wins += result.wins;
          const totalGames = match.summary.games_played;
          s.losses += totalGames - result.wins;
          s.totalPoints += result.wins;
        }
      }
    }

    this.standings = [...stats.entries()]
      .map(([playerId, s]) => {
        const player = this.players.get(playerId);
        return {
          playerId,
          name: player?.name || playerId,
          rank: 0,
          wins: s.wins,
          losses: s.losses,
          draws: s.draws,
          totalPoints: s.totalPoints,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints);

    this.standings.forEach((s, i) => { s.rank = i + 1; });
  }

  private async completeTournament(): Promise<void> {
    this.phase = "complete";

    // Write final standings to KV
    await kvPut(this.env.RESULTS, kvKeys.tournamentStandings(this.tournamentId), this.standings);

    // Update tournament meta
    const meta: TournamentMeta = {
      id: this.tournamentId,
      format: this.format,
      status: "complete",
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      gamesPerMatch: this.gamesPerMatch,
      moveTimeoutMs: this.moveTimeoutMs,
      totalPhases: this.phases.length,
      currentPhase: this.phases.length,
      playerCount: this.players.size,
    };
    await kvPut(this.env.RESULTS, kvKeys.tournamentMeta(this.tournamentId), meta);

    // Notify all players
    for (const player of this.players.values()) {
      if (!player.connected) continue;
      this.sendToPlayer(player.ws, {
        type: "tournament_complete",
        standings: this.standings,
      });
    }

    this.broadcastAdminEvent("Tournament complete!");
    this.broadcastAdminEvent(`Winner: ${this.standings[0]?.name || "Unknown"}`);
  }

  // ---------------------------------------------------------------------------
  // Messaging Helpers
  // ---------------------------------------------------------------------------

  private getPlayerInfoList(): PlayerInfo[] {
    return [...this.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      author: p.author,
      ready: p.ready,
      connected: p.connected,
    }));
  }

  private getStatusPayload(): LobbyToAdminMessage {
    const currentPhase = this.phases[this.currentPhaseIndex];
    const matchesComplete = currentPhase
      ? currentPhase.filter((m) => m.complete).length
      : 0;
    const matchesInProgress = currentPhase
      ? currentPhase.filter((m) => !m.complete).length
      : 0;

    return {
      type: "status",
      players: this.getPlayerInfoList(),
      phase: this.phase,
      format: this.format,
      currentPhase: currentPhase?.[0]?.phase,
      matchesInProgress,
      matchesComplete,
    };
  }

  private broadcastLobbyStatus(): void {
    const msg: LobbyToClientMessage = {
      type: "lobby_status",
      players: this.getPlayerInfoList(),
      phase: this.phase,
    };

    for (const player of this.players.values()) {
      if (player.connected) {
        this.sendToPlayer(player.ws, msg);
      }
    }

    // Also update admins
    this.broadcastAdmin(this.getStatusPayload());
  }

  private broadcastAdminEvent(message: string): void {
    const msg: LobbyToAdminMessage = {
      type: "event",
      message,
      timestamp: new Date().toISOString(),
    };
    this.broadcastAdmin(msg);
  }

  private sendToPlayer(ws: WebSocket, msg: LobbyToClientMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {}
  }

  private sendToAdmin(ws: WebSocket, msg: LobbyToAdminMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {}
  }

  private broadcastAdmin(msg: LobbyToAdminMessage): void {
    for (const ws of this.adminSockets) {
      this.sendToAdmin(ws, msg);
    }
  }
}
