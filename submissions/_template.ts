/**
 * CodeClash Bot Submission Template
 *
 * Copy this file to submissions/your-bot-name.ts and implement your strategy!
 *
 * Your bot receives:
 * - state: The visible game state (your cards, opponents' status, revealed cards)
 * - ctx: Additional context (legal moves, move history, your ID)
 *
 * Your bot must return:
 * - A Move object with action: "draw" or "stand"
 */

import type { BotInfo, VisibleGameState, BotContext, Move } from "../src/game/types";
import { helpers } from "../src/game/helpers";

// =============================================================================
// Bot Export (required)
// =============================================================================

/**
 * Export your bot as the default export
 */
const bot: BotInfo = {
  id: "my-bot", // Must be lowercase, no spaces
  name: "My Awesome Bot",
  author: "Your Name",
  description: "Describe your strategy here",
  bot: (state: VisibleGameState, ctx: BotContext): Move => {
    // Analyze the current state
    const analysis = helpers.analyzeState(state, ctx);

    // Your strategy goes here
    // For example: draw if we're winning and have few unique cards
    if (
      analysis.myUniqueNumbers < 5 &&
      analysis.bestOpponentTotal !== null &&
      state.myNumberTotal > analysis.bestOpponentTotal
    ) {
      return helpers.draw();
    }

    // Stand if we're confident
    return helpers.stand();
  },
};

export default bot;
