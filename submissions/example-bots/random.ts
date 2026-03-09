/**
 * Random Bot - Baseline opponent
 *
 * Makes random legal moves. Useful for testing and as a baseline.
 */

import type { Bot, VisibleGameState, BotContext, Move } from "../../src/game/types";
import { helpers } from "../../src/game/helpers";

export const name = "Random Randy";
export const author = "CodeClash";
export const description = "Picks random legal moves. The ultimate baseline.";

export const bot: Bot = (_state: VisibleGameState, ctx: BotContext): Move => {
  return helpers.randomMove(ctx.legalMoves);
};

export const chooseWildValue = (state: VisibleGameState): number => {
  // Even random bot plays wild cards optimally
  return helpers.optimalWildValue(state.myTotal);
};
