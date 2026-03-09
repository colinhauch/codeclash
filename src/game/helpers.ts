/**
 * CodeClash - Flip 7 Helper Functions
 *
 * These utilities are available for bot authors to use.
 * Import them in your bot: import { helpers } from "../src/game/helpers";
 */

import type {
  Card,
  Suit,
  VisibleGameState,
  BotContext,
  Move,
  MoveAction,
} from "./types";

// =============================================================================
// Card Utilities
// =============================================================================

/** All suits in the deck */
export const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];

/** Standard deck composition: 4 of each value 1-6, plus 4 wild (0) cards = 28 cards */
export const DECK_SIZE = 28;
export const CARDS_PER_VALUE = 4;
export const MAX_VALUE = 6;
export const WILD_VALUE = 0;
export const TARGET = 7;

/**
 * Check if a card is a wild card.
 */
export function isWild(card: Card): boolean {
  return card.value === WILD_VALUE;
}

/**
 * Count how many of a specific value remain in the deck.
 * @param value The card value to count (0-6)
 * @param revealedCards Cards already revealed
 */
export function countRemaining(value: number, revealedCards: Card[]): number {
  const revealed = revealedCards.filter((c) => c.value === value).length;
  return CARDS_PER_VALUE - revealed;
}

/**
 * Calculate the probability of drawing a specific value.
 * @param value The card value (0-6)
 * @param revealedCards Cards already revealed
 * @param cardsRemaining Total cards remaining in deck
 */
export function probabilityOfValue(
  value: number,
  revealedCards: Card[],
  cardsRemaining: number
): number {
  if (cardsRemaining === 0) return 0;
  const remaining = countRemaining(value, revealedCards);
  return remaining / cardsRemaining;
}

/**
 * Calculate the probability of busting if you draw.
 * @param currentTotal Your current total
 * @param revealedCards Cards already revealed
 * @param cardsRemaining Total cards remaining in deck
 */
export function probabilityOfBust(
  currentTotal: number,
  revealedCards: Card[],
  cardsRemaining: number
): number {
  if (cardsRemaining === 0) return 0;

  // Calculate how many cards would cause a bust
  const bustThreshold = TARGET - currentTotal; // Values > this cause bust
  let bustCards = 0;

  for (let value = bustThreshold + 1; value <= MAX_VALUE; value++) {
    bustCards += countRemaining(value, revealedCards);
  }

  // Wild cards never cause bust (you can choose their value)
  return bustCards / cardsRemaining;
}

/**
 * Calculate the probability of hitting exactly 7.
 * @param currentTotal Your current total
 * @param revealedCards Cards already revealed
 * @param cardsRemaining Total cards remaining in deck
 */
export function probabilityOfSeven(
  currentTotal: number,
  revealedCards: Card[],
  cardsRemaining: number
): number {
  if (cardsRemaining === 0) return 0;

  const needed = TARGET - currentTotal;

  if (needed < 0) return 0; // Already busted
  if (needed === 0) return 0; // Already at 7
  if (needed > MAX_VALUE) {
    // Only wild cards can help (by choosing value = needed, but max is 7)
    return needed <= 7 ? probabilityOfValue(WILD_VALUE, revealedCards, cardsRemaining) : 0;
  }

  // Either the exact value we need, or a wild card
  const exactProb = probabilityOfValue(needed, revealedCards, cardsRemaining);
  const wildProb = probabilityOfValue(WILD_VALUE, revealedCards, cardsRemaining);

  return exactProb + wildProb;
}

/**
 * Calculate expected value of drawing.
 * Returns the average total you'd have after drawing.
 * @param currentTotal Your current total
 * @param revealedCards Cards already revealed
 * @param cardsRemaining Total cards remaining in deck
 */
export function expectedValueOfDraw(
  currentTotal: number,
  revealedCards: Card[],
  cardsRemaining: number
): number {
  if (cardsRemaining === 0) return currentTotal;

  let expectedTotal = 0;

  for (let value = 1; value <= MAX_VALUE; value++) {
    const prob = probabilityOfValue(value, revealedCards, cardsRemaining);
    const newTotal = currentTotal + value;
    // If bust, contribute 0 to expected value
    expectedTotal += prob * (newTotal > TARGET ? 0 : newTotal);
  }

  // Wild cards: optimal play is to get to 7 if possible, otherwise as close as possible
  const wildProb = probabilityOfValue(WILD_VALUE, revealedCards, cardsRemaining);
  const optimalWildValue = Math.min(TARGET - currentTotal, TARGET);
  const wildTotal = optimalWildValue > 0 ? currentTotal + optimalWildValue : currentTotal;
  expectedTotal += wildProb * (wildTotal > TARGET ? 0 : wildTotal);

  return expectedTotal;
}

// =============================================================================
// Decision Helpers
// =============================================================================

/**
 * Determine the optimal value to assign to a wild card.
 * @param currentTotal Your current total before the wild
 */
export function optimalWildValue(currentTotal: number): number {
  const needed = TARGET - currentTotal;
  if (needed <= 0) return 1; // Already at or over 7, minimize damage
  if (needed > 7) return 7; // Can't reach 7, get as close as possible
  return needed; // Reach exactly 7
}

/**
 * Simple heuristic: should I draw based on bust probability?
 * @param bustProbability Probability of busting if you draw
 * @param threshold Maximum acceptable bust probability (default 0.5)
 */
export function shouldDraw(bustProbability: number, threshold = 0.5): boolean {
  return bustProbability < threshold;
}

/**
 * Analyze the current game state and return useful statistics.
 */
export function analyzeState(
  state: VisibleGameState,
  ctx: BotContext
): {
  bustProb: number;
  sevenProb: number;
  expectedValue: number;
  opponentsStanding: number;
  opponentsBusted: number;
  opponentsActive: number;
  bestOpponentTotal: number | null;
} {
  const bustProb = probabilityOfBust(
    state.myTotal,
    state.revealedCards,
    state.cardsRemaining
  );
  const sevenProb = probabilityOfSeven(
    state.myTotal,
    state.revealedCards,
    state.cardsRemaining
  );
  const expectedValue = expectedValueOfDraw(
    state.myTotal,
    state.revealedCards,
    state.cardsRemaining
  );

  const opponentsStanding = state.opponents.filter((o) => o.stood).length;
  const opponentsBusted = state.opponents.filter((o) => o.busted).length;
  const opponentsActive = state.opponents.filter(
    (o) => !o.stood && !o.busted
  ).length;

  // Best known opponent total (only visible if they've stood)
  const revealedTotals = state.opponents
    .filter((o) => o.revealedTotal !== null)
    .map((o) => o.revealedTotal as number);
  const bestOpponentTotal =
    revealedTotals.length > 0 ? Math.max(...revealedTotals) : null;

  return {
    bustProb,
    sevenProb,
    expectedValue,
    opponentsStanding,
    opponentsBusted,
    opponentsActive,
    bestOpponentTotal,
  };
}

// =============================================================================
// Move Construction
// =============================================================================

/**
 * Create a "draw" move.
 */
export function draw(): Move {
  return { action: "draw" };
}

/**
 * Create a "stand" move.
 */
export function stand(): Move {
  return { action: "stand" };
}

/**
 * Create a move to draw and assign a wild card value.
 * Note: This is only relevant after drawing; the engine will prompt for wild value.
 */
export function drawWithWild(wildValue: number): Move {
  return { action: "draw", wildValue: Math.max(1, Math.min(7, wildValue)) };
}

/**
 * Pick a random legal move.
 */
export function randomMove(legalMoves: MoveAction[]): Move {
  const action = legalMoves[Math.floor(Math.random() * legalMoves.length)];
  return { action };
}

// =============================================================================
// Export all helpers as a namespace
// =============================================================================

export const helpers = {
  // Constants
  SUITS,
  DECK_SIZE,
  CARDS_PER_VALUE,
  MAX_VALUE,
  WILD_VALUE,
  TARGET,

  // Card utilities
  isWild,
  countRemaining,
  probabilityOfValue,
  probabilityOfBust,
  probabilityOfSeven,
  expectedValueOfDraw,

  // Decision helpers
  optimalWildValue,
  shouldDraw,
  analyzeState,

  // Move construction
  draw,
  stand,
  drawWithWild,
  randomMove,
};
