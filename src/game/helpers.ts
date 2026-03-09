/**
 * CodeClash - Flip 7 Helper Functions
 *
 * These utilities are available for bot authors to use.
 * Import them in your bot: import { helpers } from "../src/game/helpers";
 */

import type {
  Card,
  VisibleGameState,
  BotContext,
  Move,
  MoveAction,
  NumberCard,
} from "./types";

// =============================================================================
// Card Utilities
// =============================================================================

/**
 * Check if a card is a number card
 */
export function isNumberCard(card: Card): card is NumberCard {
  return card.type === "number";
}

/**
 * Check if a card is a modifier card
 */
export function isModifierCard(card: Card): boolean {
  return card.type === "modifier";
}

/**
 * Check if a card is an action card
 */
export function isActionCard(card: Card): boolean {
  return card.type === "action";
}

/**
 * Get the value of a card (0 for non-number cards)
 */
export function getCardValue(card: Card): number {
  return card.type === "number" ? card.value : 0;
}

/**
 * Get card description for debugging
 */
export function cardToString(card: Card): string {
  if (card.type === "number") {
    return card.value.toString();
  } else if (card.type === "modifier") {
    return card.modifier;
  } else {
    return card.action.toUpperCase();
  }
}

/**
 * Count number cards with a specific value
 */
export function countNumberValue(value: number, cards: Card[]): number {
  return cards.filter((c) => c.type === "number" && c.value === value).length;
}

/**
 * Get unique number values in cards
 */
export function getUniqueNumberValues(cards: Card[]): number[] {
  const values = new Set<number>();
  for (const card of cards) {
    if (card.type === "number") {
      values.add(card.value);
    }
  }
  return Array.from(values).sort((a, b) => b - a);
}

/**
 * Calculate the sum of number cards
 */
export function calculateNumberTotal(cards: Card[]): number {
  return cards.reduce((sum, card) => {
    return sum + getCardValue(card);
  }, 0);
}

/**
 * Count number cards
 */
export function countNumberCards(cards: Card[]): number {
  return cards.filter(isNumberCard).length;
}

/**
 * Count modifier cards
 */
export function countModifierCards(cards: Card[]): number {
  return cards.filter(isModifierCard).length;
}

/**
 * Count action cards
 */
export function countActionCards(cards: Card[]): number {
  return cards.filter(isActionCard).length;
}

// =============================================================================
// State Analysis
// =============================================================================

/**
 * Analyze current state and return statistics
 */
export function analyzeState(
  state: VisibleGameState,
  _ctx: BotContext
): {
  myNumberCount: number;
  myUniqueNumbers: number;
  myModifierCount: number;
  myActionCardCount: number;
  opponentsStanding: number;
  opponentsBusted: number;
  opponentsActive: number;
  bestOpponentTotal: number | null;
  cardsUntilFlip7: number;
} {
  const myNumberCount = countNumberCards(state.myCards);
  const myUniqueNumbers = getUniqueNumberValues(state.myCards).length;
  const myModifierCount = countModifierCards(state.myCards);
  const myActionCardCount = countActionCards(state.myCards);

  const opponentsStanding = state.opponents.filter((o) => o.stood).length;
  const opponentsBusted = state.opponents.filter((o) => o.busted).length;
  const opponentsActive = state.opponents.filter(
    (o) => !o.stood && !o.busted
  ).length;

  const revealedTotals = state.opponents
    .filter((o) => o.numberTotal !== null)
    .map((o) => o.numberTotal as number);
  const bestOpponentTotal =
    revealedTotals.length > 0 ? Math.max(...revealedTotals) : null;

  const cardsUntilFlip7 = 7 - myUniqueNumbers;

  return {
    myNumberCount,
    myUniqueNumbers,
    myModifierCount,
    myActionCardCount,
    opponentsStanding,
    opponentsBusted,
    opponentsActive,
    bestOpponentTotal,
    cardsUntilFlip7,
  };
}

/**
 * Estimate win probability based on current state
 * (Very rough heuristic)
 */
export function estimateWinProbability(
  myTotal: number,
  opponentTotals: (number | null)[]
): number {
  const knownOpponentTotals = opponentTotals.filter(
    (t) => t !== null
  ) as number[];

  if (knownOpponentTotals.length === 0) {
    // No info about opponents
    return 0.5;
  }

  const beat = knownOpponentTotals.filter((t) => myTotal > t).length;
  return beat / knownOpponentTotals.length;
}

// =============================================================================
// Move Construction
// =============================================================================

/**
 * Create a "draw" move
 */
export function draw(): Move {
  return { action: "draw" };
}

/**
 * Create a "stand" move
 */
export function stand(): Move {
  return { action: "stand" };
}

/**
 * Pick a random legal move
 */
export function randomMove(legalMoves: MoveAction[]): Move {
  const action = legalMoves[Math.floor(Math.random() * legalMoves.length)];
  return { action };
}

// =============================================================================
// Export all helpers as a namespace
// =============================================================================

export const helpers = {
  // Card utilities
  isNumberCard,
  isModifierCard,
  isActionCard,
  getCardValue,
  cardToString,
  countNumberValue,
  getUniqueNumberValues,
  calculateNumberTotal,
  countNumberCards,
  countModifierCards,
  countActionCards,

  // State analysis
  analyzeState,
  estimateWinProbability,

  // Move construction
  draw,
  stand,
  randomMove,
};
