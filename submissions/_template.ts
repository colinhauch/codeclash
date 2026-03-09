/**
 * CodeClash Bot Submission Template
 *
 * Copy this file to submissions/your-bot-name.ts and implement your strategy!
 *
 * Your bot receives:
 * - state: The visible game state (your hand, opponents' status, revealed cards)
 * - ctx: Additional context (legal moves, move history, your ID)
 *
 * Your bot must return:
 * - A Move object with action: "draw" or "stand"
 * - If you draw a wild card, the engine will call your bot again to choose the value
 */

import type { Bot, VisibleGameState, BotContext, Move } from "../src/game/types";
import { helpers } from "../src/game/helpers";

// =============================================================================
// Bot Metadata (required)
// =============================================================================

/** Your bot's display name */
export const name = "My Awesome Bot";

/** Your name */
export const author = "Your Name";

/** Brief description of your strategy (optional but encouraged) */
export const description = "Describe your strategy here";

// =============================================================================
// Bot Implementation (required)
// =============================================================================

export const bot: Bot = (state: VisibleGameState, ctx: BotContext): Move => {
  // Example: Analyze the current state
  const analysis = helpers.analyzeState(state, ctx);

  // Example: Simple strategy - draw if bust probability is low
  if (analysis.bustProb < 0.4) {
    return helpers.draw();
  }

  // Otherwise stand
  return helpers.stand();
};

// =============================================================================
// Wild Card Handler (optional)
// =============================================================================

/**
 * Called when you draw a wild card.
 * Return the value you want to assign (1-7).
 * If not provided, the engine uses helpers.optimalWildValue()
 */
export const chooseWildValue = (
  state: VisibleGameState,
  _ctx: BotContext
): number => {
  // Default: get as close to 7 as possible
  return helpers.optimalWildValue(state.myTotal);
};
