/**
 * CodeClash - WebSocket Protocol Messages
 *
 * Defines all message types for the three communication channels:
 * 1. Participant CLI ↔ LobbyDO
 * 2. Participant CLI ↔ MatchDO
 * 3. Admin CLI ↔ LobbyDO
 */

import type {
  Card,
  PlayerState,
  MoveAction,
  GameEvent,
} from "../game/types";

export type { MoveAction };

// =============================================================================
// Shared Types
// =============================================================================

export interface PlayerInfo {
  id: string;
  name: string;
  author: string;
  ready: boolean;
  connected: boolean;
}

export type TournamentFormat = "bracket" | "round-robin";

export type TournamentPhase =
  | "waiting"
  | "running"
  | "complete";

export type BracketPhase =
  | "quarterfinal"
  | "semifinal"
  | "final";

export type RoundRobinPhase =
  | "qualifying"
  | "grand_prix";

export interface MatchSummary {
  match_id: string;
  tournament_id: string;
  phase: BracketPhase | RoundRobinPhase;
  status: "pending" | "running" | "complete";
  started_at: string;
  completed_at?: string;
  games_played: number;
  avg_rounds: number;
  players: MatchPlayerResult[];
  winner: string | null;
}

export interface MatchPlayerResult {
  name: string;
  rank: number;
  wins: number;
  avg_score: number;
}

// =============================================================================
// Visible Game State (sent to players — no hidden info)
// =============================================================================

export interface VisiblePlayerState {
  id: string;
  isActive: boolean;
  numberCards: PlayerState["numberCards"];
  roundScore: number;
  totalScore: number;
  modifierCards: PlayerState["modifierCards"];
  busted: boolean;
}

export interface VisibleGameState {
  players: VisiblePlayerState[];
  revealedCards: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  round: number;
  roundOver: boolean;
  gameOver: boolean;
  winner: string | null;
  deckSize: number;
}

// =============================================================================
// CLI → LobbyDO Messages
// =============================================================================

export type ClientToLobbyMessage =
  | { type: "join"; name: string; author: string; tournament: string }
  | { type: "ready" };

// =============================================================================
// LobbyDO → CLI Messages
// =============================================================================

export type LobbyToClientMessage =
  | { type: "joined"; playerId: string }
  | { type: "lobby_status"; players: PlayerInfo[]; phase: TournamentPhase }
  | { type: "match_assigned"; matchId: string; opponents: string[]; phase: BracketPhase | RoundRobinPhase }
  | { type: "tournament_complete"; standings: TournamentStanding[] }
  | { type: "error"; message: string };

export interface TournamentStanding {
  playerId: string;
  name: string;
  rank: number;
  wins: number;
  losses: number;
  draws: number;
  totalPoints: number;
}

// =============================================================================
// CLI → MatchDO Messages
// =============================================================================

export type ClientToMatchMessage =
  | { type: "identify"; playerId: string; name: string }
  | { type: "move"; action: MoveAction };

// =============================================================================
// MatchDO → CLI Messages
// =============================================================================

export type MatchToClientMessage =
  | { type: "match_start"; totalGames: number; opponents: string[] }
  | { type: "your_turn"; state: VisibleGameState; legalMoves: MoveAction[] }
  | { type: "game_event"; event: GameEvent }
  | { type: "game_complete"; gameNumber: number; scores: Record<string, number>; winner: string | null }
  | { type: "match_complete"; result: "win" | "loss" | "draw"; summary: MatchSummary }
  | { type: "error"; message: string };

// =============================================================================
// Admin → LobbyDO Messages
// =============================================================================

export type AdminToLobbyMessage =
  | { type: "admin_join" }
  | { type: "start"; format: TournamentFormat; gamesPerMatch: number }
  | { type: "kick"; playerId: string }
  | { type: "reset" }
  | { type: "status" };

// =============================================================================
// LobbyDO → Admin Messages
// =============================================================================

export type LobbyToAdminMessage =
  | { type: "status"; players: PlayerInfo[]; phase: TournamentPhase; format?: TournamentFormat; currentPhase?: BracketPhase | RoundRobinPhase; matchesInProgress: number; matchesComplete: number }
  | { type: "event"; message: string; timestamp: string }
  | { type: "error"; message: string };

// =============================================================================
// Internal: LobbyDO ↔ MatchDO communication (via fetch, not WebSocket)
// =============================================================================

export interface MatchConfig {
  matchId: string;
  tournamentId: string;
  phase: BracketPhase | RoundRobinPhase;
  playerIds: string[];
  playerNames: Record<string, string>;
  totalGames: number;
  moveTimeoutMs: number;
  mode: "tournament" | "practice";
}

export interface MatchResultReport {
  matchId: string;
  summary: MatchSummary;
}
