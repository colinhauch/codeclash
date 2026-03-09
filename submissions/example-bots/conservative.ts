/**
 * Conservative Bot - Risk-averse strategy
 *
 * Stands as soon as it has a reasonable total.
 * Never risks busting if total >= 5.
 */

import type { Bot, VisibleGameState, BotContext, Move } from "../../src/game/types";
import { helpers } from "../../src/game/helpers";

export const name = "Cautious Carol";
export const author = "CodeClash";
export const description = "Stands at 5 or higher. Never risks a bust.";

const STAND_THRESHOLD = 5;

export const bot: Bot = (state: VisibleGameState, _ctx: BotContext): Move => {
  // If we have 5 or more, stand
  if (state.myTotal >= STAND_THRESHOLD) {
    return helpers.stand();
  }

  // Otherwise draw
  return helpers.draw();
};

export const chooseWildValue = (state: VisibleGameState): number => {
  return helpers.optimalWildValue(state.myTotal);
};
