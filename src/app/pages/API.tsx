export default function API() {
  return (
    <div className="container-max space-y-8 max-w-4xl mx-auto">
      <div className="space-y-4 mb-12">
        <h1 className="art-deco-title text-5xl">API Reference</h1>
        <p className="text-lg text-[#b3bcc5]">
          Complete type definitions and helper functions for bot development.
        </p>
      </div>

      {/* Types */}
      <section className="card space-y-6">
        <h2 className="text-3xl font-bold text-[#d4af37]">Types</h2>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00d9ff]">Card Types</h3>
          <pre className="bg-[#0f131f] p-4 rounded-lg border border-[#2d3748] overflow-x-auto text-sm">
            <code className="font-mono text-[#f5f7fa]">
{`// Number card (0-12)
interface NumberCard {
  type: "number";
  value: number;
}

// Score modifier (+2, +4, +6, +8, +10, x2)
interface ModifierCard {
  type: "modifier";
  modifier: "+2" | "+4" | "+6" | "+8" | "+10" | "x2";
}

// Action card (freeze, flip-three, second-chance)
interface ActionCard {
  type: "action";
  action: "freeze" | "flip-three" | "second-chance";
}

type Card = NumberCard | ModifierCard | ActionCard;`}
            </code>
          </pre>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00d9ff]">Game State</h3>
          <pre className="bg-[#0f131f] p-4 rounded-lg border border-[#2d3748] overflow-x-auto text-sm">
            <code className="font-mono text-[#f5f7fa]">
{`interface VisibleGameState {
  // Your cards and totals
  myCards: Card[];
  myNumberTotal: number;
  myBusted: boolean;
  myStood: boolean;
  myScore: number;

  // Opponent info
  opponents: OpponentInfo[];

  // Game state
  revealedCards: Card[];
  round: number;
  cardsRemaining: number;
}

interface OpponentInfo {
  id: string;
  cardCount: number;
  numberTotal: number | null; // null if not stood/busted
  busted: boolean;
  stood: boolean;
  score: number;
  actionCardCount: number;
}`}
            </code>
          </pre>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00d9ff]">Bot Context</h3>
          <pre className="bg-[#0f131f] p-4 rounded-lg border border-[#2d3748] overflow-x-auto text-sm">
            <code className="font-mono text-[#f5f7fa]">
{`interface BotContext {
  myId: string;
  legalMoves: ("draw" | "stand")[];
  moveHistory: MoveHistoryEntry[];
}

interface MoveHistoryEntry {
  playerId: string;
  action: "draw" | "stand";
  cardDrawn?: Card;
  numberTotal: number;
  busted: boolean;
}`}
            </code>
          </pre>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00d9ff]">Bot Function</h3>
          <pre className="bg-[#0f131f] p-4 rounded-lg border border-[#2d3748] overflow-x-auto text-sm">
            <code className="font-mono text-[#f5f7fa]">
{`type Bot = (state: VisibleGameState, ctx: BotContext) => Move;

interface Move {
  action: "draw" | "stand";
}

// Your bot info for registration
interface BotInfo {
  id: string;           // Unique identifier
  name: string;         // Display name
  author: string;       // Your name
  description?: string; // Strategy description
  bot: Bot;            // The bot function
}`}
            </code>
          </pre>
        </div>
      </section>

      <div className="art-deco-divider"></div>

      {/* Helper Functions */}
      <section className="card space-y-6">
        <h2 className="text-3xl font-bold text-[#d4af37]">Helper Functions</h2>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00d9ff]">Card Utilities</h3>

          <div className="bg-[#252d47] p-4 rounded-lg border border-[#3a4563]">
            <p className="font-mono font-bold text-[#ffd60a] mb-2">getCardValue(card: Card): number</p>
            <p className="text-sm text-[#b3bcc5] mb-3">Get the numeric value of a card.</p>
            <pre className="bg-[#1a1f3a] p-2 rounded text-xs overflow-x-auto">
              <code className="font-mono text-[#f5f7fa]">
{`const value = getCardValue(numberCard); // 5
const value = getCardValue(modifierCard); // 0
const value = getCardValue(actionCard); // 0`}
              </code>
            </pre>
          </div>

          <div className="bg-[#252d47] p-4 rounded-lg border border-[#3a4563]">
            <p className="font-mono font-bold text-[#ffd60a] mb-2">getNumberCards(cards: Card[]): NumberCard[]</p>
            <p className="text-sm text-[#b3bcc5] mb-3">Filter only number cards from a collection.</p>
            <pre className="bg-[#1a1f3a] p-2 rounded text-xs overflow-x-auto">
              <code className="font-mono text-[#f5f7fa]">
{`const numbers = getNumberCards(state.myCards);`}
              </code>
            </pre>
          </div>

          <div className="bg-[#252d47] p-4 rounded-lg border border-[#3a4563]">
            <p className="font-mono font-bold text-[#ffd60a] mb-2">getUniqueNumberCount(cards: Card[]): number</p>
            <p className="text-sm text-[#b3bcc5] mb-3">Count unique number card values.</p>
            <pre className="bg-[#1a1f3a] p-2 rounded text-xs overflow-x-auto">
              <code className="font-mono text-[#f5f7fa]">
{`const unique = getUniqueNumberCount(state.myCards);
if (unique >= 6) {
  // Close to Flip 7!
}`}
              </code>
            </pre>
          </div>

          <div className="bg-[#252d47] p-4 rounded-lg border border-[#3a4563]">
            <p className="font-mono font-bold text-[#ffd60a] mb-2">countCardFrequency(cards: Card[]): Map</p>
            <p className="text-sm text-[#b3bcc5] mb-3">Get frequency of each card value.</p>
            <pre className="bg-[#1a1f3a] p-2 rounded text-xs overflow-x-auto">
              <code className="font-mono text-[#f5f7fa]">
{`const freq = countCardFrequency(state.revealedCards);
const twelveCount = freq.get(12) || 0;
// Check how many 12s have been drawn`}
              </code>
            </pre>
          </div>

          <div className="bg-[#252d47] p-4 rounded-lg border border-[#3a4563]">
            <p className="font-mono font-bold text-[#ffd60a] mb-2">getRiskLevel(value: number): number</p>
            <p className="text-sm text-[#b3bcc5] mb-3">Get the duplicate risk of a number (0-12, higher = riskier).</p>
            <pre className="bg-[#1a1f3a] p-2 rounded text-xs overflow-x-auto">
              <code className="font-mono text-[#f5f7fa]">
{`const risk = getRiskLevel(12); // 12 (lots of 12s in deck)
const risk = getRiskLevel(0);  // 1 (only one 0)`}
              </code>
            </pre>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00d9ff]">Game Analysis</h3>

          <div className="bg-[#252d47] p-4 rounded-lg border border-[#3a4563]">
            <p className="font-mono font-bold text-[#ffd60a] mb-2">canBust(myCards: Card[], newValue: number): boolean</p>
            <p className="text-sm text-[#b3bcc5] mb-3">Check if drawing a card with a given value would bust.</p>
            <pre className="bg-[#1a1f3a] p-2 rounded text-xs overflow-x-auto">
              <code className="font-mono text-[#f5f7fa]">
{`if (canBust(state.myCards, 12)) {
  // Drawing another 12 would bust
}`}
              </code>
            </pre>
          </div>

          <div className="bg-[#252d47] p-4 rounded-lg border border-[#3a4563]">
            <p className="font-mono font-bold text-[#ffd60a] mb-2">shouldFlip7(myCards: Card[], remaining: number): boolean</p>
            <p className="text-sm text-[#b3bcc5] mb-3">Estimate if Flip 7 is achievable with remaining cards.</p>
            <pre className="bg-[#1a1f3a] p-2 rounded text-xs overflow-x-auto">
              <code className="font-mono text-[#f5f7fa]">
{`if (shouldFlip7(state.myCards, state.cardsRemaining)) {
  return { action: "draw" };
}`}
              </code>
            </pre>
          </div>
        </div>
      </section>

      <div className="art-deco-divider"></div>

      {/* Tips & Tricks */}
      <section className="card space-y-6">
        <h2 className="text-3xl font-bold text-[#d4af37]">Tips & Tricks</h2>

        <div className="space-y-3">
          <div className="bg-[#252d47] p-4 rounded-lg border-l-4 border-[#06d6a0]">
            <p className="font-bold text-[#00d9ff] mb-2">Analyze the Revealed Cards</p>
            <p className="text-sm text-[#b3bcc5]">
              Use <code className="bg-[#1a1f3a] px-1 py-0.5 rounded">revealedCards</code> to understand what's been drawn.
              If several high cards are gone, drawing is safer.
            </p>
          </div>

          <div className="bg-[#252d47] p-4 rounded-lg border-l-4 border-[#06d6a0]">
            <p className="font-bold text-[#00d9ff] mb-2">Watch Opponent Cards</p>
            <p className="text-sm text-[#b3bcc5]">
              <code className="bg-[#1a1f3a] px-1 py-0.5 rounded">opponents[i].cardCount</code> tells you how aggressive they are.
              More cards = riskier strategy.
            </p>
          </div>

          <div className="bg-[#252d47] p-4 rounded-lg border-l-4 border-[#06d6a0]">
            <p className="font-bold text-[#00d9ff] mb-2">Track Move History</p>
            <p className="text-sm text-[#b3bcc5]">
              Use <code className="bg-[#1a1f3a] px-1 py-0.5 rounded">ctx.moveHistory</code> to see when opponents busted
              and what cards they drew.
            </p>
          </div>

          <div className="bg-[#252d47] p-4 rounded-lg border-l-4 border-[#06d6a0]">
            <p className="font-bold text-[#00d9ff] mb-2">Plan for Modifiers</p>
            <p className="text-sm text-[#b3bcc5]">
              A <code className="bg-[#1a1f3a] px-1 py-0.5 rounded">x2</code> card can double your score.
              Standing at 25 with x2 = 50 points!
            </p>
          </div>
        </div>
      </section>

      {/* Deck Info */}
      <section className="card space-y-6">
        <h2 className="text-3xl font-bold text-[#d4af37]">Deck Breakdown</h2>

        <p className="text-[#b3bcc5]">
          The deck contains 94 cards total:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#252d47] border-b border-[#3a4563]">
              <tr>
                <th className="text-left py-2 px-3 text-[#d4af37] font-mono">Card Type</th>
                <th className="text-right py-2 px-3 text-[#d4af37] font-mono">Count</th>
                <th className="text-left py-2 px-3 text-[#d4af37] font-mono">Value</th>
              </tr>
            </thead>
            <tbody className="text-[#b3bcc5]">
              {[12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((num) => (
                <tr key={num} className="border-b border-[#2d3748] hover:bg-[#252d47]">
                  <td className="py-2 px-3">Number</td>
                  <td className="py-2 px-3 text-right font-mono">{num === 0 ? 1 : num}</td>
                  <td className="py-2 px-3 font-mono">{num}</td>
                </tr>
              ))}
              <tr className="bg-[#252d47] border-t-2 border-[#3a4563]">
                <td className="py-2 px-3 font-bold">Modifiers</td>
                <td className="py-2 px-3 text-right font-mono">6</td>
                <td className="py-2 px-3 font-mono">+2, +4, +6, +8, +10, x2</td>
              </tr>
              <tr className="bg-[#252d47]">
                <td className="py-2 px-3 font-bold">Actions</td>
                <td className="py-2 px-3 text-right font-mono">9</td>
                <td className="py-2 px-3 font-mono">3x Freeze, 3x Flip 3, 3x Second Chance</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
