/**
 * CodeClash - Game State Visibility
 *
 * Strips hidden information (deck contents) from GameState
 * before sending to players over WebSocket.
 */

import type { GameState } from "./types";
import type { VisibleGameState, VisiblePlayerState } from "../protocol/messages";

/**
 * Convert full GameState to VisibleGameState for sending to a player.
 * Only the deck contents are hidden (unknown draw order). Everything else
 * — including the full discard pile — is visible information.
 */
export function toVisibleState(state: GameState): VisibleGameState {
  const players: VisiblePlayerState[] = state.players.map((p) => ({
    id: p.id,
    isActive: p.isActive,
    numberCards: p.numberCards,
    roundScore: p.roundScore,
    totalScore: p.totalScore,
    modifierCards: p.modifierCards,
    busted: p.busted,
  }));

  return {
    players,
    revealedCards: state.revealedCards,
    discardPile: state.discardPile,
    currentPlayerIndex: state.currentPlayerIndex,
    round: state.round,
    roundOver: state.roundOver,
    gameOver: state.gameOver,
    winner: state.winner,
    deckSize: state.deck.length,
  };
}
