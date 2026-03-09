/**
 * Aggressive Bot - Goes for the Flip 7 bonus
 */

import type { BotInfo, VisibleGameState, BotContext } from "../src/game/types";
import { helpers } from "../src/game/helpers";

const bot: BotInfo = {
  id: "aggressive",
  name: "Aggressive",
  author: "CodeClash",
  description: "Aggressive strategy - pushes for Flip 7 bonus",
  bot: (state: VisibleGameState, ctx: BotContext) => {
    const uniqueNumbers = helpers.getUniqueNumberValues(state.myCards).length;

    // If we have 6 unique numbers, keep drawing for Flip 7
    if (uniqueNumbers === 6) {
      if (ctx.legalMoves.includes("draw")) {
        return helpers.draw();
      }
      return helpers.stand();
    }

    // If we have 5+ unique cards and a decent total, stand
    if (uniqueNumbers >= 5 && state.myNumberTotal >= 40) {
      return helpers.stand();
    }

    // Otherwise, keep drawing to accumulate cards
    if (ctx.legalMoves.includes("draw")) {
      return helpers.draw();
    }

    return helpers.stand();
  },
};

export default bot;
