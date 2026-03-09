import type { MoveHistoryEntry } from "../../game/types";
import { useState } from "react";

interface MoveListProps {
  moves: MoveHistoryEntry[];
  currentMoveIndex?: number;
  onMoveSelect?: (index: number) => void;
  compact?: boolean;
}

export default function MoveList({
  moves,
  currentMoveIndex = -1,
  onMoveSelect,
  compact = false,
}: MoveListProps) {
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  if (moves.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-[#6b7684]">No moves recorded</p>
      </div>
    );
  }

  // Group moves by player turn
  const groupedMoves: MoveHistoryEntry[][] = [];
  let currentGroup: MoveHistoryEntry[] = [];

  for (const move of moves) {
    currentGroup.push(move);
    // Group by player for compact view
    if (
      currentGroup.length > 0 &&
      moves[moves.indexOf(move) + 1] &&
      moves[moves.indexOf(move) + 1].playerId !== move.playerId
    ) {
      groupedMoves.push(currentGroup);
      currentGroup = [];
    }
  }
  if (currentGroup.length > 0) {
    groupedMoves.push(currentGroup);
  }

  const getCardDisplay = (move: MoveHistoryEntry) => {
    if (move.action === "draw" && move.cardDrawn) {
      const card = move.cardDrawn;
      if (card.type === "number") {
        return `#${(card as any).value}`;
      } else if (card.type === "modifier") {
        return (card as any).modifier;
      } else {
        const actionMap: Record<string, string> = {
          freeze: "🧊",
          "flip-three": "🃏",
          "second-chance": "💫",
        };
        return actionMap[(card as any).action] || "?";
      }
    }
    return null;
  };

  const getActionColor = (action: string, busted: boolean) => {
    if (busted) return "bg-[#ef476f]/20 text-[#ef476f] border-[#ef476f]/30";
    if (action === "draw") return "bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]/30";
    return "bg-[#06d6a0]/20 text-[#06d6a0] border-[#06d6a0]/30";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="art-deco-title text-2xl">Move History</h3>
        <span className="text-sm text-[#6b7684] font-mono">
          {moves.length} moves
        </span>
      </div>

      <div className="card max-h-96 overflow-y-auto space-y-2">
        {compact ? (
          // Compact timeline view
          <div className="relative">
            {moves.map((move, idx) => {
              const isSelected = idx === currentMoveIndex;
              const cardDisplay = getCardDisplay(move);

              return (
                <div
                  key={idx}
                  onClick={() => onMoveSelect?.(idx)}
                  className={`relative p-3 rounded-lg mb-2 cursor-pointer transition-all duration-200 flex items-center gap-3 ${
                    isSelected
                      ? "bg-[#00d9ff]/30 border border-[#00d9ff] shadow-glow"
                      : "bg-[#252d47] hover:bg-[#2d3547] border border-[#3a4563]"
                  }`}
                >
                  {/* Move Number */}
                  <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 border border-[#d4af37] flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-mono font-bold text-[#d4af37]">
                      {idx + 1}
                    </span>
                  </div>

                  {/* Player */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-semibold">
                      {move.playerId}
                    </p>
                    <p className="text-xs text-[#6b7684]">{move.action}</p>
                  </div>

                  {/* Card or Action */}
                  {cardDisplay && (
                    <div className="px-3 py-1 rounded-lg bg-[#1a1f3a] border border-[#d4af37]/50 font-mono font-bold text-[#d4af37]">
                      {cardDisplay}
                    </div>
                  )}

                  {/* Result */}
                  <div className="text-right">
                    <p className="text-sm font-mono font-bold text-[#00d9ff]">
                      {move.numberTotal}
                    </p>
                    {move.busted && (
                      <p className="text-xs text-[#ef476f] font-semibold">
                        BUST
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Detailed grouped view
          <div className="space-y-3">
            {groupedMoves.map((group, roundIdx) => {
              const roundNumber = Math.floor(roundIdx / gameState?.players?.length || 2) + 1;

              return (
                <div key={roundIdx} className="border-l-2 border-[#d4af37]/30 pl-4">
                  <button
                    onClick={() =>
                      setExpandedRound(
                        expandedRound === roundIdx ? null : roundIdx
                      )
                    }
                    className="w-full text-left py-2 px-3 rounded-lg bg-[#252d47] hover:bg-[#2d3547] transition-colors border border-[#3a4563] flex items-center justify-between"
                  >
                    <span className="font-mono font-bold text-[#d4af37]">
                      Round {roundIdx + 1}
                    </span>
                    <span
                      className={`text-xs font-mono transition-transform ${
                        expandedRound === roundIdx ? "rotate-180" : ""
                      }`}
                    >
                      ▼
                    </span>
                  </button>

                  {expandedRound === roundIdx && (
                    <div className="mt-2 space-y-1">
                      {group.map((move, moveIdx) => {
                        const isSelected = moves.indexOf(move) === currentMoveIndex;
                        const cardDisplay = getCardDisplay(move);

                        return (
                          <div
                            key={moveIdx}
                            onClick={() => {
                              const globalIdx = moves.indexOf(move);
                              onMoveSelect?.(globalIdx);
                            }}
                            className={`p-2 rounded-lg text-sm transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                              isSelected
                                ? "bg-[#00d9ff]/20 border border-[#00d9ff]"
                                : "bg-[#1a1f3a] border border-[#2d3748] hover:border-[#3a4563]"
                            } ${getActionColor(move.action, move.busted)}`}
                          >
                            <span className="font-mono font-semibold">
                              {move.playerId}
                            </span>
                            <span className="text-xs">
                              {move.action === "draw" ? "drew" : "stood"}
                            </span>
                            {cardDisplay && (
                              <span className="px-2 py-0.5 bg-[#0a0e27] rounded border border-current text-xs font-mono font-bold">
                                {cardDisplay}
                              </span>
                            )}
                            <span className="ml-auto font-mono text-xs">
                              {move.numberTotal}
                              {move.busted ? " ✗" : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Playback Controls */}
      {onMoveSelect && (
        <div className="flex gap-2 justify-center pt-4 border-t border-[#2d3748]">
          <button
            onClick={() => onMoveSelect(0)}
            className="btn btn-secondary"
            disabled={currentMoveIndex === 0}
          >
            ⏮ First
          </button>
          <button
            onClick={() =>
              onMoveSelect(Math.max(0, currentMoveIndex - 1))
            }
            className="btn btn-secondary"
            disabled={currentMoveIndex === 0}
          >
            ◀ Prev
          </button>
          <button
            onClick={() =>
              onMoveSelect(Math.min(moves.length - 1, currentMoveIndex + 1))
            }
            className="btn btn-secondary"
            disabled={currentMoveIndex === moves.length - 1}
          >
            Next ▶
          </button>
          <button
            onClick={() => onMoveSelect(moves.length - 1)}
            className="btn btn-secondary"
            disabled={currentMoveIndex === moves.length - 1}
          >
            Last ⏭
          </button>
        </div>
      )}
    </div>
  );
}
