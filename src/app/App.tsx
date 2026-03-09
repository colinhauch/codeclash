import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Rules from "./pages/Rules";
import Guide from "./pages/Guide";
import API from "./pages/API";
import Results from "./pages/Results";
import Matchup from "./pages/Matchup";
import GameReplay from "./pages/GameReplay";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="rules" element={<Rules />} />
        <Route path="guide" element={<Guide />} />
        <Route path="api" element={<API />} />
        <Route path="results" element={<Results />} />
        <Route path="results/:bot1-vs-:bot2" element={<Matchup />} />
        <Route path="results/:bot1-vs-:bot2/game/:gameId" element={<GameReplay />} />
        <Route path="results/grandprix/game/:gameId" element={<GameReplay />} />
      </Route>
    </Routes>
  );
}
