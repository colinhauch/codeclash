/**
 * Random Bot - Makes random legal moves
 */

import type { BotInfo, VisibleGameState, BotContext, Move } from "../src/game/types";
import { helpers } from "../src/game/helpers";

const bot: BotInfo = {
  id: "random",
  name: "Random",
  author: "CodeClash",
  description: "Makes random legal moves",
  bot: (_state: VisibleGameState, ctx: BotContext): Move => {
    return helpers.randomMove(ctx.legalMoves);
  },
};

export default bot;
