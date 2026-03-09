import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import type { TournamentResult, GameResult, GameState } from "../../game/types";
import { createInitialState, applyMove } from "../../game/engine";
import GameVisualizer from "../components/GameVisualizer";
import MoveList from "../components/MoveList";

export default function GameReplay() {
  const { bot1: bot1Param, bot2: bot2Param, gameId: gameIdParam } = useParams<{
    bot1: string;
    bot2: string;
    gameId: string;
  }>();
  const navigate = useNavigate();

  const [result, setResult] = useState<TournamentResult | null>(null);
  const [game, setGame] = useState<GameResult | null>(null);
  const [gameStates, setGameStates] = useState<GameState[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bot1 = bot1Param || "";
  const bot2 = bot2Param || "";
  const gameId = gameIdParam || "";

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch("/api/results");
        if (!response.ok) {
          throw new Error("No tournament results available");
        }
        const data = await response.json();
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load results");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  // Reconstruct game states from moves
  useEffect(() => {
    if (!game) return;

    try {
      const states: GameState[] = [];

      // Create initial state with the correct player order
      const botIds = [bot1, bot2];
      let state = createInitialState(botIds);
      states.push(JSON.parse(JSON.stringify(state)));

      // Apply each move in sequence
      for (const move of game.moves) {
        state = applyMove(state, move);
        states.push(JSON.parse(JSON.stringify(state)));
      }

      setGameStates(states);
    } catch (err) {
      console.error("Error reconstructing game state:", err);
      setError("Failed to reconstruct game replay");
    }
  }, [game, bot1, bot2]);

  // Find the game when result loads
  useEffect(() => {
    if (!result) return;

    const matchup = result.matchups.find(
      (m) => (m.bot1 === bot1 && m.bot2 === bot2) || (m.bot1 === bot2 && m.bot2 === bot1)
    );

    if (!matchup) {
      setError("Matchup not found");
      return;
    }

    const foundGame = matchup.games.find((g) => g.id === gameId);
    if (!foundGame) {
      setError("Game not found");
      return;
    }

    setGame(foundGame);
  }, [result, bot1, bot2, gameId]);

  const currentGameState = gameStates[currentMoveIndex + 1];

  if (loading) {
    return (
      <div className="container-max">
        <div className="card text-center py-16">
          <p className="text-lg text-[#6b7684] font-mono">Loading game replay...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-max">
        <div className="card bg-[#ef476f]/20 border border-[#ef476f]/50 text-center py-16 space-y-4">
          <p className="text-lg text-[#ef476f] font-bold">⚠️ {error}</p>
          <button
            onClick={() => navigate(`/results/${bot1}-vs-${bot2}`)}
            className="btn btn-primary"
          >
            Back to Matchup
          </button>
        </div>
      </div>
    );
  }

  if (!game || !currentGameState) {
    return (
      <div className="container-max">
        <div className="card text-center py-16">
          <p className="text-lg text-[#6b7684]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-max space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/results/${bot1}-vs-${bot2}`)}
          className="btn btn-ghost flex items-center gap-2"
        >
          ← Back to Matchup
        </button>
        <h1 className="art-deco-title text-2xl">
          {bot1} vs {bot2}
        </h1>
        <div className="text-right">
          <p className="text-xs text-[#6b7684] font-mono">Game {gameId}</p>
          <p className="font-mono font-bold text-[#d4af37]">
            {game.finalScores[bot1]} - {game.finalScores[bot2]}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Game Visualizer - Takes up 2 columns */}
        <div className="lg:col-span-2">
          <GameVisualizer gameState={currentGameState} />
        </div>

        {/* Move List - Takes up 1 column */}
        <div>
          <MoveList
            moves={game.moves}
            currentMoveIndex={currentMoveIndex}
            onMoveSelect={setCurrentMoveIndex}
            compact={true}
          />
        </div>
      </div>

      {/* Game Summary */}
      <div className="card-elevated">
        <h3 className="art-deco-title text-xl mb-6">Game Summary</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs text-[#6b7684] font-mono mb-2">ROUNDS</p>
            <p className="text-2xl font-mono font-bold text-[#d4af37]">
              {game.rounds}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[#6b7684] font-mono mb-2">MOVES</p>
            <p className="text-2xl font-mono font-bold text-[#00d9ff]">
              {game.moves.length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[#6b7684] font-mono mb-2">{bot1}</p>
            <p className="text-2xl font-mono font-bold text-[#d4af37]">
              {game.finalScores[bot1]}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[#6b7684] font-mono mb-2">{bot2}</p>
            <p className="text-2xl font-mono font-bold text-[#d4af37]">
              {game.finalScores[bot2]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
