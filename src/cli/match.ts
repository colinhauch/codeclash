/**
 * CodeClash - Single Match Runner
 *
 * Executes a single game between two bots
 */

import type { BotInfo, GameResult, MoveHistoryEntry } from "../game/types";
import {
  createInitialState,
  createInitialStateSeeded,
  getVisibleState,
  getBotContext,
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

    // Get visible state and context
    const visibleState = getVisibleState(state, currentPlayer.id);
    const botContext = getBotContext(state, currentPlayer.id);

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
        () => bot(visibleState, botContext),
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
    state = applyMove(state, move);
    const newTotal = currentPlayer.numberTotal;

    moveHistory.push({
      playerId: currentPlayer.id,
      action: move.action,
      numberTotal: newTotal,
      busted: currentPlayer.busted,
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
