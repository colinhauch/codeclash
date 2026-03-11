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
  /** Denotes if a player is active*/
  isActive: boolean;
  /** Number cards in the line in front of the player (face up) */
  numberCards: NumberCard[];
  /** Sum of number card values */
  roundScore: number;
  /** Cumulative score across all rounds, including current round */
  totalScore: number;
  /** Modifier cards collected by this player */
  modifierCards: ModifierCard[];
  /** This player has a second chance card */
  secondChanceActive: boolean;
  /** Whether this player busted this round (drew a duplicate number card) */
  busted: boolean;
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
  /** Cards that have been played/discarded; reshuffled into deck when deck empties */
  discardPile: Card[];
  /** Index of current player in players array */
  currentPlayerIndex: number;
  /** Index of the player who started the current round (used to rotate each round) */
  roundStartPlayerIndex: number;
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
// Moves
// =============================================================================

export type MoveAction = "draw" | "stand";

export interface Move {
  action: MoveAction;
}

export interface MoveHistoryEntry {
  playerId: string;
  action: MoveAction;
  /** Card drawn, if action was "draw" */
  cardDrawn?: Card;
  /** Player's round score after this move */
  roundScore: number;
  /** Whether the player is still active after this move */
  isActive: boolean;
}

// =============================================================================
// Bot Interface
// =============================================================================

/**
 * The function signature every bot must implement.
 * Bots receive the full game state and their own player ID.
 */
export type Bot = (state: GameState, myId: string) => Move;

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
  /** Number of multiplayer games in Grand Prix finals */
  grandPrixGames?: number;
  /** Number of bots that qualify for Grand Prix */
  grandPrixQualifiers?: number;
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
  /** All matchup results (qualifying round) */
  matchups: MatchupResult[];
  /** Qualifying round standings */
  standings: Standing[];
  /** Grand Prix finals results (top qualifiers in multiplayer games) */
  grandPrix?: GrandPrixResult;
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

// =============================================================================
// Grand Prix Types
// =============================================================================

export interface PlayerPlacement {
  botId: string;
  rank: number;
  score: number;
  points: number;
}

export interface MultiplayerGameResult {
  id: string;
  placements: PlayerPlacement[];
  moves: MoveHistoryEntry[];
  finalScores: Record<string, number>;
  rounds: number;
}

export interface GrandPrixResult {
  qualifiers: string[];
  gamesPlayed: number;
  games: MultiplayerGameResult[];
  standings: GrandPrixStanding[];
}

export interface GrandPrixStanding {
  botId: string;
  totalPoints: number;
  wins: number;
  podiums: number;
  averagePlacement: number;
  placements: number[];
  rank: number;
}
