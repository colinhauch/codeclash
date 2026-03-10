/**
 * CodeClash Bot Submission Template
 *
 * Copy this file to submissions/your-bot-name.ts and implement your strategy!
 *
 * Your bot receives:
 * - state: The full game state (all players' cards, scores, deck size, etc.)
 * - myId: Your player ID — use it to find yourself in state.players
 *
 * Your bot must return:
 * - A Move object with action: "draw" or "stand"
 */

import type { BotInfo, GameState, Move } from "../src/game/types";
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
  bot: (state: GameState, myId: string): Move => {
    const me = state.players.find((p) => p.id === myId)!;
    const analysis = helpers.analyzeState(state, myId);

    // Your strategy goes here.
    // Example: draw if we have fewer than 5 unique numbers and we're ahead of opponents
    if (
      analysis.myUniqueNumbers < 5 &&
      analysis.bestOpponentRoundScore !== null &&
      me.roundScore > analysis.bestOpponentRoundScore
    ) {
      return helpers.draw();
    }

    // Stand if we're confident
    return helpers.stand();
  },
};

export default bot;
