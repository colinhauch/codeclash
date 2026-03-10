/**
 * Aggressive Bot - Goes for the Flip 7 bonus
 */

import type { BotInfo, GameState } from "../src/game/types";
import { helpers } from "../src/game/helpers";

const bot: BotInfo = {
  id: "aggressive",
  name: "Aggressive",
  author: "CodeClash",
  description: "Aggressive strategy - pushes for Flip 7 bonus",
  bot: (state: GameState, myId: string) => {
    const me = state.players.find((p) => p.id === myId)!;
    const uniqueNumbers = helpers.getUniqueNumberValues(me.numberCards).length;

    // If we have 6 unique numbers, keep drawing for Flip 7
    if (uniqueNumbers === 6 && state.deck.length > 0) {
      return helpers.draw();
    }

    // If we have 5+ unique cards and a decent total, stand
    if (uniqueNumbers >= 5 && me.roundScore >= 40) {
      return helpers.stand();
    }

    // Otherwise, keep drawing to accumulate cards
    if (state.deck.length > 0) {
      return helpers.draw();
    }

    return helpers.stand();
  },
};

export default bot;
