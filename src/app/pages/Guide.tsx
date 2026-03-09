export default function Guide() {
  return (
    <div className="container-max space-y-8 max-w-4xl mx-auto">
      <div className="space-y-4 mb-12">
        <h1 className="art-deco-title text-5xl">Write Your Bot</h1>
        <p className="text-lg text-[#b3bcc5]">
          A step-by-step guide to creating a competitive bot for Flip 7.
        </p>
      </div>

      {/* Prerequisites */}
      <section className="card space-y-4">
        <h2 className="text-3xl font-bold text-[#d4af37]">Prerequisites</h2>
        <ul className="space-y-2 text-[#b3bcc5]">
          <li className="flex items-start gap-3">
            <span className="text-[#d4af37] mt-1">◆</span>
            <span>Node.js 18+ or Bun (recommended)</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#d4af37] mt-1">◆</span>
            <span>Basic understanding of TypeScript/JavaScript</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#d4af37] mt-1">◆</span>
            <span>Git (for submitting your bot)</span>
          </li>
        </ul>
      </section>

      <div className="art-deco-divider"></div>

      {/* Getting Started */}
      <section className="card space-y-6">
        <h2 className="text-3xl font-bold text-[#d4af37]">Getting Started</h2>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00d9ff]">1. Clone the Repository</h3>
          <pre className="bg-[#0f131f] p-4 rounded-lg border border-[#2d3748] overflow-x-auto">
            <code className="font-mono text-sm text-[#f5f7fa]">
              git clone https://github.com/colinhauch/codeclash.git{"\n"}
              cd codeclash{"\n"}
              bun install
            </code>
          </pre>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00d9ff]">2. Copy the Template</h3>
          <pre className="bg-[#0f131f] p-4 rounded-lg border border-[#2d3748] overflow-x-auto">
            <code className="font-mono text-sm text-[#f5f7fa]">
              cp submissions/_template.ts submissions/my-bot.ts
            </code>
          </pre>
          <p className="text-[#6b7684] text-sm">Replace <code className="bg-[#252d47] px-2 py-1 rounded">my-bot</code> with your bot's name.</p>
        </div>
      </section>

      <div className="art-deco-divider"></div>

      {/* Understanding the Template */}
      <section className="card space-y-6">
        <h2 className="text-3xl font-bold text-[#d4af37]">Understanding the Template</h2>

        <pre className="bg-[#0f131f] p-4 rounded-lg border border-[#2d3748] overflow-x-auto text-sm">
          <code className="font-mono text-[#f5f7fa]">
{`import type { Bot, VisibleGameState, BotContext } from "../src/game/types";
import { getCardValue } from "../src/game/helpers";

export const bot: Bot = (state: VisibleGameState, ctx: BotContext) => {
  // Your strategy here
  // Return { action: "draw" } or { action: "stand" }
};

export const botInfo = {
  id: "my-bot",
  name: "My Bot",
  author: "Your Name",
  description: "A description of your strategy",
  bot,
};`}
          </code>
        </pre>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-[#00d9ff]">What You Have Access To</h3>

          <div className="space-y-3">
            <div className="bg-[#252d47] p-4 rounded-lg border border-[#3a4563]">
              <p className="font-mono font-bold text-[#d4af37] mb-2">state: VisibleGameState</p>
              <p className="text-sm text-[#b3bcc5] mb-3">Information about the current game:</p>
              <ul className="text-sm text-[#b3bcc5] space-y-1">
                <li>• <span className="font-mono">myCards</span> — Your cards</li>
                <li>• <span className="font-mono">myNumberTotal</span> — Your current point total</li>
                <li>• <span className="font-mono">myBusted</span> — Whether you've busted</li>
                <li>• <span className="font-mono">myStood</span> — Whether you've stood</li>
                <li>• <span className="font-mono">myScore</span> — Your cumulative score</li>
                <li>• <span className="font-mono">opponents</span> — Info about other players</li>
                <li>• <span className="font-mono">revealedCards</span> — All cards drawn this round</li>
                <li>• <span className="font-mono">cardsRemaining</span> — Cards left in deck</li>
              </ul>
            </div>

            <div className="bg-[#252d47] p-4 rounded-lg border border-[#3a4563]">
              <p className="font-mono font-bold text-[#d4af37] mb-2">ctx: BotContext</p>
              <p className="text-sm text-[#b3bcc5] mb-3">Additional context:</p>
              <ul className="text-sm text-[#b3bcc5] space-y-1">
                <li>• <span className="font-mono">legalMoves</span> — Moves you can make ("draw" or "stand")</li>
                <li>• <span className="font-mono">moveHistory</span> — All previous moves this round</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="art-deco-divider"></div>

      {/* Example Strategies */}
      <section className="card space-y-6">
        <h2 className="text-3xl font-bold text-[#d4af37]">Example Strategies</h2>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00d9ff]">Random Bot (Baseline)</h3>
          <pre className="bg-[#0f131f] p-4 rounded-lg border border-[#2d3748] overflow-x-auto text-sm">
            <code className="font-mono text-[#f5f7fa]">
{`export const bot: Bot = (state, ctx) => {
  // Randomly draw or stand
  const randomChoice = Math.random() < 0.5;
  return {
    action: randomChoice ? "draw" : "stand",
  };
};`}
            </code>
          </pre>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00d9ff]">Conservative Bot (Safe Play)</h3>
          <pre className="bg-[#0f131f] p-4 rounded-lg border border-[#2d3748] overflow-x-auto text-sm">
            <code className="font-mono text-[#f5f7fa]">
{`export const bot: Bot = (state, ctx) => {
  // Stand if you have 50+ points or 4+ unique cards
  if (state.myNumberTotal >= 50 || state.myCards.length >= 4) {
    return { action: "stand" };
  }
  return { action: "draw" };
};`}
            </code>
          </pre>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00d9ff]">Aggressive Bot (Go for Flip 7)</h3>
          <pre className="bg-[#0f131f] p-4 rounded-lg border border-[#2d3748] overflow-x-auto text-sm">
            <code className="font-mono text-[#f5f7fa]">
{`import { getUniqueNumberCount } from "../src/game/helpers";

export const bot: Bot = (state, ctx) => {
  const uniqueNumbers = getUniqueNumberCount(state.myCards);

  // Keep drawing if close to Flip 7 and deck not empty
  if (uniqueNumbers >= 6 && state.cardsRemaining > 0) {
    return { action: "draw" };
  }

  // Otherwise, stand at 50+ points
  if (state.myNumberTotal >= 50) {
    return { action: "stand" };
  }

  return { action: "draw" };
};`}
            </code>
          </pre>
        </div>
      </section>

      <div className="art-deco-divider"></div>

      {/* Testing */}
      <section className="card space-y-6">
        <h2 className="text-3xl font-bold text-[#d4af37]">Testing Your Bot</h2>

        <p className="text-[#b3bcc5]">
          Before tournament time, test your bot locally against the example bots:
        </p>

        <pre className="bg-[#0f131f] p-4 rounded-lg border border-[#2d3748] overflow-x-auto text-sm">
          <code className="font-mono text-[#f5f7fa]">
{`# Test against random bot, 50 games
bun run test my-bot random --games 50

# Test against conservative bot
bun run test my-bot conservative --games 50

# Test yourself against your own bot (self-play)
bun run test my-bot my-bot --games 50`}
          </code>
        </pre>

        <div className="bg-[#252d47] border-l-4 border-[#06d6a0] p-4 rounded-r-lg">
          <p className="text-[#b3bcc5]">
            💡 The test harness will show you win/loss/draw records and sample game outputs.
            Use this to refine your strategy!
          </p>
        </div>
      </section>

      <div className="art-deco-divider"></div>

      {/* Common Mistakes */}
      <section className="card space-y-6">
        <h2 className="text-3xl font-bold text-[#d4af37]">Common Mistakes</h2>

        <div className="space-y-3">
          <div className="bg-[#252d47] p-4 rounded-lg border-l-4 border-[#ef476f]">
            <p className="font-bold text-[#ef476f] mb-2">❌ Forgetting to check for busts</p>
            <p className="text-sm text-[#b3bcc5]">
              Always consider how many of each card has been revealed. High numbers have many duplicates!
            </p>
          </div>

          <div className="bg-[#252d47] p-4 rounded-lg border-l-4 border-[#ef476f]">
            <p className="font-bold text-[#ef476f] mb-2">❌ Standing too early</p>
            <p className="text-sm text-[#b3bcc5]">
              Standing at 20 points isn't optimal. Most rounds see scores in the 30-80 range.
            </p>
          </div>

          <div className="bg-[#252d47] p-4 rounded-lg border-l-4 border-[#ef476f]">
            <p className="font-bold text-[#ef476f] mb-2">❌ Ignoring opponent state</p>
            <p className="text-sm text-[#b3bcc5]">
              If all opponents have busted or stood, you know the deck for the rest of the round.
            </p>
          </div>

          <div className="bg-[#252d47] p-4 rounded-lg border-l-4 border-[#ef476f]">
            <p className="font-bold text-[#ef476f] mb-2">❌ Not accounting for tie-breaking</p>
            <p className="text-sm text-[#b3bcc5]">
              If you reach 200 points at the same time as another player, the one with more points wins.
            </p>
          </div>
        </div>
      </section>

      <div className="art-deco-divider"></div>

      {/* Submission */}
      <section className="card space-y-6">
        <h2 className="text-3xl font-bold text-[#d4af37]">Submit Your Bot</h2>

        <p className="text-[#b3bcc5]">
          When you're ready to compete:
        </p>

        <pre className="bg-[#0f131f] p-4 rounded-lg border border-[#2d3748] overflow-x-auto text-sm">
          <code className="font-mono text-[#f5f7fa]">
{`git add submissions/my-bot.ts
git commit -m "Add my-bot"
git push`}
          </code>
        </pre>

        <p className="text-[#b3bcc5]">
          Your bot will be automatically picked up in the next tournament run!
        </p>
      </section>

      {/* CTA */}
      <section className="card text-center space-y-4">
        <p className="text-[#b3bcc5]">
          Ready to start coding?
        </p>
        <p className="text-lg font-mono font-bold text-[#d4af37]">
          cp submissions/_template.ts submissions/my-bot.ts
        </p>
      </section>
    </div>
  );
}
