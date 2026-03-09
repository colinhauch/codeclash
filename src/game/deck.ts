/**
 * CodeClash - Flip 7 Deck
 *
 * Creates and manages the 94-card deck for Flip 7
 */

import type { Card, NumberCard, ModifierCard, ActionCard } from "./types";

/**
 * Create the full Flip 7 deck (94 cards)
 *
 * Number cards: 12 twelves, 11 elevens, 10 tens... 2 twos, 1 one, 1 zero = 78 cards
 * Modifier cards: x2, +2, +4, +6, +8, +10 (some duplicates for balance)
 * Action cards: Freeze, Flip Three, Second Chance
 */
export function createDeck(): Card[] {
  const cards: Card[] = [];

  // Add number cards: value 12 down to 0
  for (let value = 12; value >= 0; value--) {
    const count = value === 0 ? 1 : value; // 0 appears once, 1 appears once, 2 appears twice, etc.
    for (let i = 0; i < count; i++) {
      const card: NumberCard = { type: "number", value };
      cards.push(card);
    }
  }

  // Add modifier cards (6 total)
  const modifiers: ModifierCard[] = [
    { type: "modifier", modifier: "x2" },
    { type: "modifier", modifier: "+2" },
    { type: "modifier", modifier: "+4" },
    { type: "modifier", modifier: "+6" },
    { type: "modifier", modifier: "+8" },
    { type: "modifier", modifier: "+10" },
  ];
  cards.push(...modifiers);

  // Add action cards (3 of each type = 9 total)
  const actions: ActionCard[] = [
    { type: "action", action: "freeze" },
    { type: "action", action: "freeze" },
    { type: "action", action: "freeze" },
    { type: "action", action: "flip-three" },
    { type: "action", action: "flip-three" },
    { type: "action", action: "flip-three" },
    { type: "action", action: "second-chance" },
    { type: "action", action: "second-chance" },
    { type: "action", action: "second-chance" },
  ];
  cards.push(...actions);

  return cards;
}

/**
 * Shuffle an array in place using Fisher-Yates
 */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Shuffle with a seeded random for reproducibility
 */
export function shuffleSeeded<T>(array: T[], seed: number): T[] {
  const arr = [...array];
  const rng = seededRandom(seed);

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

/**
 * Simple seeded random number generator (0 to 1)
 */
function seededRandom(seed: number): () => number {
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}
