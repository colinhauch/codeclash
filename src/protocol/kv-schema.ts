/**
 * CodeClash - KV Key Schema & Helpers
 *
 * Defines the KV key naming conventions and typed read/write helpers.
 */

import type { MatchSummary, TournamentFormat } from "./messages";

// =============================================================================
// KV Key Builders
// =============================================================================

export const kvKeys = {
  /** Tournament metadata: config, status, timestamps */
  tournamentMeta: (id: string) => `tournament:${id}:meta`,

  /** Current overall standings */
  tournamentStandings: (id: string) => `tournament:${id}:standings`,

  /** All match summaries for a given phase */
  phaseResults: (tournamentId: string, phase: number) =>
    `tournament:${tournamentId}:phase:${phase}:results`,

  /** Single match summary */
  matchSummary: (tournamentId: string, phase: number, matchId: string) =>
    `tournament:${tournamentId}:phase:${phase}:match:${matchId}`,

  /** Practice match metadata */
  practiceMeta: (matchId: string) => `practice:${matchId}:meta`,

  /** Practice match full game log */
  practiceLog: (matchId: string) => `practice:${matchId}:log`,

  /** Pointer to the current active tournament */
  currentTournament: () => "current-tournament",
};

// =============================================================================
// KV Value Types
// =============================================================================

export interface TournamentMeta {
  id: string;
  format: TournamentFormat;
  status: "waiting" | "running" | "complete";
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  gamesPerMatch: number;
  moveTimeoutMs: number;
  totalPhases: number;
  currentPhase: number;
  playerCount: number;
}

export interface PhaseResults {
  phase: number;
  matches: MatchSummary[];
  completedAt: string;
}

export interface PracticeMeta {
  matchId: string;
  players: { id: string; name: string }[];
  timestamp: string;
  gamesPlayed: number;
}

// =============================================================================
// KV Helpers
// =============================================================================

export async function kvGet<T>(kv: KVNamespace, key: string): Promise<T | null> {
  const value = await kv.get(key);
  if (value === null) return null;
  return JSON.parse(value) as T;
}

export async function kvPut<T>(kv: KVNamespace, key: string, value: T): Promise<void> {
  await kv.put(key, JSON.stringify(value));
}
