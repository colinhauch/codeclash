import type { GrandPrixResult, GrandPrixStanding } from "../../game/types";
import { useMemo } from "react";

interface GrandPrixViewProps {
  grandPrix: GrandPrixResult;
  bots: Array<{ id: string; name: string; author: string; description?: string }>;
  onGameClick?: (gameId: string) => void;
}

export default function GrandPrixView({
  grandPrix,
  bots,
  onGameClick,
}: GrandPrixViewProps) {
  const botNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const bot of bots) {
      map[bot.id] = bot.name;
    }
    return map;
  }, [bots]);

  const qualifierCount = grandPrix.qualifiers.length;

  return (
    <div className="space-y-8">
      {/* Grand Prix Header */}
      <div className="card-elevated">
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-xs text-[#6b7684] font-mono mb-2">FORMAT</p>
            <p className="text-2xl font-mono font-bold text-[#d4af37]">
              {qualifierCount}-Player Grand Prix
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6b7684] font-mono mb-2">GAMES PLAYED</p>
            <p className="text-2xl font-mono font-bold text-[#00d9ff]">
              {grandPrix.gamesPlayed}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6b7684] font-mono mb-2">POINTS PER GAME</p>
            <p className="text-sm font-mono font-bold text-[#f5f7fa]">
              {qualifierCount} for 1st, 1 for last
            </p>
          </div>
        </div>
      </div>

      {/* Championship Standings */}
      <div className="card-elevated">
        <h3 className="art-deco-title text-2xl mb-6">Championship Standings</h3>
        <div className="space-y-2">
          {grandPrix.standings.map((standing) => (
            <StandingRow
              key={standing.botId}
              standing={standing}
              botName={botNameMap[standing.botId] || standing.botId}
              qualifierCount={qualifierCount}
              gamesPlayed={grandPrix.gamesPlayed}
            />
          ))}
        </div>
      </div>

      {/* Placement Distribution */}
      <div className="card-elevated">
        <h3 className="art-deco-title text-2xl mb-6">Placement Distribution</h3>
        <div className="space-y-4">
          {grandPrix.standings.slice(0, 6).map((standing) => (
            <PlacementChart
              key={standing.botId}
              standing={standing}
              botName={botNameMap[standing.botId] || standing.botId}
              qualifierCount={qualifierCount}
              gamesPlayed={grandPrix.gamesPlayed}
            />
          ))}
        </div>
      </div>

      {/* Games List */}
      <div className="card-elevated">
        <h3 className="art-deco-title text-2xl mb-6">
          Games ({grandPrix.games.length})
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {grandPrix.games.map((game, idx) => {
            const top3 = game.placements
              .filter((p) => p.rank <= 3)
              .sort((a, b) => a.rank - b.rank);

            return (
              <div
                key={game.id}
                onClick={() => onGameClick?.(game.id)}
                className="flex items-center gap-4 p-3 bg-[#252d47] rounded-lg border border-[#3a4563] hover:border-[#00d9ff] transition-colors cursor-pointer"
              >
                <span className="text-xs font-mono text-[#6b7684] w-12">
                  #{idx + 1}
                </span>
                <div className="flex items-center gap-3 flex-1">
                  {top3.map((p) => (
                    <span key={p.botId} className="flex items-center gap-1">
                      <span
                        className={`text-xs font-mono font-bold ${
                          p.rank === 1
                            ? "text-[#d4af37]"
                            : p.rank === 2
                              ? "text-[#b3bcc5]"
                              : "text-[#cd7f32]"
                        }`}
                      >
                        {p.rank === 1 ? "1st" : p.rank === 2 ? "2nd" : "3rd"}
                      </span>
                      <span className="text-sm font-mono text-[#f5f7fa]">
                        {botNameMap[p.botId] || p.botId}
                      </span>
                      <span className="text-xs text-[#6b7684]">
                        ({p.score})
                      </span>
                    </span>
                  ))}
                </div>
                <span className="text-xs font-mono text-[#6b7684]">
                  {game.rounds}R
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StandingRow({
  standing,
  botName,
  qualifierCount,
  gamesPlayed,
}: {
  standing: GrandPrixStanding;
  botName: string;
  qualifierCount: number;
  gamesPlayed: number;
}) {
  const maxPoints = qualifierCount * gamesPlayed;
  const pointsPct = maxPoints > 0 ? (standing.totalPoints / maxPoints) * 100 : 0;

  return (
    <div className="flex items-center gap-4 p-4 bg-[#252d47] rounded-lg border border-[#3a4563] hover:border-[#00d9ff] transition-colors">
      {/* Rank */}
      <div className="w-12 h-12 rounded-full bg-[#d4af37]/20 border border-[#d4af37] flex items-center justify-center flex-shrink-0">
        <span className="text-lg font-mono font-bold text-[#d4af37]">
          #{standing.rank}
        </span>
      </div>

      {/* Bot Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-mono font-bold text-lg">{botName}</h4>
        <div className="w-full bg-[#1a1f36] rounded-full h-1.5 mt-1">
          <div
            className="bg-[#d4af37] h-1.5 rounded-full transition-all"
            style={{ width: `${pointsPct}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm">
        <div className="text-center">
          <p className="text-xs text-[#6b7684] font-mono">POINTS</p>
          <p className="text-xl font-mono font-bold text-[#d4af37]">
            {standing.totalPoints}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[#6b7684] font-mono">WINS</p>
          <p className="text-xl font-mono font-bold text-[#06d6a0]">
            {standing.wins}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[#6b7684] font-mono">PODIUMS</p>
          <p className="text-xl font-mono font-bold text-[#00d9ff]">
            {standing.podiums}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[#6b7684] font-mono">AVG</p>
          <p className="text-xl font-mono font-bold text-[#f5f7fa]">
            {standing.averagePlacement.toFixed(1)}
          </p>
        </div>
      </div>
    </div>
  );
}

function PlacementChart({
  standing,
  botName,
  qualifierCount,
}: {
  standing: GrandPrixStanding;
  botName: string;
  qualifierCount: number;
  gamesPlayed?: number;
}) {
  // Count occurrences of each placement
  const counts: number[] = new Array(qualifierCount).fill(0);
  for (const p of standing.placements) {
    if (p >= 1 && p <= qualifierCount) {
      counts[p - 1]++;
    }
  }

  const maxCount = Math.max(...counts, 1);

  return (
    <div className="p-3 bg-[#252d47] rounded-lg border border-[#3a4563]">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono font-bold text-sm">{botName}</span>
        <span className="text-xs text-[#6b7684] font-mono">
          {standing.totalPoints}pts
        </span>
      </div>
      <div className="flex items-end gap-1 h-8">
        {counts.map((count, idx) => {
          const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const color =
            idx === 0
              ? "bg-[#d4af37]"
              : idx === 1
                ? "bg-[#b3bcc5]"
                : idx === 2
                  ? "bg-[#cd7f32]"
                  : "bg-[#3a4563]";

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center gap-0.5"
              title={`${idx + 1}${idx === 0 ? "st" : idx === 1 ? "nd" : idx === 2 ? "rd" : "th"}: ${count}x`}
            >
              <div
                className={`w-full rounded-t ${color} transition-all min-h-[2px]`}
                style={{ height: `${Math.max(height, 5)}%` }}
              />
              {idx < 3 && (
                <span className="text-[9px] text-[#6b7684] font-mono">
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
