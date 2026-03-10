/**
 * CodeClash - Single Match Runner
 *
 * Executes a single game between two bots
 */

import type {
  BotInfo,
  GameResult,
  MoveHistoryEntry,
  MultiplayerGameResult,
  PlayerPlacement,
} from "../game/types";
import {
  createInitialState,
  createInitialStateSeeded,
  getLegalMoves,
  applyMove,
  isRoundOver,
  endRound,
  isGameOver,
  getWinner,
  calculateFinalScores,
} from "../game/engine";

export interface MatchConfig {
  moveTimeoutMs: number;
  seed?: number;
}

/**
 * Run a single match between two bots
 */
export async function runMatch(
  bot1: BotInfo,
  bot2: BotInfo,
  config: MatchConfig
): Promise<GameResult> {
  const playerIds = [bot1.id, bot2.id];

  // Create initial state
  const initialState = config.seed
    ? createInitialStateSeeded(playerIds, config.seed)
    : createInitialState(playerIds);

  let state = initialState;
  const moveHistory: MoveHistoryEntry[] = [];
  let gameId = `${bot1.id}-vs-${bot2.id}-${Date.now()}`;

  // Game loop
  while (!isGameOver(state)) {
    // Check if round is over
    if (isRoundOver(state)) {
      state = endRound(state);
      if (isGameOver(state)) break;
      continue;
    }

    // Get current player and bot
    const currentPlayer = state.players[state.currentPlayerIndex];
    const bot =
      currentPlayer.id === bot1.id
        ? bot1.bot
        : bot2.bot;

    // Get legal moves
    const legalMoves = getLegalMoves(state);
    if (legalMoves.length === 0) {
      // No legal moves, advance turn
      state.currentPlayerIndex =
        (state.currentPlayerIndex + 1) % state.players.length;
      continue;
    }

    // Call bot with timeout
    let move;
    try {
      move = await executeWithTimeout(
        () => bot(state, currentPlayer.id),
        config.moveTimeoutMs,
        { action: "stand" as const }
      );

      // Validate move
      if (!legalMoves.includes(move.action)) {
        move = { action: "stand" as const };
      }
    } catch (e) {
      // Bot threw error, default to stand
      move = { action: "stand" as const };
    }

    // Apply move and record
    const prevDeckLength = state.deck.length;
    state = applyMove(state, move);
    const updatedPlayer = state.players.find((p) => p.id === currentPlayer.id)!;
    const cardDrawn = move.action === "draw" && state.deck.length < prevDeckLength
      ? state.revealedCards[state.revealedCards.length - 1]
      : undefined;

    moveHistory.push({
      playerId: currentPlayer.id,
      action: move.action,
      cardDrawn,
      roundScore: updatedPlayer.roundScore,
      isActive: updatedPlayer.isActive,
    });
  }

  // Get final scores
  const finalScores = calculateFinalScores(state);
  const winner = getWinner(state);

  return {
    id: gameId,
    winner,
    moves: moveHistory,
    finalScores,
    rounds: state.round,
  };
}

/**
 * Run a single multiplayer game with N bots
 */
export async function runMultiplayerMatch(
  bots: BotInfo[],
  config: MatchConfig
): Promise<MultiplayerGameResult> {
  const playerIds = bots.map((b) => b.id);
  const botMap = new Map(bots.map((b) => [b.id, b.bot]));

  const initialState = config.seed
    ? createInitialStateSeeded(playerIds, config.seed)
    : createInitialState(playerIds);

  let state = initialState;
  const moveHistory: MoveHistoryEntry[] = [];
  const gameId = `grandprix-${Date.now()}`;

  while (!isGameOver(state)) {
    if (isRoundOver(state)) {
      state = endRound(state);
      if (isGameOver(state)) break;
      continue;
    }

    const currentPlayer = state.players[state.currentPlayerIndex];
    const botFn = botMap.get(currentPlayer.id)!;

    const legalMoves = getLegalMoves(state);
    if (legalMoves.length === 0) {
      state.currentPlayerIndex =
        (state.currentPlayerIndex + 1) % state.players.length;
      continue;
    }

    let move;
    try {
      move = await executeWithTimeout(
        () => botFn(state, currentPlayer.id),
        config.moveTimeoutMs,
        { action: "stand" as const }
      );

      if (!legalMoves.includes(move.action)) {
        move = { action: "stand" as const };
      }
    } catch (e) {
      move = { action: "stand" as const };
    }

    const prevDeckLength = state.deck.length;
    state = applyMove(state, move);
    const updatedPlayer = state.players.find((p) => p.id === currentPlayer.id)!;
    const cardDrawn = move.action === "draw" && state.deck.length < prevDeckLength
      ? state.revealedCards[state.revealedCards.length - 1]
      : undefined;

    moveHistory.push({
      playerId: currentPlayer.id,
      action: move.action,
      cardDrawn,
      roundScore: updatedPlayer.roundScore,
      isActive: updatedPlayer.isActive,
    });
  }

  const finalScores = calculateFinalScores(state);
  const placements = calculatePlacements(bots.length, finalScores);

  return {
    id: gameId,
    placements,
    moves: moveHistory,
    finalScores,
    rounds: state.round,
  };
}

/**
 * Calculate placements from final scores with linear points (N for 1st, N-1 for 2nd, etc.)
 */
function calculatePlacements(
  playerCount: number,
  finalScores: Record<string, number>
): PlayerPlacement[] {
  const sorted = Object.entries(finalScores)
    .map(([botId, score]) => ({ botId, score }))
    .sort((a, b) => b.score - a.score);

  const placements: PlayerPlacement[] = [];
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].score < sorted[i - 1].score) {
      currentRank = i + 1;
    }
    placements.push({
      botId: sorted[i].botId,
      rank: currentRank,
      score: sorted[i].score,
      points: Math.max(0, playerCount + 1 - currentRank),
    });
  }

  return placements;
}

/**
 * Execute a function with timeout
 */
async function executeWithTimeout<T>(
  fn: () => T,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  return Promise.race([
    Promise.resolve(fn()),
    new Promise<T>((resolve) =>
      setTimeout(() => resolve(fallback), timeoutMs)
    ),
  ]);
}
