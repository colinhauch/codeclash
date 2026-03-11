import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import type {
  TournamentResult,
  GameState,
  MoveHistoryEntry,
} from "../../game/types";
import { createInitialState, applyMove } from "../../game/engine";
import GameVisualizer from "../components/GameVisualizer";
import MoveList from "../components/MoveList";

export default function GameReplay() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const isGrandPrix = location.pathname.includes("/grandprix/");
  const bot1 = params.bot1 || "";
  const bot2 = params.bot2 || "";
  const gameId = params.gameId || "";

  const [result, setResult] = useState<TournamentResult | null>(null);
  const [moves, setMoves] = useState<MoveHistoryEntry[]>([]);
  const [finalScores, setFinalScores] = useState<Record<string, number>>({});
  const [rounds, setRounds] = useState(0);
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [gameStates, setGameStates] = useState<GameState[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch("/api/results");
        if (!response.ok) {
          throw new Error("No tournament results available");
        }
        const data: TournamentResult = await response.json();
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load results");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  // Find the game when result loads
  useEffect(() => {
    if (!result) return;

    if (isGrandPrix) {
      if (!result.grandPrix) {
        setError("Grand Prix data not found");
        return;
      }
      const game = result.grandPrix.games.find((g) => g.id === gameId);
      if (!game) {
        setError("Game not found");
        return;
      }
      setMoves(game.moves);
      setFinalScores(game.finalScores);
      setRounds(game.rounds);
      setPlayerIds(result.grandPrix.qualifiers);
    } else {
      const matchup = result.matchups.find(
        (m) =>
          (m.bot1 === bot1 && m.bot2 === bot2) ||
          (m.bot1 === bot2 && m.bot2 === bot1)
      );
      if (!matchup) {
        setError("Matchup not found");
        return;
      }
      const game = matchup.games.find((g) => g.id === gameId);
      if (!game) {
        setError("Game not found");
        return;
      }
      setMoves(game.moves);
      setFinalScores(game.finalScores);
      setRounds(game.rounds);
      setPlayerIds([bot1, bot2]);
    }
  }, [result, bot1, bot2, gameId, isGrandPrix]);

  // Reconstruct game states from moves
  useEffect(() => {
    if (moves.length === 0 || playerIds.length === 0) return;

    try {
      const states: GameState[] = [];
      let state = createInitialState(playerIds);
      states.push(JSON.parse(JSON.stringify(state)));

      for (const move of moves) {
        state = applyMove(state, move).state;
        states.push(JSON.parse(JSON.stringify(state)));
      }

      setGameStates(states);
    } catch (err) {
      console.error("Error reconstructing game state:", err);
      setError("Failed to reconstruct game replay");
    }
  }, [moves, playerIds]);

  const currentGameState = gameStates[currentMoveIndex + 1];

  const handleBack = () => {
    if (isGrandPrix) {
      navigate("/results");
    } else {
      navigate(`/results/${bot1}-vs-${bot2}`);
    }
  };

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
          <p className="text-lg text-[#ef476f] font-bold">{error}</p>
          <button onClick={handleBack} className="btn btn-primary">
            Back
          </button>
        </div>
      </div>
    );
  }

  if (!currentGameState || moves.length === 0) {
    return (
      <div className="container-max">
        <div className="card text-center py-16">
          <p className="text-lg text-[#6b7684]">Loading...</p>
        </div>
      </div>
    );
  }

  const title = isGrandPrix
    ? "Grand Prix Game"
    : `${bot1} vs ${bot2}`;

  return (
    <div className="container-max space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          className="btn btn-ghost flex items-center gap-2"
        >
          {isGrandPrix ? "← Back to Grand Prix" : "← Back to Matchup"}
        </button>
        <h1 className="art-deco-title text-2xl">{title}</h1>
        <div className="text-right">
          <p className="text-xs text-[#6b7684] font-mono">
            {rounds} rounds, {moves.length} moves
          </p>
        </div>
      </div>

      {/* Main Content */}
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

      {/* Game Summary */}
      <div className="card-elevated">
        <h3 className="art-deco-title text-xl mb-6">Final Scores</h3>
        <div className={`grid gap-4 ${playerIds.length <= 4 ? `md:grid-cols-${playerIds.length}` : "md:grid-cols-4 lg:grid-cols-6"}`}>
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
