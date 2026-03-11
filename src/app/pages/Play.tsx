/**
 * Play Page — Interactive in-browser Flip 7 game
 *
 * Spreadsheet-style layout: each row = a player, each column = a card slot.
 * Human player can click Draw / Stand on their turn. Bots play automatically.
 */

import { useState, useEffect, useRef } from "react";
import type { GameState, Bot, NumberCard, ModifierCard } from "../../game/types";
import { createInitialState, applyMove, endRound, getLegalMoves } from "../../game/engine";

// ─── Inline bot definitions (no dynamic import needed in-browser) ──────────────

const randomBot: Bot = (state, _myId) => {
  const legal = getLegalMoves(state);
  const action = legal[Math.floor(Math.random() * legal.length)];
  return { action };
};

const conservativeBot: Bot = (state, myId) => {
  const me = state.players.find((p) => p.id === myId)!;
  if (me.roundScore >= 50) return { action: "stand" };
  const unique = new Set(me.numberCards.map((c) => c.value)).size;
  if (unique >= 4) return { action: "stand" };
  const legal = getLegalMoves(state);
  if (legal.includes("draw")) return { action: "draw" };
  return { action: "stand" };
};

const aggressiveBot: Bot = (state, myId) => {
  const me = state.players.find((p) => p.id === myId)!;
  const unique = new Set(me.numberCards.map((c) => c.value)).size;
  // Only stand when very close to 200 or at 6 unique cards (conservative fallback)
  if (me.totalScore + me.roundScore >= 180 && me.roundScore >= 30) return { action: "stand" };
  if (unique >= 6 && me.roundScore >= 70) return { action: "stand" };
  const legal = getLegalMoves(state);
  if (legal.includes("draw")) return { action: "draw" };
  return { action: "stand" };
};

type BotSlot = {
  id: string;
  name: string;
  bot: Bot | null; // null = human
};

const BOT_OPTIONS: Array<{ id: string; name: string; bot: Bot | null }> = [
  { id: "human", name: "Human (You)", bot: null },
  { id: "random", name: "Random Bot", bot: randomBot },
  { id: "conservative", name: "Conservative Bot", bot: conservativeBot },
  { id: "aggressive", name: "Aggressive Bot", bot: aggressiveBot },
];

const PLAYER_COUNT_OPTIONS = [2, 3, 4];

type GamePhase = "setup" | "playing" | "round_ending" | "round_over" | "game_over";

type LogEntry = {
  id: number;
  text: string;
  type: "info" | "draw" | "stand" | "bust" | "flip7" | "win" | "round";
};

// ─── Modifier display label ────────────────────────────────────────────────────

function modifierLabel(card: ModifierCard): string {
  return card.modifier;
}

// ─── Number card display ───────────────────────────────────────────────────────

function NumberCardCell({ card, busted, duplicateValue }: { card: NumberCard | null; busted: boolean; duplicateValue?: number }) {
  if (!card) {
    return (
      <div className="number-card-slot empty">
        <span className="slot-dash">—</span>
      </div>
    );
  }
  const isDuplicate = busted && duplicateValue !== undefined && card.value === duplicateValue;
  return (
    <div className={`number-card-slot filled${busted ? " busted-card" : ""}${isDuplicate ? " duplicate-card" : ""}`}>
      <span className="card-value">{card.value}</span>
    </div>
  );
}

// ─── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ player }: { player: GameState["players"][0] }) {
  if (player.busted) {
    return <span className="status-chip status-bust">BUST</span>;
  }
  if (!player.isActive) {
    return <span className="status-chip status-stood">STOOD</span>;
  }
  return <span className="status-chip status-active">ACTIVE</span>;
}

// ─── Main Play page ───────────────────────────────────────────────────────────

export default function Play() {
  // Setup state
  const [playerCount, setPlayerCount] = useState(2);
  const [slots, setSlots] = useState<BotSlot[]>([
    { id: "player-0", name: "Human (You)", bot: null },
    { id: "player-1", name: "Random Bot", bot: randomBot },
  ]);

  // Game state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [log, setLog] = useState<LogEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);
  const [roundSummary, setRoundSummary] = useState<Array<{ id: string; roundScore: number; totalScore: number }>>([]);
  // Track duplicate card value per busted player for UI highlighting
  const [bustDuplicates, setBustDuplicates] = useState<Record<string, number>>({});

  function addLog(text: string, type: LogEntry["type"] = "info") {
    logIdRef.current += 1;
    const entry = { id: logIdRef.current, text, type };
    setLog((prev) => [...prev.slice(-60), entry]);
  }

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  // ─── Setup helpers ────────────────────────────────────────────────────────

  function changePlayerCount(count: number) {
    setPlayerCount(count);
    setSlots((prev) => {
      const next = [...prev];
      while (next.length < count) {
        const idx = next.length;
        const defaultBot = BOT_OPTIONS[1]; // random
        next.push({ id: `player-${idx}`, name: defaultBot.name, bot: defaultBot.bot });
      }
      return next.slice(0, count);
    });
  }

  function changeSlotBot(slotIdx: number, botId: string) {
    const option = BOT_OPTIONS.find((o) => o.id === botId) ?? BOT_OPTIONS[0];
    setSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = { ...next[slotIdx], name: option.name, bot: option.bot };
      return next;
    });
  }

  // ─── Move application (pure — no setState, returns new state + logs) ─────────

  function applyAndLog(state: GameState, action: "draw" | "stand", playerName: string): GameState {
    const { state: next, events } = applyMove(state, { action });
    for (const ev of events) {
      if (ev.type === "stand") {
        const p = next.players.find((x) => x.id === ev.playerId)!;
        addLog(`${playerName} stands with ${p.roundScore} pts this round.`, "stand");
      } else if (ev.type === "card_drawn") {
        const card = ev.card;
        const label =
          card.type === "number" ? `#${card.value}` :
          card.type === "modifier" ? card.modifier :
          card.action;
        addLog(`${playerName} draws ${label}.`, "draw");
      } else if (ev.type === "bust") {
        addLog(`${playerName} BUSTS! Duplicate #${ev.duplicateValue}. 0 pts.`, "bust");
        setBustDuplicates((prev) => ({ ...prev, [ev.playerId]: ev.duplicateValue }));
      } else if (ev.type === "flip7") {
        addLog(`${playerName} hits FLIP 7! +15 bonus! Round ends!`, "flip7");
      } else if (ev.type === "deck_reshuffled") {
        addLog(`Deck empty — reshuffling discard pile (${ev.cardsFromDiscard} cards).`, "info");
      } else if (ev.type === "mid_round_win") {
        addLog(`${playerName} reaches ${ev.totalScore} pts — wins!`, "win");
      }
    }
    return next;
  }

  // ─── Round-end ───────────────────────────────────────────────────────────────

  function finishRound(state: GameState) {
    // Capture per-player round scores before endRound resets them
    const summary = state.players.map((p) => ({
      id: p.id,
      roundScore: p.busted ? 0 : p.roundScore,
      totalScore: p.totalScore + (p.busted ? 0 : p.roundScore),
    }));
    setRoundSummary(summary);

    const { state: next } = endRound(state);

    if (next.gameOver) {
      setGameState(next);
      setPhase("game_over");
      const winner = next.winner
        ? slots.find((s) => s.id === next.winner)?.name ?? next.winner
        : "Nobody";
      addLog(`GAME OVER — ${winner} wins!`, "win");
    } else {
      setGameState(next);
      setPhase("round_over");
      addLog(`Round ${state.round} complete. Round ${next.round} up next.`, "round");
    }
  }

  // ─── Game start / reset ───────────────────────────────────────────────────

  function startGame() {
    const playerIds = slots.map((s) => s.id);
    const state = createInitialState(playerIds);
    setGameState(state);
    setPhase("playing");
    setLog([]);
    logIdRef.current = 0;
    addLog(`Game started — first to 200 wins!`, "round");
    addLog(`Round 1 begins. ${slots[state.roundStartPlayerIndex].name} goes first.`, "round");
  }

  function resetGame() {
    setGameState(null);
    setPhase("setup");
    setLog([]);
    setRoundSummary([]);
    setBustDuplicates({});
  }

  // ─── Bot step (manual) ────────────────────────────────────────────────────

  function stepBot() {
    if (!gameState || phase !== "playing") return;
    if (gameState.roundOver || gameState.gameOver) return;

    const currentSlot = slots[gameState.currentPlayerIndex];
    if (!currentSlot || currentSlot.bot === null) return; // human's turn

    const action = currentSlot.bot(gameState, currentSlot.id).action;
    const next = applyAndLog(gameState, action, currentSlot.name);

    if (next.roundOver || next.gameOver) {
      setGameState(next);
      setPhase("round_ending");
      addLog("Round over — click End Round to see scores.", "round");
    } else {
      setGameState(next);
    }
  }

  // ─── Human actions ────────────────────────────────────────────────────────

  function humanMove(action: "draw" | "stand") {
    if (!gameState || phase !== "playing") return;
    if (gameState.roundOver || gameState.gameOver) return;

    const currentSlot = slots[gameState.currentPlayerIndex];
    if (!currentSlot || currentSlot.bot !== null) return; // bot's turn

    const next = applyAndLog(gameState, action, currentSlot.name);
    if (next.roundOver || next.gameOver) {
      setGameState(next);
      setPhase("round_ending");
      addLog("Round over — click End Round to see scores.", "round");
    } else {
      setGameState(next);
    }
  }

  function endRoundManually() {
    if (!gameState || phase !== "round_ending") return;
    finishRound(gameState);
  }

  function continueNextRound() {
    if (!gameState) return;
    setPhase("playing");
    setRoundSummary([]);
    setBustDuplicates({});
  }

  // ─── Derived display helpers ───────────────────────────────────────────────

  const currentPlayerId = gameState?.players[gameState.currentPlayerIndex]?.id;
  const currentSlot = gameState ? slots[gameState.currentPlayerIndex] : null;
  const isHumanTurn = phase === "playing" && currentSlot?.bot === null && !gameState?.roundOver;
  const isBotTurn = phase === "playing" && currentSlot?.bot !== null && !gameState?.roundOver;
  const isRoundEnding = phase === "round_ending";
  const legalMoves = gameState ? getLegalMoves(gameState) : [];
  const canDraw = legalMoves.includes("draw");

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="play-page container-max">
      <style>{`
        /* ── Play Page Styles ─────────────────────────────────────── */

        .play-page {
          padding: 2rem 1rem 4rem;
          min-height: 80vh;
        }

        .play-header {
          margin-bottom: 2rem;
        }

        .play-title {
          font-family: 'Playfair Display', serif;
          font-size: 2.5rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          background: linear-gradient(135deg, #d4af37 0%, #00d9ff 50%, #d4af37 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 0.5rem;
          line-height: 1.1;
        }

        .play-subtitle {
          font-family: 'Space Mono', monospace;
          font-size: 0.8rem;
          color: #6b7684;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        /* ── Setup Panel ──────────────────────────────────────────── */

        .setup-panel {
          background: linear-gradient(135deg, #1a1f3a 0%, #252d47 100%);
          border: 1px solid #2d3748;
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
          position: relative;
          overflow: hidden;
        }

        .setup-panel::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, #d4af37, #00d9ff, #d4af37);
        }

        .setup-section-title {
          font-family: 'Cinzel', serif;
          font-size: 0.75rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #d4af37;
          margin-bottom: 1rem;
        }

        .player-count-btns {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .count-btn {
          font-family: 'Space Mono', monospace;
          font-size: 0.875rem;
          font-weight: 700;
          padding: 0.5rem 1.25rem;
          border-radius: 8px;
          border: 1px solid #2d3748;
          background: #0a0e27;
          color: #b3bcc5;
          cursor: pointer;
          transition: all 0.2s;
        }

        .count-btn:hover {
          border-color: #00d9ff;
          color: #00d9ff;
        }

        .count-btn.active {
          background: rgba(0, 217, 255, 0.15);
          border-color: #00d9ff;
          color: #00d9ff;
          box-shadow: 0 0 12px rgba(0, 217, 255, 0.25);
        }

        .player-setup-grid {
          display: grid;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .player-setup-row {
          display: grid;
          grid-template-columns: 120px 1fr;
          align-items: center;
          gap: 1rem;
        }

        .player-label {
          font-family: 'Space Mono', monospace;
          font-size: 0.75rem;
          color: #6b7684;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .bot-select {
          background: #0a0e27;
          border: 1px solid #2d3748;
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          color: #f5f7fa;
          font-family: 'Space Mono', monospace;
          font-size: 0.8rem;
          cursor: pointer;
          width: 100%;
          transition: border-color 0.2s;
        }

        .bot-select:focus {
          outline: none;
          border-color: #00d9ff;
        }

        .start-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 2rem;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #00d9ff, #0099cc);
          color: #0a0e27;
          font-family: 'Cinzel', serif;
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.25s;
          text-transform: uppercase;
        }

        .start-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(0, 217, 255, 0.4);
        }

        /* ── Game Arena ───────────────────────────────────────────── */

        .game-arena {
          display: grid;
          grid-template-rows: auto 1fr auto;
          gap: 1.5rem;
        }

        .game-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .game-meta {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .meta-chip {
          font-family: 'Space Mono', monospace;
          font-size: 0.75rem;
          color: #b3bcc5;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .meta-chip-value {
          color: #d4af37;
          font-weight: 700;
        }

        .reset-btn {
          font-family: 'Space Mono', monospace;
          font-size: 0.75rem;
          padding: 0.4rem 1rem;
          border-radius: 6px;
          border: 1px solid #2d3748;
          background: transparent;
          color: #6b7684;
          cursor: pointer;
          transition: all 0.2s;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .reset-btn:hover {
          border-color: #ef476f;
          color: #ef476f;
        }

        /* ── Spreadsheet Table ────────────────────────────────────── */

        .spreadsheet-wrapper {
          overflow-x: auto;
        }

        .spreadsheet {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-family: 'Space Mono', monospace;
          min-width: 700px;
        }

        /* Header row */
        .spreadsheet thead th {
          font-size: 0.65rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #6b7684;
          padding: 0.5rem 0.5rem;
          border-bottom: 1px solid #2d3748;
          text-align: center;
          font-weight: 400;
          white-space: nowrap;
          background: #0a0e27;
        }

        .spreadsheet thead th.col-player {
          text-align: left;
          padding-left: 1rem;
          width: 160px;
        }

        .spreadsheet thead th.col-mod {
          color: #b87333;
        }

        .spreadsheet thead th.col-score {
          color: #d4af37;
        }

        /* Body rows */
        .spreadsheet tbody tr {
          transition: background 0.2s;
        }

        .spreadsheet tbody tr.row-current {
          background: rgba(0, 217, 255, 0.04);
        }

        .spreadsheet tbody tr.row-busted {
          opacity: 0.6;
        }

        .spreadsheet tbody td {
          padding: 0.6rem 0.2rem;
          border-bottom: 1px solid rgba(45, 55, 72, 0.5);
          vertical-align: middle;
          text-align: center;
        }

        .spreadsheet tbody td.col-player {
          text-align: left;
          padding-left: 1rem;
        }

        /* Player name cell */
        .player-name-cell {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .current-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #00d9ff;
          box-shadow: 0 0 8px #00d9ff;
          flex-shrink: 0;
          animation: pulse-dot 1s ease-in-out infinite alternate;
        }

        @keyframes pulse-dot {
          from { opacity: 0.5; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1.2); }
        }

        .inactive-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #2d3748;
          flex-shrink: 0;
        }

        .player-name-text {
          font-size: 0.82rem;
          font-weight: 700;
          color: #f5f7fa;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 120px;
        }

        .player-name-text.is-human {
          color: #00d9ff;
        }

        /* Number card slots */
        .number-card-slot {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 44px;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 700;
          position: relative;
          transition: all 0.2s;
        }

        .number-card-slot.empty {
          background: rgba(45, 55, 72, 0.3);
          border: 1px dashed #2d3748;
        }

        .number-card-slot.empty .slot-dash {
          color: #2d3748;
          font-size: 0.75rem;
        }

        .number-card-slot.filled {
          background: linear-gradient(135deg, #1a1f3a, #252d47);
          border: 1px solid rgba(212, 175, 55, 0.4);
          color: #d4af37;
          box-shadow: 0 0 8px rgba(212, 175, 55, 0.15);
          animation: card-appear 0.25s ease-out;
        }

        .number-card-slot.filled.busted-card {
          border-color: rgba(239, 71, 111, 0.25);
          color: #6b7684;
          box-shadow: none;
          opacity: 0.5;
        }

        .number-card-slot.filled.duplicate-card {
          border-color: rgba(239, 71, 111, 0.8);
          color: #ef476f;
          box-shadow: 0 0 10px rgba(239, 71, 111, 0.4);
          opacity: 1;
        }

        @keyframes card-appear {
          from { transform: scale(0.7) translateY(-4px); opacity: 0; }
          to   { transform: scale(1) translateY(0);     opacity: 1; }
        }

        .card-value {
          font-size: 0.85rem;
          line-height: 1;
        }

        /* Modifier cell */
        .modifier-cell {
          display: flex;
          flex-wrap: wrap;
          gap: 3px;
          justify-content: center;
          align-items: center;
          min-width: 70px;
        }

        .modifier-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.65rem;
          font-weight: 700;
          background: rgba(184, 115, 51, 0.2);
          border: 1px solid rgba(184, 115, 51, 0.5);
          color: #b87333;
          white-space: nowrap;
        }

        /* Score cells */
        .round-score {
          font-size: 0.9rem;
          font-weight: 700;
          color: #d4af37;
          min-width: 50px;
        }

        .total-score {
          font-size: 0.95rem;
          font-weight: 700;
          color: #f5f7fa;
          min-width: 55px;
        }

        .total-score.winning {
          color: #06d6a0;
        }

        /* Status cell */
        .status-chip {
          font-family: 'Cinzel', serif;
          font-size: 0.6rem;
          letter-spacing: 0.1em;
          padding: 3px 8px;
          border-radius: 20px;
          font-weight: 700;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .status-active {
          background: rgba(0, 217, 255, 0.1);
          border: 1px solid rgba(0, 217, 255, 0.4);
          color: #00d9ff;
        }

        .status-stood {
          background: rgba(6, 214, 160, 0.1);
          border: 1px solid rgba(6, 214, 160, 0.4);
          color: #06d6a0;
        }

        .status-bust {
          background: rgba(239, 71, 111, 0.1);
          border: 1px solid rgba(239, 71, 111, 0.4);
          color: #ef476f;
        }

        /* ── Human Action Row ─────────────────────────────────────── */

        .action-bar {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: linear-gradient(135deg, #1a1f3a 0%, #252d47 100%);
          border: 1px solid #2d3748;
          border-radius: 10px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s;
        }

        .action-bar.your-turn {
          border-color: rgba(0, 217, 255, 0.5);
          box-shadow: 0 0 20px rgba(0, 217, 255, 0.12);
        }

        .action-bar::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #00d9ff, transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .action-bar.your-turn::before {
          opacity: 1;
        }

        .action-bar.bot-turn {
          border-color: rgba(212, 175, 55, 0.4);
          box-shadow: 0 0 20px rgba(212, 175, 55, 0.08);
        }

        .action-bar.bot-turn::before {
          background: linear-gradient(90deg, transparent, #d4af37, transparent);
          opacity: 1;
        }

        .bot-turn-label {
          flex: 1;
          font-family: 'Cinzel', serif;
          font-size: 0.7rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #d4af37;
        }

        .step-btn {
          background: linear-gradient(135deg, #d4af37, #b8942c);
          color: #0a0e27;
        }

        .step-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(212, 175, 55, 0.4);
        }

        .action-bar.round-ending {
          border-color: rgba(6, 214, 160, 0.4);
          box-shadow: 0 0 20px rgba(6, 214, 160, 0.08);
        }

        .action-bar.round-ending::before {
          background: linear-gradient(90deg, transparent, #06d6a0, transparent);
          opacity: 1;
        }

        .round-ending-label {
          flex: 1;
          font-family: 'Cinzel', serif;
          font-size: 0.7rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #06d6a0;
        }

        .end-round-btn {
          background: linear-gradient(135deg, #06d6a0, #059b74);
          color: #0a0e27;
        }

        .end-round-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(6, 214, 160, 0.4);
        }

        .action-label {
          font-family: 'Cinzel', serif;
          font-size: 0.7rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #6b7684;
          flex: 1;
          white-space: nowrap;
        }

        .action-label.your-turn {
          color: #00d9ff;
        }

        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.55rem 1.25rem;
          border-radius: 8px;
          border: none;
          font-family: 'Cinzel', serif;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }

        .draw-btn {
          background: linear-gradient(135deg, #d4af37, #b8942c);
          color: #0a0e27;
        }

        .draw-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(212, 175, 55, 0.4);
        }

        .stand-btn {
          background: linear-gradient(135deg, #00d9ff, #0099cc);
          color: #0a0e27;
        }

        .stand-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 217, 255, 0.4);
        }

        /* ── Event Log ────────────────────────────────────────────── */

        .event-log {
          background: #0a0e27;
          border: 1px solid #2d3748;
          border-radius: 10px;
          padding: 0.75rem;
          height: 140px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #2d3748 transparent;
        }

        .event-log::-webkit-scrollbar {
          width: 4px;
        }

        .event-log::-webkit-scrollbar-track {
          background: transparent;
        }

        .event-log::-webkit-scrollbar-thumb {
          background: #2d3748;
          border-radius: 2px;
        }

        .log-entry {
          font-family: 'Space Mono', monospace;
          font-size: 0.7rem;
          line-height: 1.6;
          padding: 1px 0;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .log-entry::before {
          content: '›';
          flex-shrink: 0;
          color: #2d3748;
        }

        .log-entry.info    { color: #6b7684; }
        .log-entry.draw    { color: #b3bcc5; }
        .log-entry.stand   { color: #06d6a0; }
        .log-entry.bust    { color: #ef476f; }
        .log-entry.flip7   { color: #d4af37; }
        .log-entry.win     { color: #00d9ff; font-weight: 700; }
        .log-entry.round   { color: #d4af37; }

        /* ── Round Summary ────────────────────────────────────────── */

        .round-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 14, 39, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          animation: fade-in 0.3s ease;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .round-modal {
          background: linear-gradient(135deg, #1a1f3a, #252d47);
          border: 1px solid #d4af37;
          border-radius: 16px;
          padding: 2rem 2.5rem;
          min-width: 340px;
          max-width: 480px;
          width: 90%;
          position: relative;
          overflow: hidden;
          animation: slide-up 0.3s ease;
        }

        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .round-modal::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #d4af37, #00d9ff, #d4af37);
        }

        .modal-title {
          font-family: 'Cinzel', serif;
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #d4af37;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .score-table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'Space Mono', monospace;
          margin-bottom: 1.5rem;
        }

        .score-table th {
          font-size: 0.65rem;
          letter-spacing: 0.15em;
          color: #6b7684;
          text-transform: uppercase;
          padding: 0 0.5rem 0.75rem;
          text-align: right;
          font-weight: 400;
        }

        .score-table th:first-child { text-align: left; }

        .score-table td {
          padding: 0.5rem;
          font-size: 0.85rem;
          border-top: 1px solid rgba(45, 55, 72, 0.5);
        }

        .score-table td:first-child { color: #f5f7fa; text-align: left; }
        .score-table td:nth-child(2) { color: #d4af37; text-align: right; font-weight: 700; }
        .score-table td:nth-child(3) { color: #f5f7fa; text-align: right; font-weight: 700; }

        .score-table tr.winner-row td:first-child {
          color: #06d6a0;
        }

        .continue-btn {
          width: 100%;
          padding: 0.75rem;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #d4af37, #b8942c);
          color: #0a0e27;
          font-family: 'Cinzel', serif;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }

        .continue-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(212, 175, 55, 0.4);
        }

        /* ── Game Over ────────────────────────────────────────────── */

        .game-over-badge {
          text-align: center;
          padding: 0.5rem;
        }

        .game-over-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.8rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          background: linear-gradient(135deg, #d4af37, #00d9ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 0.5rem;
        }

        .game-over-winner {
          font-family: 'Space Mono', monospace;
          font-size: 0.85rem;
          color: #06d6a0;
          margin-bottom: 1.5rem;
        }

        .play-again-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1.75rem;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #06d6a0, #059b74);
          color: #0a0e27;
          font-family: 'Cinzel', serif;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }

        .play-again-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(6, 214, 160, 0.35);
        }

        /* ── Dividers & misc ──────────────────────────────────────── */

        .section-label {
          font-family: 'Cinzel', serif;
          font-size: 0.65rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #6b7684;
          margin-bottom: 0.5rem;
        }

        .flip7-flash {
          animation: flip7-glow 0.6s ease-in-out 3;
        }

        @keyframes flip7-glow {
          0%, 100% { box-shadow: none; }
          50% { box-shadow: 0 0 30px rgba(212, 175, 55, 0.6); }
        }
      `}</style>

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="play-header">
        <h1 className="play-title">Play</h1>
        <p className="play-subtitle">◆ Interactive Game Arena ◆</p>
      </div>

      {/* ── Setup Panel ─────────────────────────────────────────────── */}
      {phase === "setup" && (
        <div className="setup-panel">
          <p className="setup-section-title">◆ Configure Players ◆</p>

          {/* Player count */}
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={{ fontFamily: "Space Mono", fontSize: "0.7rem", color: "#6b7684", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
              Number of Players
            </p>
            <div className="player-count-btns">
              {PLAYER_COUNT_OPTIONS.map((n) => (
                <button
                  key={n}
                  className={`count-btn${playerCount === n ? " active" : ""}`}
                  onClick={() => changePlayerCount(n)}
                >
                  {n} Players
                </button>
              ))}
            </div>
          </div>

          {/* Per-player bot selection */}
          <div className="player-setup-grid">
            {slots.map((slot, i) => (
              <div key={slot.id} className="player-setup-row">
                <span className="player-label">Player {i + 1}</span>
                <select
                  className="bot-select"
                  value={slot.bot === null ? "human" : BOT_OPTIONS.find((o) => o.bot === slot.bot)?.id ?? "random"}
                  onChange={(e) => changeSlotBot(i, e.target.value)}
                >
                  {BOT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <button className="start-btn" onClick={startGame}>
            ▶ Start Game
          </button>
        </div>
      )}

      {/* ── Game Arena ──────────────────────────────────────────────── */}
      {gameState && phase !== "setup" && (
        <div className="game-arena">
          {/* Top bar */}
          <div className="game-top-bar">
            <div className="game-meta">
              <div className="meta-chip">
                Round <span className="meta-chip-value">{gameState.round}</span>
              </div>
              <div className="meta-chip">
                Deck <span className="meta-chip-value">{gameState.deck.length}</span>
              </div>
              <div className="meta-chip">
                Discard <span className="meta-chip-value">{gameState.discardPile.length}</span>
              </div>
            </div>
            <button className="reset-btn" onClick={resetGame}>
              ↺ New Setup
            </button>
          </div>

          {/* ── Spreadsheet ─────────────────────────────────────────── */}
          <div className="spreadsheet-wrapper">
            <table className="spreadsheet">
              <thead>
                <tr>
                  <th className="col-player">Player</th>
                  {/* 7 number card slots */}
                  {Array.from({ length: 7 }, (_, i) => (
                    <th key={i}>Card {i + 1}</th>
                  ))}
                  {/* Modifier column */}
                  <th className="col-mod">Modifiers</th>
                  {/* Scores */}
                  <th className="col-score">Rd Pts</th>
                  <th className="col-score">Total</th>
                  {/* Status */}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {gameState.players.map((player, pIdx) => {
                  const slot = slots[pIdx];
                  const isCurrent = player.id === currentPlayerId && !gameState.roundOver;
                  const isHuman = slot?.bot === null;
                  const hasFlip7 = player.numberCards.length === 7;

                  return (
                    <tr
                      key={player.id}
                      className={`${isCurrent ? "row-current" : ""} ${player.busted ? "row-busted" : ""} ${hasFlip7 ? "flip7-flash" : ""}`}
                    >
                      {/* Player name */}
                      <td className="col-player">
                        <div className="player-name-cell">
                          {isCurrent ? (
                            <div className="current-indicator" />
                          ) : (
                            <div className="inactive-dot" />
                          )}
                          <span className={`player-name-text${isHuman ? " is-human" : ""}`}>
                            {slot?.name ?? player.id}
                          </span>
                        </div>
                      </td>

                      {/* 7 number card slots */}
                      {Array.from({ length: 7 }, (_, i) => {
                        const card = player.numberCards[i] ?? null;
                        return (
                          <td key={i}>
                            <NumberCardCell
                              card={card}
                              busted={player.busted}
                              duplicateValue={bustDuplicates[player.id]}
                            />
                          </td>
                        );
                      })}

                      {/* Modifiers */}
                      <td>
                        <div className="modifier-cell">
                          {player.modifierCards.length === 0 ? (
                            <span style={{ color: "#2d3748", fontSize: "0.7rem" }}>—</span>
                          ) : (
                            player.modifierCards.map((m, mi) => (
                              <span key={mi} className="modifier-chip">
                                {modifierLabel(m)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Round score */}
                      <td>
                        <span className="round-score">
                          {player.busted ? (
                            <span style={{ color: "#ef476f" }}>0</span>
                          ) : (
                            player.roundScore
                          )}
                        </span>
                      </td>

                      {/* Total score */}
                      <td>
                        <span className={`total-score${player.totalScore >= 150 ? " winning" : ""}`}>
                          {player.totalScore}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <StatusChip player={player} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Action Bar ────────────────────────────────────────── */}
          {(phase === "playing" || phase === "round_ending") && (
            <div className={`action-bar${isHumanTurn ? " your-turn" : isBotTurn ? " bot-turn" : isRoundEnding ? " round-ending" : ""}`}>
              {isHumanTurn && (
                <>
                  <span className="action-label your-turn">◆ Your Turn ◆</span>
                  <button
                    className="action-btn stand-btn"
                    onClick={() => humanMove("stand")}
                  >
                    ✋ Stand
                  </button>
                  <button
                    className="action-btn draw-btn"
                    disabled={!canDraw}
                    onClick={() => humanMove("draw")}
                  >
                    ↓ Draw
                  </button>
                </>
              )}
              {isBotTurn && (
                <>
                  <span className="action-label bot-turn-label">
                    {currentSlot?.name}'s turn
                  </span>
                  <button className="action-btn step-btn" onClick={stepBot}>
                    ▶ Step Bot
                  </button>
                </>
              )}
              {isRoundEnding && (
                <>
                  <span className="action-label round-ending-label">◆ All players done ◆</span>
                  <button className="action-btn end-round-btn" onClick={endRoundManually}>
                    End Round →
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Game Over action bar (no human or all-bot) ─────────── */}
          {phase === "game_over" && (
            <div className="action-bar">
              <span className="action-label">Game complete</span>
              <button className="play-again-btn" onClick={resetGame}>
                ↺ New Game
              </button>
            </div>
          )}

          {/* ── Event Log ─────────────────────────────────────────── */}
          <div>
            <p className="section-label">◆ Event Log ◆</p>
            <div className="event-log" ref={logRef}>
              {log.length === 0 && (
                <div className="log-entry info">Game starting…</div>
              )}
              {log.map((entry) => (
                <div key={entry.id} className={`log-entry ${entry.type}`}>
                  {entry.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Round Over Modal ────────────────────────────────────────── */}
      {(phase === "round_over" || phase === "game_over") && gameState && (
        <div className="round-overlay">
          <div className="round-modal">
            {phase === "game_over" ? (
              <div className="game-over-badge">
                <div className="game-over-title">Game Over</div>
                <div className="game-over-winner">
                  {gameState.winner
                    ? `${slots.find((s) => s.id === gameState.winner)?.name ?? gameState.winner} wins!`
                    : "It's a draw!"}
                </div>
              </div>
            ) : (
              <p className="modal-title">◆ Round {gameState.round - 1} Complete ◆</p>
            )}

            <table className="score-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Round</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {gameState.players
                  .slice()
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .map((player) => {
                    const slot = slots.find((s) => s.id === player.id);
                    const summary = roundSummary.find((r) => r.id === player.id);
                    const roundPts = summary?.roundScore ?? 0;
                    const isWinner = phase === "game_over" && player.id === gameState.winner;
                    return (
                      <tr key={player.id} className={isWinner ? "winner-row" : ""}>
                        <td>{isWinner ? "🏆 " : ""}{slot?.name ?? player.id}</td>
                        <td>+{roundPts}</td>
                        <td>{player.totalScore}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>

            {phase === "round_over" ? (
              <button className="continue-btn" onClick={continueNextRound}>
                Next Round →
              </button>
            ) : (
              <button className="play-again-btn" style={{ width: "100%" }} onClick={resetGame}>
                ↺ Play Again
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
