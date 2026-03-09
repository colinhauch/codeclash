/**
 * Conservative Bot - Plays it safe, stops early
 */

import type { BotInfo, VisibleGameState, BotContext } from "../src/game/types";
import { helpers } from "../src/game/helpers";

const bot: BotInfo = {
  id: "conservative",
  name: "Conservative",
  author: "CodeClash",
  description: "Conservative strategy - stands at 50 points or with 5+ cards",
  bot: (state: VisibleGameState, ctx: BotContext) => {
    // Stand if we have a reasonable score
    if (state.myNumberTotal >= 50) {
      return helpers.stand();
    }

    // Stand if we have 4+ unique number cards (safer threshold)
    const uniqueNumbers = helpers.getUniqueNumberValues(state.myCards).length;
    if (uniqueNumbers >= 4) {
      return helpers.stand();
    }

    // Otherwise draw if we can
    if (ctx.legalMoves.includes("draw")) {
      return helpers.draw();
    }

    return helpers.stand();
  },
};

export default bot;
