/**
 * CodeClash - Flip 7 Helper Functions
 *
 * These utilities are available for bot authors to use.
 * Import them in your bot: import { helpers } from "../src/game/helpers";
 */

import type {
  Card,
  NumberCard,
  ModifierCard,
  GameState,
  Move,
  MoveAction,
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
export function isModifierCard(card: Card): card is ModifierCard {
  return card.type === "modifier";
}

/**
 * Check if a card is an action card
 */
export function isActionCard(card: Card): boolean {
  return card.type === "action";
}

/**
 * Get the value of a number card (0 for non-number cards)
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
 * Get unique number values in a number card array
 */
export function getUniqueNumberValues(cards: NumberCard[]): number[] {
  const values = new Set<number>(cards.map((c) => c.value));
  return Array.from(values).sort((a, b) => b - a);
}

/**
 * Calculate the sum of number cards
 */
export function calculateNumberTotal(cards: NumberCard[]): number {
  return cards.reduce((sum, card) => sum + card.value, 0);
}

// =============================================================================
// State Analysis
// =============================================================================

/**
 * Analyze current state from a specific player's perspective
 */
export function analyzeState(
  state: GameState,
  myId: string
): {
  myNumberCount: number;
  myUniqueNumbers: number;
  myModifierCount: number;
  opponentsActive: number;
  opponentsInactive: number;
  bestOpponentRoundScore: number | null;
  cardsUntilFlip7: number;
} {
  const me = state.players.find((p) => p.id === myId)!;

  const myNumberCount = me.numberCards.length;
  const myUniqueNumbers = getUniqueNumberValues(me.numberCards).length;
  const myModifierCount = me.modifierCards.length;

  const opponents = state.players.filter((p) => p.id !== myId);
  const opponentsActive = opponents.filter((o) => o.isActive).length;
  const opponentsInactive = opponents.filter((o) => !o.isActive).length;

  const inactiveOpponentScores = opponents
    .filter((o) => !o.isActive && o.roundScore > 0)
    .map((o) => o.roundScore);
  const bestOpponentRoundScore =
    inactiveOpponentScores.length > 0
      ? Math.max(...inactiveOpponentScores)
      : null;

  const cardsUntilFlip7 = 7 - myNumberCount;

  return {
    myNumberCount,
    myUniqueNumbers,
    myModifierCount,
    opponentsActive,
    opponentsInactive,
    bestOpponentRoundScore,
    cardsUntilFlip7,
  };
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
  getUniqueNumberValues,
  calculateNumberTotal,

  // State analysis
  analyzeState,

  // Move construction
  draw,
  stand,
  randomMove,
};
