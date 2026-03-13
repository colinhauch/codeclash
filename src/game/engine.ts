/**
 * CodeClash - Flip 7 Game Engine
 *
 * Implements the game state machine for Flip 7
 */

import type {
  GameState,
  PlayerState,
  NumberCard,
  Move,
  GameEvent,
  ApplyMoveResult,
  EndRoundResult,
} from "./types";
import { shuffle, shuffleSeeded, createDeck } from "./deck";

const WINNING_SCORE = 200;
const FLIP_7_BONUS = 15;

// =============================================================================
// State Creation
// =============================================================================

/**
 * Create initial game state for a set of players
 */
export function createInitialState(playerIds: string[]): GameState {
  const players: PlayerState[] = playerIds.map((id) => ({
    id,
    isActive: true,
    numberCards: [],
    roundScore: 0,
    totalScore: 0,
    modifierCards: [],
    secondChanceActive: false,
    busted: false,
  }));

  const deck = shuffle(createDeck());
  const startIndex = playerIds.length <= 1 ? 0 : Math.floor(Math.random() * playerIds.length);

  return {
    players,
    deck,
    revealedCards: [],
    discardPile: [],
    currentPlayerIndex: startIndex,
    roundStartPlayerIndex: startIndex,
    round: 1,
    roundOver: false,
    gameOver: false,
    winner: null,
  };
}

/**
 * Create initial state with seeded randomness
 */
export function createInitialStateSeeded(
  playerIds: string[],
  seed: number
): GameState {
  const players: PlayerState[] = playerIds.map((id) => ({
    id,
    isActive: true,
    numberCards: [],
    roundScore: 0,
    totalScore: 0,
    modifierCards: [],
    secondChanceActive: false,
    busted: false,
  }));

  const deck = shuffleSeeded(createDeck(), seed);
  const startIndex = playerIds.length <= 1
    ? 0
    : Math.floor(((seed * 9301 + 49297) % 233280) / 233280 * playerIds.length);

  return {
    players,
    deck,
    revealedCards: [],
    discardPile: [],
    currentPlayerIndex: startIndex,
    roundStartPlayerIndex: startIndex,
    round: 1,
    roundOver: false,
    gameOver: false,
    winner: null,
  };
}

// =============================================================================
// State Cloning
// =============================================================================

/**
 * Deep clone game state via JSON serialization
 */
function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

// =============================================================================
// Move Validation & Legal Moves
// =============================================================================

/**
 * Get legal moves for current player
 */
export function getLegalMoves(state: GameState): Array<"draw" | "stand"> {
  const player = state.players[state.currentPlayerIndex];

  if (!player.isActive) {
    return [];
  }

  const moves: Array<"draw" | "stand"> = ["stand"];

  if (state.deck.length > 0 || state.discardPile.length > 0) {
    moves.push("draw");
  }

  return moves;
}

/**
 * Check if a move is legal
 */
export function isMoveLegal(state: GameState, move: Move): boolean {
  const legal = getLegalMoves(state);
  return legal.includes(move.action);
}

// =============================================================================
// Move Application
// =============================================================================

/**
 * Apply a move and return new state with emitted events
 */
export function applyMove(state: GameState, move: Move): ApplyMoveResult {
  const newState = cloneState(state);
  const player = newState.players[newState.currentPlayerIndex];
  const events: GameEvent[] = [];

  if (move.action === "stand") {
    events.push({ type: "stand", playerId: player.id, roundScore: player.roundScore });
    player.isActive = false;
    advanceToNextPlayer(newState);
  } else if (move.action === "draw") {
    // Mid-round reshuffle: if deck is empty, shuffle discard pile into deck
    if (newState.deck.length === 0) {
      if (newState.discardPile.length === 0) {
        return { state: newState, events }; // No cards anywhere
      }
      const reshuffleCount = newState.discardPile.length;
      newState.deck = shuffle([...newState.discardPile]);
      newState.discardPile = [];
      events.push({ type: "deck_reshuffled", cardsFromDiscard: reshuffleCount });
    }

    const card = newState.deck.pop()!;
    newState.revealedCards.push(card);
    events.push({ type: "card_drawn", playerId: player.id, card });

    if (card.type === "number") {
      const duplicate = player.numberCards.some((c) => (c as NumberCard).value === card.value);

      if (duplicate) {
        // Bust: keep cards visible until round end, score 0, go inactive
        events.push({ type: "bust", playerId: player.id, duplicateValue: card.value });
        player.numberCards.push(card); // keep the duplicate card visible
        player.roundScore = 0;
        player.busted = true;
        player.isActive = false;
        advanceToNextPlayer(newState);
      } else {
        player.numberCards.push(card);
        player.roundScore = computeLiveRoundScore(player);

        // Mid-round win check
        if (player.totalScore + player.roundScore >= WINNING_SCORE) {
          events.push({ type: "mid_round_win", playerId: player.id, totalScore: player.totalScore + player.roundScore });
          for (const p of newState.players) p.isActive = false;
          newState.roundOver = true;
          newState.gameOver = true;
          newState.winner = player.id;
          return { state: newState, events };
        }

        // Check for Flip 7
        if (player.numberCards.length === 7) {
          player.roundScore = computeLiveRoundScore(player) + FLIP_7_BONUS;
          events.push({ type: "flip7", playerId: player.id });
          // End the round immediately — all players go inactive
          for (const p of newState.players) {
            p.isActive = false;
          }
          newState.roundOver = true;
        } else {
          advanceToNextPlayer(newState);
        }
      }
    } else if (card.type === "modifier") {
      player.modifierCards.push(card);
      player.roundScore = computeLiveRoundScore(player);
      advanceToNextPlayer(newState);
    } else {
      // Action card: pass turn (action cards not yet implemented)
      advanceToNextPlayer(newState);
    }
  }

  if (isRoundOver(newState)) {
    newState.roundOver = true;
  }

  return { state: newState, events };
}

/**
 * Advance to next active player. Sets roundOver if no active players remain.
 */
function advanceToNextPlayer(state: GameState): void {
  const total = state.players.length;

  for (let i = 1; i <= total; i++) {
    const nextIndex = (state.currentPlayerIndex + i) % total;
    if (state.players[nextIndex].isActive) {
      state.currentPlayerIndex = nextIndex;
      return;
    }
  }

  // No active players remain
  state.roundOver = true;
}

// =============================================================================
// Score Helpers
// =============================================================================

/**
 * Compute a player's current round score including modifier cards.
 * Does NOT include the Flip 7 bonus (that's only applied at round end).
 */
function computeLiveRoundScore(player: PlayerState): number {
  let score = player.numberCards.reduce((sum, c) => sum + c.value, 0);
  // x2 always applies before additive modifiers, regardless of draw order
  const hasDouble = player.modifierCards.some((c) => c.modifier === "x2");
  if (hasDouble) score *= 2;
  for (const card of player.modifierCards) {
    if (card.modifier !== "x2") {
      score += parseInt(card.modifier.slice(1));
    }
  }
  return score;
}

// =============================================================================
// Round & Game Over Detection
// =============================================================================

/**
 * Check if round is over
 */
export function isRoundOver(state: GameState): boolean {
  return state.players.every((p) => !p.isActive);
}

/**
 * Check if game is over (someone reached 200 points)
 */
export function isGameOver(state: GameState): boolean {
  return state.players.some((p) => p.totalScore >= WINNING_SCORE);
}

/**
 * Get the winner if game is over
 */
export function getWinner(state: GameState): string | null {
  if (!isGameOver(state)) return null;

  const maxScore = Math.max(...state.players.map((p) => p.totalScore));
  const winners = state.players.filter((p) => p.totalScore === maxScore);

  return winners.length === 1 ? winners[0].id : null;
}

/**
 * Calculate final scores across all players
 */
export function calculateFinalScores(
  state: GameState
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const player of state.players) {
    scores[player.id] = player.totalScore;
  }
  return scores;
}

// =============================================================================
// Round Management
// =============================================================================

/**
 * Score the current round and update total scores
 */
function scoreRound(state: GameState): void {
  for (const player of state.players) {
    // Busted players score 0 this round — skip recomputation
    if (player.busted) {
      player.roundScore = 0;
      continue;
    }

    player.roundScore = computeLiveRoundScore(player);

    // Flip 7 bonus
    if (player.numberCards.length === 7) {
      player.roundScore += FLIP_7_BONUS;
    }

    player.totalScore += player.roundScore;
  }
}

/**
 * End the current round: score it, check game over, reset for next round
 */
export function endRound(state: GameState): EndRoundResult {
  const newState = cloneState(state);
  const events: GameEvent[] = [];

  scoreRound(newState);

  // Emit round_end with scores
  const scores: Record<string, { roundScore: number; totalScore: number }> = {};
  for (const player of newState.players) {
    scores[player.id] = { roundScore: player.roundScore, totalScore: player.totalScore };
  }
  events.push({ type: "round_end", round: newState.round, scores });

  if (isGameOver(newState)) {
    newState.gameOver = true;
    newState.winner = getWinner(newState);
    return { state: newState, events };
  }

  // Return all cards drawn this round to the discard pile.
  // revealedCards is the authoritative list of every card drawn this round
  // (player.numberCards / modifierCards are subsets of it), so discarding
  // revealedCards avoids double-counting while also capturing action cards
  // that only live in revealedCards and not in any player hand.
  newState.discardPile.push(...newState.revealedCards);

  // Prepare next round
  newState.round++;
  newState.roundOver = false;
  newState.revealedCards = [];

  for (const player of newState.players) {
    player.numberCards = [];
    player.modifierCards = [];
    player.roundScore = 0;
    player.isActive = true;
    player.secondChanceActive = false;
    player.busted = false;
  }

  // Rotate starting player by one seat
  const nextStart = (newState.roundStartPlayerIndex + 1) % newState.players.length;
  newState.roundStartPlayerIndex = nextStart;
  newState.currentPlayerIndex = nextStart;

  events.push({ type: "round_start", round: newState.round, startingPlayerId: newState.players[nextStart].id });

  return { state: newState, events };
}
