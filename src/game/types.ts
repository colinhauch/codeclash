/**
 * CodeClash - Flip 7 Game Types
 *
 * Flip 7 Rules:
 * - Players draw cards to a row and score based on the sum of numbers
 * - Action cards affect other players (Freeze, Flip Three, Second Chance)
 * - Score modifiers add to or multiply your total
 * - First to 200 points wins
 * - If you draw a duplicate number card, you bust (score 0 this round)
 * - If you get 7 unique number cards, you win +15 bonus and end the round
 */

// =============================================================================
// Card Types
// =============================================================================

export type CardType =
  | "number"
  | "modifier" // +2, +4, +6, +8, +10, x2
  | "action"; // Freeze, Flip Three, Second Chance

export type ModifierType = "+2" | "+4" | "+6" | "+8" | "+10" | "x2";
export type ActionType = "freeze" | "flip-three" | "second-chance";

export interface NumberCard {
  type: "number";
  value: number; // 0-12
}

export interface ModifierCard {
  type: "modifier";
  modifier: ModifierType;
}

export interface ActionCard {
  type: "action";
  action: ActionType;
}

export type Card = NumberCard | ModifierCard | ActionCard;

// =============================================================================
// Player State
// =============================================================================

export interface PlayerState {
  /** Player's unique identifier */
  id: string;
  /** Cards in the line in front of the player (face up) */
  cards: Card[];
  /** Sum of number card values */
  numberTotal: number;
  /** Whether player has busted this round */
  busted: boolean;
  /** Whether player has chosen to stand */
  stood: boolean;
  /** Cumulative score across all rounds */
  totalScore: number;
  /** Action cards played on this player */
  actionCards: ActionCard[];
  /** Whether "Flip Three" is active (must draw 3 more cards) */
  flipThreeActive: boolean;
  /** Remaining draws needed for Flip Three */
  flipThreeRemaining: number;
  /** Track which number values player has (for bust detection) */
  numberValues: Set<number>;
}

// =============================================================================
// Game State
// =============================================================================

export interface GameState {
  /** All players in the game */
  players: PlayerState[];
  /** Cards remaining in deck (hidden from bots) */
  deck: Card[];
  /** All cards that have been revealed this round */
  revealedCards: Card[];
  /** Index of current player in players array */
  currentPlayerIndex: number;
  /** Current round number (starts at 1) */
  round: number;
  /** Whether round has ended */
  roundOver: boolean;
  /** Whether game has ended (someone reached 200 points) */
  gameOver: boolean;
  /** Winner player ID, or null if ongoing */
  winner: string | null;
}

// =============================================================================
// Visible State (What bots can see)
// =============================================================================

/**
 * The game state visible to a bot.
 * Bots cannot see the deck or other players' cards.
 */
export interface VisibleGameState {
  /** Bot's own cards */
  myCards: Card[];
  /** Sum of bot's number cards */
  myNumberTotal: number;
  /** Whether bot has busted */
  myBusted: boolean;
  /** Whether bot has stood */
  myStood: boolean;
  /** Bot's cumulative score */
  myScore: number;
  /** Information about opponents */
  opponents: OpponentInfo[];
  /** All cards that have been revealed this round */
  revealedCards: Card[];
  /** Current round number */
  round: number;
  /** Number of cards remaining in deck */
  cardsRemaining: number;
}

export interface OpponentInfo {
  id: string;
  /** Number of cards opponent has face up */
  cardCount: number;
  /** Sum of opponent's number cards (only visible if stood/busted) */
  numberTotal: number | null;
  /** Whether opponent has busted */
  busted: boolean;
  /** Whether opponent has stood */
  stood: boolean;
  /** Opponent's cumulative score */
  score: number;
  /** Number of action cards played on opponent */
  actionCardCount: number;
}

// =============================================================================
// Moves
// =============================================================================

export type MoveAction = "draw" | "stand";

export interface Move {
  action: MoveAction;
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
  /** History of all moves this round */
  moveHistory: MoveHistoryEntry[];
}

export interface MoveHistoryEntry {
  playerId: string;
  action: MoveAction;
  /** Card drawn, if action was "draw" */
  cardDrawn?: Card;
  /** Number total after this move */
  numberTotal: number;
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
