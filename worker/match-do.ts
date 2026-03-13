/**
 * CodeClash - Match Durable Object
 *
 * Runs a complete match series (N games) between connected players over WebSocket.
 *
 * Game loop design: the loop runs synchronously within a single DO execution
 * context. When a turn requires a player move, we send "your_turn" and return —
 * the loop resumes from handleMove() when the player's "move" message arrives.
 * This avoids awaiting a Promise across WebSocket message boundaries, which
 * breaks in Cloudflare's execution model.
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
  totalRounds: number;
}

export class MatchDO implements DurableObject {
  private config: MatchConfig | null = null;
  private players: Map<string, ConnectedPlayer> = new Map();
  private state: GameState | null = null;
  private tally: GameTally = { wins: {}, totalScores: {}, gamesPlayed: 0, totalRounds: 0 };
  private currentGame = 0;
  private roundsThisGame = 0;
  private matchStarted = false;
  // When true, we're waiting for the current player to send a move
  private waitingForMove = false;

  constructor(
    private ctx: DurableObjectState,
    private env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/configure" && request.method === "POST") {
      this.config = (await request.json()) as MatchConfig;
      for (const id of this.config.playerIds) {
        this.tally.wins[id] = 0;
        this.tally.totalScores[id] = 0;
      }
      return new Response("configured", { status: 200 });
    }

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
        await this.handleMove(ws, msg.action);
        break;
    }
  }

  async webSocketClose(ws: WebSocket, _code: number): Promise<void> {
    for (const player of this.players.values()) {
      if (player.ws === ws) {
        player.connected = false;
        // If we're waiting for this player's move, auto-stand and continue
        if (this.waitingForMove && this.state) {
          const currentId = this.state.players[this.state.currentPlayerIndex].id;
          if (currentId === player.playerId) {
            await this.handleMove(ws, "stand");
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

    if (this.players.size === this.config.playerIds.length && !this.matchStarted) {
      this.matchStarted = true;
      this.startMatch();
    }
  }

  private async handleMove(ws: WebSocket, action: MoveAction): Promise<void> {
    if (!this.state || !this.waitingForMove) return;

    // Verify it's from the current player
    const currentId = this.state.players[this.state.currentPlayerIndex].id;
    const player = this.players.get(currentId);
    if (player && player.ws !== ws && player.connected) {
      this.sendTo(ws, { type: "error", message: "Not your turn" });
      return;
    }

    // Validate move
    const legalMoves = getLegalMoves(this.state);
    const validAction = legalMoves.includes(action) ? action : "stand";

    this.waitingForMove = false;

    // Apply move and broadcast events
    const result = applyMove(this.state, { action: validAction });
    this.state = result.state;
    for (const event of result.events) {
      this.broadcast({ type: "game_event", event });
    }

    // Continue the match execution
    this.continueMatch();
  }

  // ---------------------------------------------------------------------------
  // Match / Game Execution
  // ---------------------------------------------------------------------------

  private startMatch(): void {
    if (!this.config) return;

    const opponentNames = (playerId: string) =>
      this.config!.playerIds
        .filter((id) => id !== playerId)
        .map((id) => this.config!.playerNames[id] || id);

    for (const player of this.players.values()) {
      this.sendTo(player.ws, {
        type: "match_start",
        totalGames: this.config.totalGames,
        opponents: opponentNames(player.playerId),
      });
    }

    this.continueMatch();
  }

  /**
   * State machine: processes the match one decision point at a time.
   *
   * Called from:
   * - startMatch() — to begin
   * - handleMove() — after each player move
   * - Recursively from itself for auto-resolutions (round end, no legal moves, etc.)
   *
   * Returns only when waiting for a player move. All auto-resolutions
   * (round scoring, disconnected players, game transitions) are handled via
   * tail recursion.
   */
  private continueMatch(): void {
    if (!this.config) return;

    // 1. Start a new game if needed
    if (!this.state) {
      this.currentGame++;
      if (this.currentGame > this.config.totalGames) {
        console.log(`[MatchDO] all ${this.config.totalGames} games complete`);
        this.completeMatch();
        return;
      }
      console.log(`[MatchDO] starting game ${this.currentGame}/${this.config.totalGames}`);
      this.state = createInitialState(this.config.playerIds);
      this.roundsThisGame = 0;
      // Fall through to next check
    }

    // 2. Score any completed rounds
    if (isRoundOver(this.state)) {
      this.roundsThisGame++;
      const result = endRound(this.state);
      this.state = result.state;
      for (const event of result.events) {
        this.broadcast({ type: "game_event", event });
      }
      // If the round scoring ended the game, fall through to step 3 directly
      // rather than recursing (which would re-trigger isRoundOver infinitely
      // because endRound leaves players inactive when game is over).
      if (!this.state.gameOver) {
        this.continueMatch();
        return;
      }
    }

    // 3. Check if game is over (covers: post-endRound scoring hit 200, or mid_round_win)
    if (this.state.gameOver || isGameOver(this.state)) {
      const finalScores = calculateFinalScores(this.state);
      const winner = getWinner(this.state);

      this.tally.gamesPlayed++;
      this.tally.totalRounds += this.roundsThisGame;
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

      console.log(`[MatchDO] finished game ${this.currentGame}`);
      this.state = null;  // Clear for next game
      // Tail-recursive: start next game
      this.continueMatch();
      return;
    }

    // 4. Get current player and legal moves
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    const legalMoves = getLegalMoves(this.state);

    // 5. Handle: no legal moves — skip to next player
    if (legalMoves.length === 0) {
      this.state.currentPlayerIndex =
        (this.state.currentPlayerIndex + 1) % this.state.players.length;
      // Tail-recursive: check next player
      this.continueMatch();
      return;
    }

    // 6. Handle: disconnected player — auto-stand
    const player = this.players.get(currentPlayer.id);
    if (!player || !player.connected) {
      const result = applyMove(this.state, { action: "stand" });
      this.state = result.state;
      for (const event of result.events) {
        this.broadcast({ type: "game_event", event });
      }
      // Tail-recursive: continue after auto-move
      this.continueMatch();
      return;
    }

    // 7. Request move from live player and STOP
    this.waitingForMove = true;
    this.sendTo(player.ws, {
      type: "your_turn",
      state: toVisibleState(this.state),
      legalMoves,
    });
    // Return here; resume via handleMove() when player sends their move
  }

  // ---------------------------------------------------------------------------
  // Match Completion
  // ---------------------------------------------------------------------------

  private completeMatch(): void {
    if (!this.config) return;
    console.log(`[MatchDO] all games complete, building summary`);

    const summary = this.buildSummary();

    for (const player of this.players.values()) {
      let result: "win" | "loss" | "draw" = "draw";
      if (summary.winner === player.name) result = "win";
      else if (summary.winner !== null) result = "loss";

      this.sendTo(player.ws, { type: "match_complete", result, summary });
    }

    // Fire-and-forget async work (KV write + lobby report)
    this.ctx.waitUntil(this.finalizeMatch(summary));
  }

  private async finalizeMatch(summary: MatchSummary): Promise<void> {
    if (!this.config) return;

    if (this.config.mode === "tournament") {
      await kvPut(
        this.env.RESULTS,
        kvKeys.matchSummary(this.config.tournamentId, 0, this.config.matchId),
        summary
      );
    }

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

    players.sort((a, b) => b.wins - a.wins);
    players.forEach((p, i) => { p.rank = i + 1; });

    const winner = players[0].wins > (players[1]?.wins ?? 0) ? players[0].name : null;

    return {
      match_id: config.matchId,
      tournament_id: config.tournamentId,
      phase: config.phase,
      status: "complete",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      games_played: this.tally.gamesPlayed,
      avg_rounds: this.tally.gamesPlayed > 0
        ? this.tally.totalRounds / this.tally.gamesPlayed
        : 0,
      players,
      winner,
    };
  }

  private async reportToLobby(summary: MatchSummary): Promise<void> {
    if (!this.config) return;
    try {
      const lobbyId = this.env.LOBBY.idFromName(this.config.tournamentId);
      const lobby = this.env.LOBBY.get(lobbyId);
      const report: MatchResultReport = { matchId: this.config.matchId, summary };
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
    try { ws.send(JSON.stringify(msg)); } catch {}
  }

  private broadcast(msg: MatchToClientMessage): void {
    for (const player of this.players.values()) {
      if (player.connected) this.sendTo(player.ws, msg);
    }
  }
}
