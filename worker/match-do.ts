/**
 * CodeClash - Match Durable Object
 *
 * Runs a complete match series (N games) between connected players over WebSocket.
 * Uses the Cloudflare WebSocket Hibernation API for efficient idle handling.
 */

import {
  createInitialState,
  getLegalMoves,
  applyMove,
  isRoundOver,
  endRound,
  isGameOver,
  getWinner,
  calculateFinalScores,
} from "../src/game/engine";
import { toVisibleState } from "../src/game/visibility";
import type { GameState, MoveAction } from "../src/game/types";
import type {
  MatchConfig,
  MatchSummary,
  MatchPlayerResult,
  MatchResultReport,
  ClientToMatchMessage,
  MatchToClientMessage,
} from "../src/protocol/messages";
import { kvKeys, kvPut } from "../src/protocol/kv-schema";

interface Env {
  RESULTS: KVNamespace;
  LOBBY: DurableObjectNamespace;
}

interface ConnectedPlayer {
  playerId: string;
  name: string;
  ws: WebSocket;
  connected: boolean;
}

interface GameTally {
  wins: Record<string, number>;
  totalScores: Record<string, number>;
  gamesPlayed: number;
}

export class MatchDO implements DurableObject {
  private config: MatchConfig | null = null;
  private players: Map<string, ConnectedPlayer> = new Map();
  private state: GameState | null = null;
  private tally: GameTally = { wins: {}, totalScores: {}, gamesPlayed: 0 };
  private currentGame = 0;
  private matchStarted = false;
  private moveResolver: ((action: MoveAction) => void) | null = null;
  private moveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private ctx: DurableObjectState,
    private env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Configure match via POST from LobbyDO
    if (url.pathname === "/configure" && request.method === "POST") {
      this.config = (await request.json()) as MatchConfig;
      // Initialize tally
      for (const id of this.config.playerIds) {
        this.tally.wins[id] = 0;
        this.tally.totalScores[id] = 0;
      }
      return new Response("configured", { status: 200 });
    }

    // WebSocket upgrade for players
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.ctx.acceptWebSocket(server);

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer): Promise<void> {
    if (typeof data !== "string") return;

    let msg: ClientToMatchMessage;
    try {
      msg = JSON.parse(data);
    } catch {
      this.sendTo(ws, { type: "error", message: "Invalid JSON" });
      return;
    }

    switch (msg.type) {
      case "identify":
        this.handleIdentify(ws, msg.playerId, msg.name);
        break;
      case "move":
        this.handleMove(ws, msg.action);
        break;
    }
  }

  async webSocketClose(ws: WebSocket, _code: number): Promise<void> {
    // Mark player as disconnected
    for (const player of this.players.values()) {
      if (player.ws === ws) {
        player.connected = false;
        // If waiting for this player's move, auto-stand
        if (this.moveResolver && this.state) {
          const currentId = this.state.players[this.state.currentPlayerIndex].id;
          if (currentId === player.playerId) {
            this.resolveMove("stand");
          }
        }
        break;
      }
    }
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    await this.webSocketClose(ws, 1006);
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  private handleIdentify(ws: WebSocket, playerId: string, name: string): void {
    if (!this.config) {
      this.sendTo(ws, { type: "error", message: "Match not configured" });
      return;
    }

    if (!this.config.playerIds.includes(playerId)) {
      this.sendTo(ws, { type: "error", message: "Not a participant in this match" });
      return;
    }

    this.players.set(playerId, { playerId, name, ws, connected: true });

    // Check if all players have connected
    if (this.players.size === this.config.playerIds.length && !this.matchStarted) {
      this.matchStarted = true;
      this.startMatch();
    }
  }

  private handleMove(ws: WebSocket, action: MoveAction): void {
    if (!this.state || !this.moveResolver) return;

    // Verify it's from the current player
    const currentId = this.state.players[this.state.currentPlayerIndex].id;
    const player = this.players.get(currentId);
    if (!player || player.ws !== ws) {
      this.sendTo(ws, { type: "error", message: "Not your turn" });
      return;
    }

    // Validate the move
    const legalMoves = getLegalMoves(this.state);
    if (!legalMoves.includes(action)) {
      // Invalid move — default to stand
      this.resolveMove("stand");
    } else {
      this.resolveMove(action);
    }
  }

  // ---------------------------------------------------------------------------
  // Match Execution
  // ---------------------------------------------------------------------------

  private async startMatch(): Promise<void> {
    if (!this.config) return;

    const opponentNames = (playerId: string) =>
      this.config!.playerIds
        .filter((id) => id !== playerId)
        .map((id) => this.config!.playerNames[id] || id);

    // Notify all players
    for (const player of this.players.values()) {
      this.sendTo(player.ws, {
        type: "match_start",
        totalGames: this.config.totalGames,
        opponents: opponentNames(player.playerId),
      });
    }

    // Run all games
    for (let i = 0; i < this.config.totalGames; i++) {
      this.currentGame = i + 1;
      await this.runSingleGame();
    }

    // Match complete — build summary and report
    await this.completeMatch();
  }

  private async runSingleGame(): Promise<void> {
    if (!this.config) return;

    const playerIds = this.config.playerIds;
    this.state = createInitialState(playerIds);

    // Game loop
    while (!isGameOver(this.state)) {
      if (isRoundOver(this.state)) {
        const result = endRound(this.state);
        this.state = result.state;
        // Broadcast round events
        for (const event of result.events) {
          this.broadcast({ type: "game_event", event });
        }
        if (isGameOver(this.state)) break;
        continue;
      }

      const currentPlayer = this.state.players[this.state.currentPlayerIndex];
      const legalMoves = getLegalMoves(this.state);

      if (legalMoves.length === 0) {
        this.state.currentPlayerIndex =
          (this.state.currentPlayerIndex + 1) % this.state.players.length;
        continue;
      }

      // Send visible state to current player
      const visibleState = toVisibleState(this.state);
      const player = this.players.get(currentPlayer.id);

      let action: MoveAction;
      if (player && player.connected) {
        this.sendTo(player.ws, {
          type: "your_turn",
          state: visibleState,
          legalMoves: legalMoves,
        });

        // Wait for move with timeout
        action = await this.waitForMove(this.config.moveTimeoutMs);
      } else {
        // Player disconnected — auto-stand
        action = "stand";
      }

      // Apply move
      const result = applyMove(this.state, { action });
      this.state = result.state;

      // Broadcast events to all players
      for (const event of result.events) {
        this.broadcast({ type: "game_event", event });
      }
    }

    // Game complete
    const finalScores = calculateFinalScores(this.state);
    const winner = getWinner(this.state);

    // Update tally
    this.tally.gamesPlayed++;
    if (winner) {
      this.tally.wins[winner] = (this.tally.wins[winner] || 0) + 1;
    }
    for (const [id, score] of Object.entries(finalScores)) {
      this.tally.totalScores[id] = (this.tally.totalScores[id] || 0) + score;
    }

    this.broadcast({
      type: "game_complete",
      gameNumber: this.currentGame,
      scores: finalScores,
      winner,
    });
  }

  private waitForMove(timeoutMs: number): Promise<MoveAction> {
    return new Promise<MoveAction>((resolve) => {
      this.moveResolver = resolve;
      this.moveTimeout = setTimeout(() => {
        this.resolveMove("stand");
      }, timeoutMs);
    });
  }

  private resolveMove(action: MoveAction): void {
    if (this.moveTimeout) {
      clearTimeout(this.moveTimeout);
      this.moveTimeout = null;
    }
    if (this.moveResolver) {
      const resolver = this.moveResolver;
      this.moveResolver = null;
      resolver(action);
    }
  }

  // ---------------------------------------------------------------------------
  // Match Completion
  // ---------------------------------------------------------------------------

  private async completeMatch(): Promise<void> {
    if (!this.config) return;

    const summary = this.buildSummary();

    // Send results to each player
    for (const player of this.players.values()) {
      let result: "win" | "loss" | "draw" = "draw";
      if (summary.winner === player.name) {
        result = "win";
      } else if (summary.winner !== null) {
        result = "loss";
      }

      this.sendTo(player.ws, {
        type: "match_complete",
        result,
        summary,
      });
    }

    // Write to KV
    if (this.config.mode === "tournament") {
      await kvPut(
        this.env.RESULTS,
        kvKeys.matchSummary(this.config.tournamentId, 0, this.config.matchId),
        summary
      );
    }

    // Report result back to LobbyDO
    await this.reportToLobby(summary);
  }

  private buildSummary(): MatchSummary {
    const config = this.config!;

    const players: MatchPlayerResult[] = config.playerIds.map((id) => ({
      name: config.playerNames[id] || id,
      rank: 0,
      wins: this.tally.wins[id] || 0,
      avg_score: this.tally.gamesPlayed > 0
        ? this.tally.totalScores[id] / this.tally.gamesPlayed
        : 0,
    }));

    // Sort by wins descending, assign ranks
    players.sort((a, b) => b.wins - a.wins);
    players.forEach((p, i) => {
      p.rank = i + 1;
    });

    const winner = players[0].wins > (players[1]?.wins ?? 0) ? players[0].name : null;

    return {
      match_id: config.matchId,
      tournament_id: config.tournamentId,
      phase: config.phase,
      status: "complete",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      games_played: this.tally.gamesPlayed,
      players,
      winner,
    };
  }

  private async reportToLobby(summary: MatchSummary): Promise<void> {
    if (!this.config) return;

    try {
      const lobbyId = this.env.LOBBY.idFromName(this.config.tournamentId);
      const lobby = this.env.LOBBY.get(lobbyId);

      const report: MatchResultReport = {
        matchId: this.config.matchId,
        summary,
      };

      await lobby.fetch(new Request("https://internal/match-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      }));
    } catch (e) {
      console.error("Failed to report match result to lobby:", e);
    }
  }

  // ---------------------------------------------------------------------------
  // Messaging Helpers
  // ---------------------------------------------------------------------------

  private sendTo(ws: WebSocket, msg: MatchToClientMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // WebSocket may be closed
    }
  }

  private broadcast(msg: MatchToClientMessage): void {
    for (const player of this.players.values()) {
      if (player.connected) {
        this.sendTo(player.ws, msg);
      }
    }
  }
}
