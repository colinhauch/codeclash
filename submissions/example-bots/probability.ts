/**
 * Probability Bot - Uses math to make decisions
 *
 * Calculates bust probability and draws while it's favorable.
 * Demonstrates using the helper functions.
 */

import type { Bot, VisibleGameState, BotContext, Move } from "../../src/game/types";
import { helpers } from "../../src/game/helpers";

export const name = "Probability Pete";
export const author = "CodeClash";
export const description = "Calculates bust probability and plays the odds.";

// Maximum acceptable bust probability
const BUST_THRESHOLD = 0.35;

// If we can hit 7 with this probability, always draw
const SEVEN_THRESHOLD = 0.15;

export const bot: Bot = (state: VisibleGameState, ctx: BotContext): Move => {
  const analysis = helpers.analyzeState(state, ctx);

  // Already at 7? Stand!
  if (state.myTotal === helpers.TARGET) {
    return helpers.stand();
  }

  // High chance of hitting 7? Go for it!
  if (analysis.sevenProb >= SEVEN_THRESHOLD) {
    return helpers.draw();
  }

  // If an opponent has stood with a higher total, we need to take risks
  if (
    analysis.bestOpponentTotal !== null &&
    analysis.bestOpponentTotal > state.myTotal
  ) {
    // More aggressive when behind
    const aggressiveThreshold = BUST_THRESHOLD + 0.15;
    if (analysis.bustProb < aggressiveThreshold) {
      return helpers.draw();
    }
  }

  // Normal play: draw if bust probability is acceptable
  if (analysis.bustProb < BUST_THRESHOLD) {
    return helpers.draw();
  }

  // Too risky, stand
  return helpers.stand();
};

export const chooseWildValue = (state: VisibleGameState): number => {
  return helpers.optimalWildValue(state.myTotal);
};
