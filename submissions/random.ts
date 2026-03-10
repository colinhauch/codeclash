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
    const legalMoves = _state.deck.length > 0 ? ["draw", "stand"] : ["stand"];
    return helpers.randomMove(legalMoves as ("draw" | "stand")[]);
  },
};

export default bot;
