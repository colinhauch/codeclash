/**
 * CodeClash - Flip 7 Game Types
 *
 * Flip 7 Rules:
 * - Players take turns drawing cards or standing
 * - Goal: Get as close to 7 as possible without going over
 * - If you go over 7, you bust and score 0
 * - Special cards with value 0 are wild and let you set any value 1-7
 * - Player with highest score (closest to 7 without busting) wins
 */

// =============================================================================
// Card Types
// =============================================================================

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

export interface Card {
  /** Card value: 1-6 for normal cards, 0 for wild cards */
  value: number;
  suit: Suit;
}

// =============================================================================
// Player State
// =============================================================================

export interface PlayerState {
  /** Player's unique identifier */
  id: string;
  /** Cards in hand */
  hand: Card[];
  /** Current total (sum of card values, with wilds resolved) */
  total: number;
  /** Whether player has busted (total > 7) */
  busted: boolean;
  /** Whether player has chosen to stand */
  stood: boolean;
  /** Wild card values chosen by player (index matches wild card position) */
  wildChoices: number[];
}

// =============================================================================
// Game State
// =============================================================================

export interface GameState {
  /** All players in the game */
  players: PlayerState[];
  /** Cards remaining in deck (hidden from bots) */
  deck: Card[];
  /** All cards that have been revealed this game */
  revealedCards: Card[];
  /** Index of current player in players array */
  currentPlayerIndex: number;
  /** Current round number (starts at 1) */
  round: number;
  /** Whether game has ended */
  gameOver: boolean;
  /** Winner player ID, or null if draw/ongoing */
  winner: string | null;
}

// =============================================================================
// Visible State (What bots can see)
// =============================================================================

/**
 * The game state visible to a bot.
 * Bots cannot see the deck or other players' exact cards.
 */
export interface VisibleGameState {
  /** Bot's own hand */
  myHand: Card[];
  /** Bot's current total */
  myTotal: number;
  /** Whether bot has busted */
  myBusted: boolean;
  /** Information about opponents */
  opponents: OpponentInfo[];
  /** All cards that have been revealed (drawn) this game */
  revealedCards: Card[];
  /** Current round number */
  round: number;
  /** Number of cards remaining in deck */
  cardsRemaining: number;
}

export interface OpponentInfo {
  id: string;
  /** Number of cards opponent has */
  cardCount: number;
  /** Whether opponent has busted */
  busted: boolean;
  /** Whether opponent has stood */
  stood: boolean;
  /** Opponent's revealed total (only visible if they've stood or busted) */
  revealedTotal: number | null;
}

// =============================================================================
// Moves
// =============================================================================

export type MoveAction = "draw" | "stand";

export interface Move {
  action: MoveAction;
  /** If drawing a wild card, what value to assign (1-7). Required for wild cards. */
  wildValue?: number;
}

// =============================================================================
// Bot Context
// =============================================================================

/**
 * Additional context provided to bots to help with decision-making.
 */
export interface BotContext {
  /** Bot's player ID */
  myId: string;
  /** Legal moves available */
  legalMoves: MoveAction[];
  /** History of all moves this game */
  moveHistory: MoveHistoryEntry[];
  /** Time remaining in milliseconds (if using time bank) */
  timeRemaining?: number;
}

export interface MoveHistoryEntry {
  playerId: string;
  action: MoveAction;
  /** Card drawn, if action was "draw" */
  cardDrawn?: Card;
  /** New total after this move */
  newTotal: number;
  /** Whether this move caused a bust */
  busted: boolean;
}

// =============================================================================
// Bot Interface
// =============================================================================

/**
 * The function signature every bot must implement.
 */
export type Bot = (state: VisibleGameState, ctx: BotContext) => Move;

/**
 * Bot metadata for registration.
 */
export interface BotInfo {
  /** Unique identifier (filename without extension) */
  id: string;
  /** Display name */
  name: string;
  /** Author name */
  author: string;
  /** Brief strategy description */
  description?: string;
  /** The bot function */
  bot: Bot;
}

// =============================================================================
// Tournament Types
// =============================================================================

export interface TournamentConfig {
  /** Number of games per matchup */
  gamesPerMatchup: number;
  /** Per-move timeout in milliseconds */
  moveTimeoutMs: number;
  /** Random seed for reproducibility (optional) */
  seed?: number;
}

export interface TournamentResult {
  /** Tournament identifier */
  id: string;
  /** Game being played */
  game: "flip-7";
  /** When tournament was run */
  timestamp: string;
  /** Configuration used */
  config: TournamentConfig;
  /** Participating bots */
  bots: Omit<BotInfo, "bot">[];
  /** All matchup results */
  matchups: MatchupResult[];
  /** Final standings */
  standings: Standing[];
}

export interface MatchupResult {
  /** First bot ID */
  bot1: string;
  /** Second bot ID */
  bot2: string;
  /** Individual game results */
  games: GameResult[];
  /** Summary statistics */
  summary: {
    bot1Wins: number;
    bot2Wins: number;
    draws: number;
  };
}

export interface GameResult {
  /** Unique game identifier */
  id: string;
  /** Winner bot ID, or null for draw */
  winner: string | null;
  /** Complete move history for replay */
  moves: MoveHistoryEntry[];
  /** Final scores */
  finalScores: Record<string, number>;
  /** Total number of rounds */
  rounds: number;
}

export interface Standing {
  /** Bot ID */
  botId: string;
  /** Total wins */
  wins: number;
  /** Total losses */
  losses: number;
  /** Total draws */
  draws: number;
  /** Win rate (wins / total games) */
  winRate: number;
  /** Rank (1 = first place) */
  rank: number;
}
