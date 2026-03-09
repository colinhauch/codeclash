import type { TournamentResult } from "../../game/types";
import { useMemo } from "react";

interface TournamentGridProps {
  result: TournamentResult;
  onMatchupClick?: (bot1: string, bot2: string) => void;
}

export default function TournamentGrid({
  result,
  onMatchupClick,
}: TournamentGridProps) {
  // Create a map of matchups for quick lookup
  const matchupMap = useMemo(() => {
    const map: Record<string, { bot1Wins: number; bot2Wins: number; draws: number }> = {};

    for (const matchup of result.matchups) {
      const key1 = `${matchup.bot1}-vs-${matchup.bot2}`;
      const key2 = `${matchup.bot2}-vs-${matchup.bot1}`;

      map[key1] = matchup.summary;
      map[key2] = {
        bot1Wins: matchup.summary.bot2Wins,
        bot2Wins: matchup.summary.bot1Wins,
        draws: matchup.summary.draws,
      };
    }

    return map;
  }, [result]);

  const getRecord = (bot1: string, bot2: string) => {
    const key = `${bot1}-vs-${bot2}`;
    return matchupMap[key];
  };

  const getRecordColor = (bot1Wins: number, bot2Wins: number) => {
    if (bot1Wins > bot2Wins) return "win";
    if (bot1Wins < bot2Wins) return "loss";
    return "draw";
  };

  const botIds = result.bots.map((b) => b.id);

  return (
    <div className="space-y-8">
      {/* Tournament Header */}
      <div className="card-elevated">
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-xs text-[#6b7684] font-mono mb-2">TOURNAMENT</p>
            <p className="text-2xl font-mono font-bold text-[#d4af37]">{result.id}</p>
          </div>
          <div>
            <p className="text-xs text-[#6b7684] font-mono mb-2">PARTICIPANTS</p>
            <p className="text-2xl font-mono font-bold text-[#00d9ff]">
              {result.bots.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6b7684] font-mono mb-2">DATE</p>
            <p className="text-sm font-mono font-bold text-[#f5f7fa]">
              {new Date(result.timestamp).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Results Matrix */}
      <div className="tournament-grid">
        <table>
          <thead>
            <tr>
              <th className="w-24">BOTS</th>
              {botIds.map((botId) => (
                <th key={botId} className="min-w-16">
                  <div className="font-mono text-xs">{botId}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {botIds.map((bot1) => (
              <tr key={bot1}>
                <td className="font-mono font-bold">{bot1}</td>
                {botIds.map((bot2) => {
                  if (bot1 === bot2) {
                    return (
                      <td key={`${bot1}-${bot2}`} className="bg-[#252d47]/50">
                        —
                      </td>
                    );
                  }

                  const record = getRecord(bot1, bot2);
                  if (!record) {
                    return (
                      <td key={`${bot1}-${bot2}`} className="bg-[#252d47]/50">
                        —
                      </td>
                    );
                  }

                  const recordColor = getRecordColor(
                    record.bot1Wins,
                    record.bot2Wins
                  );
                  const displayText = `${record.bot1Wins}-${record.bot2Wins}`;

                  return (
                    <td
                      key={`${bot1}-${bot2}`}
                      onClick={() => onMatchupClick?.(bot1, bot2)}
                      className={`tournament-grid-cell ${recordColor}`}
                    >
                      <span className="font-mono font-bold text-sm">
                        {displayText}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Standings */}
      <div className="card-elevated">
        <h3 className="art-deco-title text-2xl mb-6">Standings</h3>
        <div className="space-y-2">
          {result.standings.map((standing, idx) => (
            <div
              key={standing.botId}
              className="flex items-center gap-4 p-4 bg-[#252d47] rounded-lg border border-[#3a4563] hover:border-[#00d9ff] transition-colors"
            >
              {/* Rank */}
              <div className="w-12 h-12 rounded-full bg-[#d4af37]/20 border border-[#d4af37] flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-mono font-bold text-[#d4af37]">
                  #{standing.rank}
                </span>
              </div>

              {/* Bot Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-mono font-bold text-lg">{standing.botId}</h4>
                <p className="text-sm text-[#6b7684]">
                  {(standing.winRate * 100).toFixed(1)}% win rate
                </p>
              </div>

              {/* Record */}
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-xs text-[#6b7684] font-mono">WINS</p>
                  <p className="text-xl font-mono font-bold text-[#06d6a0]">
                    {standing.wins}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-[#6b7684] font-mono">LOSSES</p>
                  <p className="text-xl font-mono font-bold text-[#ef476f]">
                    {standing.losses}
                  </p>
                </div>
                {standing.draws > 0 && (
                  <div className="text-center">
                    <p className="text-xs text-[#6b7684] font-mono">DRAWS</p>
                    <p className="text-xl font-mono font-bold text-[#b3bcc5]">
                      {standing.draws}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
