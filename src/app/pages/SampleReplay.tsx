/**
 * Dev page: loads public/sample-game.json and shows the GameVisualizer.
 * Navigate to /sample-replay in dev.
 */
import { useEffect, useState } from "react";
import type { GameState, MoveHistoryEntry } from "../../game/types";
import { createInitialState, applyMove } from "../../game/engine";
import GameVisualizer from "../components/GameVisualizer";
import MoveList from "../components/MoveList";

interface SampleGame {
  playerIds: string[];
  winner: string | null;
  finalScores: Record<string, number>;
  rounds: number;
  moves: MoveHistoryEntry[];
}

export default function SampleReplay() {
  const [gameStates, setGameStates] = useState<GameState[]>([]);
  const [moves, setMoves] = useState<MoveHistoryEntry[]>([]);
  const [finalScores, setFinalScores] = useState<Record<string, number>>({});
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/sample-game.json")
      .then((r) => r.json())
      .then((data: SampleGame) => {
        setMoves(data.moves);
        setFinalScores(data.finalScores);
        setPlayerIds(data.playerIds);

        const states: GameState[] = [];
        let state = createInitialState(data.playerIds);
        states.push(JSON.parse(JSON.stringify(state)));
        for (const move of data.moves) {
          state = applyMove(state, move);
          states.push(JSON.parse(JSON.stringify(state)));
        }
        setGameStates(states);
      })
      .catch(() => setError("Failed to load sample-game.json"));
  }, []);

  if (error) {
    return (
      <div className="container-max">
        <div className="card text-center py-16">
          <p className="text-[#ef476f]">{error}</p>
          <p className="text-[#6b7684] text-sm mt-2">
            Run: bun run src/cli/capture-sample-game.ts
          </p>
        </div>
      </div>
    );
  }

  const currentGameState = gameStates[currentMoveIndex + 1];

  if (!currentGameState) {
    return (
      <div className="container-max">
        <div className="card text-center py-16">
          <p className="text-[#6b7684] font-mono">Loading sample game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-max space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="art-deco-title text-2xl">Sample Replay</h1>
        <p className="text-xs text-[#6b7684] font-mono">
          {playerIds.join(" vs ")} — {moves.length} moves
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <GameVisualizer gameState={currentGameState} />
        </div>
        <div>
          <MoveList
            moves={moves}
            currentMoveIndex={currentMoveIndex}
            onMoveSelect={setCurrentMoveIndex}
            compact={true}
          />
        </div>
      </div>

      <div className="card-elevated">
        <h3 className="art-deco-title text-xl mb-6">Final Scores</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {playerIds
            .sort((a, b) => (finalScores[b] || 0) - (finalScores[a] || 0))
            .map((id) => (
              <div key={id} className="text-center">
                <p className="text-xs text-[#6b7684] font-mono mb-2">{id}</p>
                <p className="text-2xl font-mono font-bold text-[#d4af37]">
                  {finalScores[id] || 0}
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
