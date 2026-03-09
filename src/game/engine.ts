/**
 * CodeClash - Flip 7 Game Engine
 *
 * Implements the game state machine for Flip 7
 */

import type {
  GameState,
  PlayerState,
  Move,
  VisibleGameState,
  BotContext,
} from "./types";
import { createDeck, shuffle, shuffleSeeded } from "./deck";

const WINNING_SCORE = 200;
const FLIP_7_BONUS = 15;

// =============================================================================
// State Creation
// =============================================================================

/**
 * Create initial game state for a set of players
 */
export function createInitialState(playerIds: string[]): GameState {
  const players: PlayerState[] = playerIds.map((id) => ({
    id,
    cards: [],
    numberTotal: 0,
    busted: false,
    stood: false,
    totalScore: 0,
    actionCards: [],
    flipThreeActive: false,
    flipThreeRemaining: 0,
    numberValues: new Set(),
  }));

  const deck = shuffle(createDeck());

  return {
    players,
    deck,
    revealedCards: [],
    currentPlayerIndex: 0,
    round: 1,
    roundOver: false,
    gameOver: false,
    winner: null,
  };
}

/**
 * Create initial state with seeded randomness
 */
export function createInitialStateSeeded(
  playerIds: string[],
  seed: number
): GameState {
  const players: PlayerState[] = playerIds.map((id) => ({
    id,
    cards: [],
    numberTotal: 0,
    busted: false,
    stood: false,
    totalScore: 0,
    actionCards: [],
    flipThreeActive: false,
    flipThreeRemaining: 0,
    numberValues: new Set(),
  }));

  const deck = shuffleSeeded(createDeck(), seed);

  return {
    players,
    deck,
    revealedCards: [],
    currentPlayerIndex: 0,
    round: 1,
    roundOver: false,
    gameOver: false,
    winner: null,
  };
}

// =============================================================================
// State Visibility
// =============================================================================

/**
 * Get the visible game state for a specific player
 */
export function getVisibleState(
  state: GameState,
  playerId: string
): VisibleGameState {
  const player = state.players.find((p) => p.id === playerId)!;
  const opponents = state.players
    .filter((p) => p.id !== playerId)
    .map((opp) => ({
      id: opp.id,
      cardCount: opp.cards.length,
      numberTotal: opp.stood || opp.busted ? opp.numberTotal : null,
      busted: opp.busted,
      stood: opp.stood,
      score: opp.totalScore,
      actionCardCount: opp.actionCards.length,
    }));

  return {
    myCards: player.cards,
    myNumberTotal: player.numberTotal,
    myBusted: player.busted,
    myStood: player.stood,
    myScore: player.totalScore,
    opponents,
    revealedCards: state.revealedCards,
    round: state.round,
    cardsRemaining: state.deck.length,
  };
}

/**
 * Get bot context for current player
 */
export function getBotContext(state: GameState, _playerId: string): BotContext {
  const legalMoves = getLegalMoves(state);

  const moveHistory = state.revealedCards.map((card) => {
    // Reconstruct from revealed cards - this is approximate, would need proper history tracking
    return {
      playerId: "", // Would need to track in state
      action: "draw" as const,
      cardDrawn: card,
      numberTotal: 0,
      busted: false,
    };
  });

  return {
    myId: _playerId,
    legalMoves,
    moveHistory,
  };
}

// =============================================================================
// Move Validation & Legal Moves
// =============================================================================

/**
 * Get legal moves for current player
 */
export function getLegalMoves(state: GameState): Array<"draw" | "stand"> {
  const player = state.players[state.currentPlayerIndex];

  if (player.busted || player.stood) {
    return [];
  }

  const moves: Array<"draw" | "stand"> = [];

  // Can always stand (unless this is their first card dealing, but that's handled in setup)
  moves.push("stand");

  // Can draw if there are cards remaining
  if (state.deck.length > 0) {
    moves.push("draw");
  }

  return moves;
}

/**
 * Check if a move is legal
 */
export function isMoveLegal(state: GameState, move: Move): boolean {
  const legal = getLegalMoves(state);
  return legal.includes(move.action);
}

// =============================================================================
// Move Application
// =============================================================================

/**
 * Apply a move and return new state
 */
export function applyMove(state: GameState, move: Move): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[newState.currentPlayerIndex];

  if (move.action === "stand") {
    player.stood = true;
  } else if (move.action === "draw") {
    // Player chose to draw
    // Draw from deck
    if (newState.deck.length === 0) {
      // No cards left - shouldn't happen with legal move check
      return newState;
    }

    const card = newState.deck.pop()!;
    newState.revealedCards.push(card);

    // Add card to player's line
    player.cards.push(card);

    // Handle different card types
    if (card.type === "number") {
      // Check for duplicate
      if (player.numberValues.has(card.value)) {
        player.busted = true;
      } else {
        player.numberValues.add(card.value);
        player.numberTotal += card.value;
      }
    } else if (card.type === "modifier") {
      // Modifiers don't affect busting
    } else if (card.type === "action") {
      // Action cards need to be resolved
      // For now, just add to the player's action cards
      player.actionCards.push(card);
    }

    // Check for Flip 7
    if (!player.busted && player.numberValues.size === 7) {
      player.stood = true;
      newState.roundOver = true;
    }

    // Check for Flip Three
    if (player.flipThreeActive) {
      player.flipThreeRemaining--;
      if (player.flipThreeRemaining === 0 || player.busted || player.numberValues.size === 7) {
        player.flipThreeActive = false;
      }
    }
  }

  // Advance to next player
  advanceToNextPlayer(newState);

  // Check if round is over
  if (isRoundOver(newState)) {
    newState.roundOver = true;
  }

  return newState;
}

/**
 * Advance to next active player
 */
function advanceToNextPlayer(state: GameState): void {
  const startIndex = state.currentPlayerIndex;
  let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;

  // Find next player who hasn't busted or stood
  while (nextIndex !== startIndex) {
    const player = state.players[nextIndex];
    if (!player.busted && !player.stood) {
      state.currentPlayerIndex = nextIndex;
      return;
    }
    nextIndex = (nextIndex + 1) % state.players.length;
  }

  // All other players are done
  state.roundOver = true;
}

// =============================================================================
// Round & Game Over Detection
// =============================================================================

/**
 * Check if round is over
 */
export function isRoundOver(state: GameState): boolean {
  // Someone hit Flip 7
  const flip7 = state.players.some(
    (p) => p.numberValues.size === 7 && !p.busted
  );
  if (flip7) return true;

  // All players have either busted or stood
  const allDone = state.players.every((p) => p.busted || p.stood);
  return allDone;
}

/**
 * Calculate final scores for the round and update total scores
 */
function scoreRound(state: GameState): void {
  const scores: Record<string, number> = {};

  for (const player of state.players) {
    if (player.busted) {
      scores[player.id] = 0;
    } else {
      // Start with number total
      let score = player.numberTotal;

      // Apply modifiers
      for (const card of player.cards) {
        if (card.type === "modifier") {
          if (card.modifier === "x2") {
            score *= 2;
          } else {
            const bonus = parseInt(card.modifier.slice(1));
            score += bonus;
          }
        }
      }

      // Add Flip 7 bonus if applicable
      if (player.numberValues.size === 7) {
        score += FLIP_7_BONUS;
      }

      scores[player.id] = score;
    }

    player.totalScore += scores[player.id];
  }
}

/**
 * Check if game is over (someone reached 200 points)
 */
export function isGameOver(state: GameState): boolean {
  return state.players.some((p) => p.totalScore >= WINNING_SCORE);
}

/**
 * Get the winner if game is over
 */
export function getWinner(state: GameState): string | null {
  if (!isGameOver(state)) return null;

  const maxScore = Math.max(...state.players.map((p) => p.totalScore));
  const winner = state.players.find((p) => p.totalScore === maxScore);

  // Tie handling: return null for ties, or just first if we want to break ties
  const tieCount = state.players.filter((p) => p.totalScore === maxScore)
    .length;
  return tieCount === 1 && winner ? winner.id : null;
}

/**
 * Calculate final scores across all players
 */
export function calculateFinalScores(
  state: GameState
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const player of state.players) {
    scores[player.id] = player.totalScore;
  }
  return scores;
}

// =============================================================================
// Round Management
// =============================================================================

/**
 * End the current round and prepare for next
 */
export function endRound(state: GameState): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;

  // Score the round
  scoreRound(newState);

  // Check if game is over
  if (isGameOver(newState)) {
    newState.gameOver = true;
    newState.winner = getWinner(newState) || null;
    return newState;
  }

  // Reset for next round
  newState.round++;
  newState.roundOver = false;

  // Clear cards from players
  for (const player of newState.players) {
    player.cards = [];
    player.numberTotal = 0;
    player.busted = false;
    player.stood = false;
    player.actionCards = [];
    player.flipThreeActive = false;
    player.flipThreeRemaining = 0;
    player.numberValues = new Set();
  }

  // Reset deck
  newState.deck = shuffle(createDeck());
  newState.revealedCards = [];

  // Move to next dealer (handled by caller)
  return newState;
}
