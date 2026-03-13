/**
 * Random Bot - Makes random legal moves
 */

import type { BotInfo, GameState, Move } from "../src/game/types";
import { helpers } from "../src/game/helpers";

const bot: BotInfo = {
  id: "random",
  name: "Random",
  author: "CodeClash",
  description: "Makes random legal moves",
  bot: (_state: GameState, _myId: string): Move => {
    return helpers.randomMove(["draw", "stand"]);
  },
};

export default bot;
