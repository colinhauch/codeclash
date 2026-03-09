import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { TournamentResult } from "../../game/types";
import TournamentGrid from "../components/TournamentGrid";

export default function Results() {
  const navigate = useNavigate();
  const [result, setResult] = useState<TournamentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch("/api/results");
        if (!response.ok) {
          throw new Error("No tournament results available yet");
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

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchResults, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleMatchupClick = (bot1: string, bot2: string) => {
    navigate(`/results/${bot1}-vs-${bot2}`);
  };

  return (
    <div className="container-max space-y-8 max-w-6xl mx-auto">
      <div className="space-y-4 mb-12">
        <h1 className="art-deco-title text-5xl">Tournament Results</h1>
        <p className="text-lg text-[#b3bcc5]">
          Live tournament standings and head-to-head matchups.
        </p>
      </div>

      {loading ? (
        <div className="card text-center py-16">
          <p className="text-lg text-[#6b7684] font-mono">Loading tournament results...</p>
        </div>
      ) : error ? (
        <div className="card bg-[#ef476f]/20 border border-[#ef476f]/50 text-center py-16 space-y-4">
          <p className="text-lg text-[#ef476f] font-bold">⚠️ {error}</p>
          <p className="text-sm text-[#b3bcc5]">
            Results will appear here once a tournament has been run and uploaded.
          </p>
          <p className="text-xs text-[#6b7684] font-mono mt-6">
            Check back soon!
          </p>
        </div>
      ) : result ? (
        <TournamentGrid result={result} onMatchupClick={handleMatchupClick} />
      ) : null}
    </div>
  );
}
