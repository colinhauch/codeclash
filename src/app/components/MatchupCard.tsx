import type { MatchupResult } from "../../game/types";
import { Link } from "react-router-dom";

interface MatchupCardProps {
  matchup: MatchupResult;
  compact?: boolean;
}

export default function MatchupCard({
  matchup,
  compact = false,
}: MatchupCardProps) {
  const { bot1, bot2, summary, games } = matchup;
  const totalGames = summary.bot1Wins + summary.bot2Wins + summary.draws;
  const bot1WinRate = totalGames > 0 ? (summary.bot1Wins / totalGames * 100).toFixed(1) : "0.0";

  if (compact) {
    return (
      <Link to={`/results/${bot1}-vs-${bot2}`}>
        <div className="card cursor-pointer hover:shadow-glow transition-all">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="font-mono font-bold text-lg">{bot1}</h4>
              <p className="text-sm text-[#6b7684]">
                {summary.bot1Wins}W - {summary.bot2Wins}L {summary.draws > 0 && `- ${summary.draws}D`}
              </p>
            </div>
            <div className="text-center px-4">
              <p className="text-xs text-[#6b7684] font-mono">vs</p>
            </div>
            <div className="flex-1 text-right">
              <h4 className="font-mono font-bold text-lg">{bot2}</h4>
              <p className="text-sm text-[#6b7684]">
                {summary.bot2Wins}W - {summary.bot1Wins}L {summary.draws > 0 && `- ${summary.draws}D`}
              </p>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-6">
      {/* Head to Head Stats */}
      <div className="card-elevated">
        <div className="mb-6">
          <h3 className="art-deco-title text-3xl text-center">
            {bot1} vs {bot2}
          </h3>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Bot 1 Stats */}
          <div className="text-center space-y-4">
            <h4 className="font-mono font-bold text-2xl text-[#d4af37]">
              {bot1}
            </h4>
            <div className="flex justify-around items-center">
              <div>
                <p className="text-xs text-[#6b7684] font-mono mb-2">WINS</p>
                <p className="text-4xl font-mono font-bold text-[#06d6a0]">
                  {summary.bot1Wins}
                </p>
              </div>
              <div className="text-[#6b7684]">-</div>
              <div>
                <p className="text-xs text-[#6b7684] font-mono mb-2">LOSSES</p>
                <p className="text-4xl font-mono font-bold text-[#ef476f]">
                  {summary.bot2Wins}
                </p>
              </div>
            </div>
            {summary.draws > 0 && (
              <div>
                <p className="text-xs text-[#6b7684] font-mono mb-2">DRAWS</p>
                <p className="text-2xl font-mono font-bold text-[#b3bcc5]">
                  {summary.draws}
                </p>
              </div>
            )}
            <div className="pt-4 border-t border-[#3a4563]">
              <p className="text-sm text-[#6b7684] font-mono">Win Rate</p>
              <p className="text-3xl font-mono font-bold text-[#00d9ff]">
                {bot1WinRate}%
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:flex items-center justify-center">
            <div className="w-0.5 h-full bg-gradient-to-b from-transparent via-[#d4af37] to-transparent"></div>
          </div>

          {/* Bot 2 Stats */}
          <div className="text-center space-y-4">
            <h4 className="font-mono font-bold text-2xl text-[#d4af37]">
              {bot2}
            </h4>
            <div className="flex justify-around items-center">
              <div>
                <p className="text-xs text-[#6b7684] font-mono mb-2">WINS</p>
                <p className="text-4xl font-mono font-bold text-[#06d6a0]">
                  {summary.bot2Wins}
                </p>
              </div>
              <div className="text-[#6b7684]">-</div>
              <div>
                <p className="text-xs text-[#6b7684] font-mono mb-2">LOSSES</p>
                <p className="text-4xl font-mono font-bold text-[#ef476f]">
                  {summary.bot1Wins}
                </p>
              </div>
            </div>
            {summary.draws > 0 && (
              <div>
                <p className="text-xs text-[#6b7684] font-mono mb-2">DRAWS</p>
                <p className="text-2xl font-mono font-bold text-[#b3bcc5]">
                  {summary.draws}
                </p>
              </div>
            )}
            <div className="pt-4 border-t border-[#3a4563]">
              <p className="text-sm text-[#6b7684] font-mono">Win Rate</p>
              <p className="text-3xl font-mono font-bold text-[#00d9ff]">
                {(100 - parseFloat(bot1WinRate)).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Games List */}
      {games.length > 0 && (
        <div className="card">
          <h4 className="art-deco-title text-xl mb-4">
            Games ({games.length})
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {games.map((game, idx) => {
              const winner = game.winner;
              const bot1Score = game.finalScores[bot1] || 0;
              const bot2Score = game.finalScores[bot2] || 0;

              return (
                <Link key={game.id} to={`/results/${bot1}-vs-${bot2}/game/${game.id}`}>
                  <div className="p-3 bg-[#252d47] hover:bg-[#2d3547] rounded-lg border border-[#3a4563] hover:border-[#00d9ff] transition-all cursor-pointer">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono text-xs text-[#6b7684]">
                        Game {idx + 1}
                      </span>
                      <div className="flex-1 text-center">
                        <span className="font-mono font-bold text-[#d4af37]">
                          {bot1}: {bot1Score}
                        </span>
                        <span className="mx-2 text-[#6b7684]">vs</span>
                        <span className="font-mono font-bold text-[#d4af37]">
                          {bot2}: {bot2Score}
                        </span>
                      </div>
                      <div>
                        {winner === bot1 ? (
                          <span className="badge badge-success">
                            {bot1} wins
                          </span>
                        ) : winner === bot2 ? (
                          <span className="badge badge-success">
                            {bot2} wins
                          </span>
                        ) : (
                          <span className="badge badge-info">Draw</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
