import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import type { TournamentResult } from "../../game/types";
import MatchupCard from "../components/MatchupCard";

export default function Matchup() {
  const { bot1: bot1Param, bot2: bot2Param } = useParams<{
    bot1: string;
    bot2: string;
  }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<TournamentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bot1 = bot1Param || "";
  const bot2 = bot2Param || "";

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

  if (loading) {
    return (
      <div className="container-max">
        <div className="card text-center py-16">
          <p className="text-lg text-[#6b7684] font-mono">Loading matchup data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-max">
        <div className="card bg-[#ef476f]/20 border border-[#ef476f]/50 text-center py-16">
          <p className="text-lg text-[#ef476f] font-bold mb-4">⚠️ {error}</p>
          <button onClick={() => navigate("/results")} className="btn btn-primary">
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="container-max">
        <div className="card text-center py-16">
          <p className="text-lg text-[#6b7684]">No results found</p>
        </div>
      </div>
    );
  }

  // Find the matchup
  const matchup = result.matchups.find(
    (m) => (m.bot1 === bot1 && m.bot2 === bot2) || (m.bot1 === bot2 && m.bot2 === bot1)
  );

  if (!matchup) {
    return (
      <div className="container-max">
        <div className="card text-center py-16">
          <p className="text-lg text-[#ef476f] font-bold mb-4">Matchup not found</p>
          <button onClick={() => navigate("/results")} className="btn btn-primary">
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-max space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/results")}
          className="btn btn-ghost flex items-center gap-2"
        >
          ← Back to Results
        </button>
      </div>

      {/* Matchup Card */}
      <MatchupCard matchup={matchup} />
    </div>
  );
}
