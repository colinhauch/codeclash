import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="container-max space-y-8 text-center py-12 md:py-20">
        <div className="space-y-4">
          <div className="inline-block">
            <span className="text-6xl md:text-7xl font-bold">⚡</span>
          </div>
          <h1 className="text-5xl md:text-7xl leading-tight">
            <span className="text-gradient-primary">CodeClash</span>
          </h1>
          <p className="text-xl md:text-2xl text-[#b3bcc5] max-w-2xl mx-auto">
            A bot tournament platform for{" "}
            <span className="text-[#ffd60a] font-bold">Flip 7</span>
          </p>
          <p className="text-lg text-[#6b7684]">
            Write a bot. Compete against friends. Rise to glory.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Link to="/guide" className="btn btn-primary text-lg px-8 py-4">
            🤖 Write Your Bot
          </Link>
          <Link to="/rules" className="btn btn-secondary text-lg px-8 py-4">
            📖 Learn the Rules
          </Link>
          <Link to="/results" className="btn btn-secondary text-lg px-8 py-4">
            🏆 View Results
          </Link>
        </div>
      </section>

      {/* Art Deco Divider */}
      <div className="art-deco-divider"></div>

      {/* Features Section */}
      <section className="container-max space-y-12">
        <h2 className="text-center art-deco-title text-4xl">How It Works</h2>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="card-elevated art-deco-corner">
            <div className="mb-4">
              <span className="text-5xl">🎮</span>
            </div>
            <h3 className="font-mono font-bold text-xl mb-3">The Game</h3>
            <p className="text-[#b3bcc5] leading-relaxed">
              Flip 7 is a press-your-luck card game where players draw cards trying to reach 200 points
              without busting. But watch out—duplicate cards mean instant bust!
            </p>
          </div>

          {/* Feature 2 */}
          <div className="card-elevated art-deco-corner">
            <div className="mb-4">
              <span className="text-5xl">🤖</span>
            </div>
            <h3 className="font-mono font-bold text-xl mb-3">Your Bot</h3>
            <p className="text-[#b3bcc5] leading-relaxed">
              Implement a simple bot function that decides when to draw or stand based on game state.
              Use our helper functions to analyze cards and make smart decisions.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="card-elevated art-deco-corner">
            <div className="mb-4">
              <span className="text-5xl">🏆</span>
            </div>
            <h3 className="font-mono font-bold text-xl mb-3">Tournament</h3>
            <p className="text-[#b3bcc5] leading-relaxed">
              All bots compete in a round-robin tournament. Results are displayed live so you can watch
              your bot battle the competition in real time.
            </p>
          </div>
        </div>
      </section>

      {/* Art Deco Divider */}
      <div className="art-deco-divider"></div>

      {/* Quick Start */}
      <section className="container-max space-y-8">
        <h2 className="text-center art-deco-title text-4xl">Quick Start</h2>

        <div className="max-w-3xl mx-auto card-elevated space-y-6">
          <div className="space-y-3">
            <h4 className="font-mono font-bold text-lg text-[#d4af37] flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#d4af37]/20 border border-[#d4af37] flex items-center justify-center text-sm">
                1
              </span>
              Clone the repository
            </h4>
            <pre className="bg-[#0f131f] p-4 rounded-lg border border-[#2d3748] overflow-x-auto">
              <code className="font-mono text-sm text-[#f5f7fa]">
                git clone https://github.com/colinhauch/codeclash.git
              </code>
            </pre>
          </div>

          <div className="space-y-3">
            <h4 className="font-mono font-bold text-lg text-[#d4af37] flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#d4af37]/20 border border-[#d4af37] flex items-center justify-center text-sm">
                2
              </span>
              Copy the template bot
            </h4>
            <pre className="bg-[#0f131f] p-4 rounded-lg border border-[#2d3748] overflow-x-auto">
              <code className="font-mono text-sm text-[#f5f7fa]">
                cp submissions/_template.ts submissions/my-bot.ts
              </code>
            </pre>
          </div>

          <div className="space-y-3">
            <h4 className="font-mono font-bold text-lg text-[#d4af37] flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#d4af37]/20 border border-[#d4af37] flex items-center justify-center text-sm">
                3
              </span>
              Implement your strategy
            </h4>
            <p className="text-[#b3bcc5]">Edit the bot function to decide when to draw or stand</p>
          </div>

          <div className="space-y-3">
            <h4 className="font-mono font-bold text-lg text-[#d4af37] flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#d4af37]/20 border border-[#d4af37] flex items-center justify-center text-sm">
                4
              </span>
              Test locally
            </h4>
            <pre className="bg-[#0f131f] p-4 rounded-lg border border-[#2d3748] overflow-x-auto">
              <code className="font-mono text-sm text-[#f5f7fa]">
                bun run test my-bot random --games 50
              </code>
            </pre>
          </div>

          <div className="space-y-3">
            <h4 className="font-mono font-bold text-lg text-[#d4af37] flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#d4af37]/20 border border-[#d4af37] flex items-center justify-center text-sm">
                5
              </span>
              Push and compete
            </h4>
            <pre className="bg-[#0f131f] p-4 rounded-lg border border-[#2d3748] overflow-x-auto">
              <code className="font-mono text-sm text-[#f5f7fa]">
                git add submissions/my-bot.ts && git commit && git push
              </code>
            </pre>
          </div>
        </div>

        <div className="text-center pt-8">
          <Link to="/guide" className="btn btn-primary text-lg px-8 py-4">
            Read the Full Guide →
          </Link>
        </div>
      </section>

      {/* Art Deco Divider */}
      <div className="art-deco-divider"></div>

      {/* Footer CTA */}
      <section className="container-max text-center space-y-6 py-12">
        <h2 className="text-3xl font-bold">Ready to compete?</h2>
        <p className="text-lg text-[#b3bcc5]">
          Check out the rules, write your bot, and dominate the arena.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/rules" className="btn btn-secondary text-lg px-8 py-4">
            📖 Rules
          </Link>
          <Link to="/guide" className="btn btn-primary text-lg px-8 py-4">
            🤖 Create Bot
          </Link>
          <Link to="/results" className="btn btn-secondary text-lg px-8 py-4">
            🏆 Leaderboard
          </Link>
        </div>
      </section>
    </div>
  );
}
