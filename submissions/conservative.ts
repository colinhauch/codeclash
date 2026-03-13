/**
 * Conservative Bot - Plays it safe, stops early
 */

import type { BotInfo, GameState } from "../src/game/types";
import { helpers } from "../src/game/helpers";

const bot: BotInfo = {
  id: "conservative",
  name: "Conservative",
  author: "CodeClash",
  description: "Conservative strategy - stands at 50 points or with 4+ unique cards",
  bot: (state: GameState, myId: string) => {
    const me = state.players.find((p) => p.id === myId)!;

    // Stand if we have a reasonable score
    if (me.roundScore >= 50) {
      return helpers.stand();
    }

    // Stand if we have 4+ unique number cards (safer threshold)
    const uniqueNumbers = helpers.getUniqueNumberValues(me.numberCards).length;
    if (uniqueNumbers >= 4) {
      return helpers.stand();
    }

    // Otherwise draw
    return helpers.draw();
  },
};

export default bot;
