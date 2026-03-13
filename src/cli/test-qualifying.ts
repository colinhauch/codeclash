/**
 * Qualifying: round-robin 1v1 matches, run sequentially.
 *
 * Usage:
 *   bun run qualifying
 *   bun run qualifying --log   # writes /tmp/qualifying-<id>.log
 *
 * Requires: bun run dev already running on :5173
 */

import conservative from "../../submissions/conservative";
import aggressive from "../../submissions/aggressive";
import random from "../../submissions/random";
import { writeFileSync } from "fs";
import type { VisibleGameState, MoveAction, MatchConfig } from "../protocol/messages";

const SERVER = "http://localhost:5173";
const WS_SERVER = "ws://localhost:5173";
const TOURNAMENT = "qualifying-" + Date.now();
const GAMES = 10;
const LOG_ENABLED = process.argv.includes("--log");

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  gray: "\x1b[90m",
  magenta: "\x1b[35m",
  dim: "\x1b[2m",
};

const BOTS: Record<string, typeof conservative> = { conservative, aggressive, random };

const PLAYER_CONFIGS = [
  { name: "Conservative", botName: "conservative", color: c.cyan },
  { name: "Aggressive",   botName: "aggressive",   color: c.yellow },
  { name: "Random",       botName: "random",        color: c.magenta },
];

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------
type LogEntry =
  | { kind: "round_start"; round: number; startingPlayer: string }
  | { kind: "draw"; player: string; card: string }
  | { kind: "stand"; player: string; score: number }
  | { kind: "bust"; player: string; duplicateValue: number }
  | { kind: "flip7"; player: string }
  | { kind: "round_end"; round: number; scores: Record<string, { roundScore: number; totalScore: number }> }
  | { kind: "match_header"; p1: string; p2: string }
  | { kind: "game_end"; gameNumber: number; winner: string | null; finalScores: Record<string, number> };

const logEntries: LogEntry[] = [];

function cardStr(card: Record<string, unknown>): string {
  if (card.type === "number") return `#${card.value}`;
  if (card.type === "modifier") return `mod(${card.modifier})`;
  return `action(${card.action})`;
}

function recordEvent(event: Record<string, unknown>, playerNames: Record<string, string>) {
  const name = (id: string) => playerNames[id] ?? id;
  switch (event.type) {
    case "round_start":
      logEntries.push({ kind: "round_start", round: event.round as number, startingPlayer: name(event.startingPlayerId as string) });
      break;
    case "card_drawn":
      logEntries.push({ kind: "draw", player: name(event.playerId as string), card: cardStr(event.card as Record<string, unknown>) });
      break;
    case "stand":
      logEntries.push({ kind: "stand", player: name(event.playerId as string), score: event.roundScore as number });
      break;
    case "bust":
      logEntries.push({ kind: "bust", player: name(event.playerId as string), duplicateValue: event.duplicateValue as number });
      break;
    case "flip7":
      logEntries.push({ kind: "flip7", player: name(event.playerId as string) });
      break;
    case "round_end":
      logEntries.push({ kind: "round_end", round: event.round as number, scores: event.scores as Record<string, { roundScore: number; totalScore: number }> });
      break;
  }
}

function writeLog(tournamentId: string) {
  const lines: string[] = [
    `CodeClash Qualifying Log`,
    `Tournament: ${tournamentId}`,
    `Date: ${new Date().toISOString()}`,
    "",
  ];
  for (const e of logEntries) {
    switch (e.kind) {
      case "match_header":
        lines.push("═".repeat(50));
        lines.push(`MATCH: ${e.p1} vs ${e.p2}`);
        lines.push("═".repeat(50));
        break;
      case "round_start":
        lines.push(`  Round ${e.round}  (starts: ${e.startingPlayer})`);
        break;
      case "draw":
        lines.push(`    drew ${e.card.padEnd(12)}  ${e.player}`);
        break;
      case "stand":
        lines.push(`    STAND            ${e.player}  round_score=${e.score}`);
        break;
      case "bust":
        lines.push(`    BUST (dup=${e.duplicateValue})      ${e.player}`);
        break;
      case "flip7":
        lines.push(`    FLIP 7!           ${e.player}  (+15 bonus)`);
        break;
      case "round_end": {
        lines.push(`  Round ${e.round} end:`);
        for (const [id, s] of Object.entries(e.scores))
          lines.push(`    ${id.padEnd(16)} +${s.roundScore}  total=${s.totalScore}`);
        break;
      }
      case "game_end": {
        lines.push(`  ─ Game ${e.gameNumber}: winner=${e.winner ?? "draw"}`);
        for (const [name, s] of Object.entries(e.finalScores))
          lines.push(`    ${name.padEnd(16)} ${s}`);
        break;
      }
    }
  }
  const path = `/tmp/qualifying-${tournamentId.slice(-12)}.log`;
  writeFileSync(path, lines.join("\n") + "\n");
  console.log(`\n${c.gray}Log written to ${path}${c.reset}`);
}

// ---------------------------------------------------------------------------
// Bot runner
// ---------------------------------------------------------------------------
function runBot(botName: string, state: VisibleGameState, myId: string, legalMoves: MoveAction[]): MoveAction {
  const fakeDeck = Array(state.deckSize).fill({ type: "number", value: 0 } as const);
  const fakeFullState = {
    ...state,
    deck: fakeDeck,
    roundStartPlayerIndex: 0,
  } as unknown as Parameters<typeof conservative.bot>[0];
  const bot = BOTS[botName]?.bot ?? conservative.bot;
  const move = bot(fakeFullState, myId);
  return legalMoves.includes(move.action) ? move.action : legalMoves[0];
}

// ---------------------------------------------------------------------------
// Run one match between two players
// ---------------------------------------------------------------------------
async function runMatch(
  p1: { name: string; botName: string; color: string },
  p2: { name: string; botName: string; color: string },
): Promise<{ p1Wins: number; p2Wins: number; gamesPlayed: number; avgRounds: number }> {
  // Assign IDs client-side
  const ids = { [p1.name]: crypto.randomUUID(), [p2.name]: crypto.randomUUID() };
  const playerNames: Record<string, string> = {
    [ids[p1.name]]: p1.name,
    [ids[p2.name]]: p2.name,
  };

  const config: MatchConfig = {
    matchId: crypto.randomUUID(),
    tournamentId: TOURNAMENT,
    phase: "qualifying",
    playerIds: [ids[p1.name], ids[p2.name]],
    playerNames,
    totalGames: GAMES,
    moveTimeoutMs: 30000,
    mode: "practice",
  };

  const createRes = await fetch(`${SERVER}/api/match/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!createRes.ok) throw new Error(`Failed to create match: ${await createRes.text()}`);
  const { matchId } = await createRes.json() as { matchId: string };

  if (LOG_ENABLED) logEntries.push({ kind: "match_header", p1: p1.name, p2: p2.name });

  const connectPlayer = (
    cfg: { name: string; botName: string; color: string },
    isPrimary: boolean,
  ): Promise<Record<string, unknown>> => new Promise((resolve, reject) => {
    const playerId = ids[cfg.name];
    const ws = new WebSocket(`${WS_SERVER}/ws/match/${matchId}`);
    ws.onopen = () => ws.send(JSON.stringify({ type: "identify", playerId, name: cfg.name }));
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data as string);
      switch (msg.type) {
        case "your_turn": {
          const state = msg.state as VisibleGameState;
          const legalMoves = msg.legalMoves as MoveAction[];
          ws.send(JSON.stringify({ type: "move", action: runBot(cfg.botName, state, playerId, legalMoves) }));
          break;
        }
        case "game_event":
          if (isPrimary && LOG_ENABLED) recordEvent(msg.event as Record<string, unknown>, playerNames);
          break;
        case "game_complete":
          if (isPrimary) {
            const gameNumber = msg.gameNumber as number;
            const scores = msg.scores as Record<string, number>;
            const winnerId = msg.winner as string | null;
            const winnerName = winnerId ? (playerNames[winnerId] ?? winnerId) : null;
            if (LOG_ENABLED) {
              logEntries.push({
                kind: "game_end",
                gameNumber,
                winner: winnerName,
                finalScores: Object.fromEntries(
                  Object.entries(scores).map(([id, s]) => [playerNames[id] ?? id, s])
                ),
              });
            }
            const winColor = winnerName === p1.name ? p1.color : winnerName === p2.name ? p2.color : c.gray;
            const scoreStr = [p1, p2]
              .map((p) => `${p.color}${p.name}${c.reset} ${scores[ids[p.name]] ?? 0}`)
              .join("  ");
            console.log(`  Game ${String(gameNumber).padStart(2)}  ${scoreStr}  → ${winColor}${c.bold}${winnerName ?? "draw"}${c.reset}`);
          }
          break;
        case "match_complete":
          ws.close();
          resolve(msg.summary as Record<string, unknown>);
          break;
        case "error":
          reject(new Error(msg.message as string));
          break;
      }
    };
    ws.onerror = (err) => reject(err);
    ws.onclose = (ev) => {
      if (ev.code !== 1000 && ev.code !== 1005)
        reject(new Error(`WebSocket closed unexpectedly: ${ev.code} ${ev.reason}`));
    };
  });

  const [summary] = await Promise.all([
    connectPlayer(p1, true),
    connectPlayer(p2, false),
  ]);

  const players = summary.players as Array<{ name: string; wins: number }>;
  const p1Result = players.find((p) => p.name === p1.name)!;
  const p2Result = players.find((p) => p.name === p2.name)!;
  return {
    p1Wins: p1Result.wins,
    p2Wins: p2Result.wins,
    gamesPlayed: summary.games_played as number,
    avgRounds: summary.avg_rounds as number,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  try {
    const r = await fetch(`${SERVER}/api/tournament/current`);
    if (!r.ok && r.status !== 404) throw new Error(`Unexpected status ${r.status}`);
  } catch {
    console.error("Dev server not reachable at", SERVER, "— run `bun run dev` first");
    process.exit(1);
  }

  const playerList = PLAYER_CONFIGS.map((p) => `${p.color}${c.bold}${p.name}${c.reset}`).join("  ");
  console.log(`\n${c.bold}${c.cyan}=== CodeClash Qualifying ===${c.reset}`);
  console.log(`${playerList}  (${GAMES} games/match)\n`);

  // Generate all pairs
  const matchups: [typeof PLAYER_CONFIGS[0], typeof PLAYER_CONFIGS[0]][] = [];
  for (let i = 0; i < PLAYER_CONFIGS.length; i++)
    for (let j = i + 1; j < PLAYER_CONFIGS.length; j++)
      matchups.push([PLAYER_CONFIGS[i], PLAYER_CONFIGS[j]]);

  // Track per-player wins across all matchups
  const stats: Map<string, { matchWins: number; gameWins: number; gameLosses: number }> = new Map(
    PLAYER_CONFIGS.map((p) => [p.name, { matchWins: 0, gameWins: 0, gameLosses: 0 }])
  );

  const matchResults: Array<{ p1: typeof PLAYER_CONFIGS[0]; p2: typeof PLAYER_CONFIGS[0]; p1Wins: number; p2Wins: number }> = [];

  // Run matchups sequentially
  for (let i = 0; i < matchups.length; i++) {
    const [p1, p2] = matchups[i];
    console.log(`${c.bold}Match ${i + 1}/${matchups.length}:${c.reset}  ${p1.color}${c.bold}${p1.name}${c.reset}  vs  ${p2.color}${c.bold}${p2.name}${c.reset}`);
    console.log(c.dim + "─".repeat(48) + c.reset);

    const result = await runMatch(p1, p2);

    matchResults.push({ p1, p2, p1Wins: result.p1Wins, p2Wins: result.p2Wins });

    const matchWinner = result.p1Wins > result.p2Wins ? p1 : result.p2Wins > result.p1Wins ? p2 : null;
    const s1 = stats.get(p1.name)!;
    const s2 = stats.get(p2.name)!;
    s1.gameWins += result.p1Wins;
    s1.gameLosses += result.p2Wins;
    s2.gameWins += result.p2Wins;
    s2.gameLosses += result.p1Wins;
    if (matchWinner) stats.get(matchWinner.name)!.matchWins++;

    const p1Color = result.p1Wins > result.p2Wins ? p1.color : c.gray;
    const p2Color = result.p2Wins > result.p1Wins ? p2.color : c.gray;
    console.log(`\n  Result:  ${p1Color}${c.bold}${p1.name} ${result.p1Wins}${c.reset}  –  ${p2Color}${c.bold}${result.p2Wins} ${p2.name}${c.reset}  ${c.gray}(avg ${result.avgRounds.toFixed(1)} rounds/game)${c.reset}`);
    console.log();
  }

  // Final summary
  console.log(`${c.bold}Qualifying Results${c.reset}`);
  console.log("═".repeat(56));

  // Per-matchup table
  for (const { p1, p2, p1Wins, p2Wins } of matchResults) {
    const winner = p1Wins > p2Wins ? p1 : p2Wins > p1Wins ? p2 : null;
    const winColor = winner?.color ?? c.gray;
    console.log(
      `  ${p1.color}${p1.name.padEnd(14)}${c.reset} ${String(p1Wins).padStart(2)}–${String(p2Wins).padEnd(2)}  ${p2.color}${p2.name.padEnd(14)}${c.reset}` +
      `  ${winColor}${c.bold}${winner ? `${winner.name} wins` : "draw"}${c.reset}`
    );
  }

  console.log();
  console.log(`${"Player".padEnd(16)} ${"Match W".padStart(7)} ${"Game W".padStart(7)} ${"Game L".padStart(7)} ${"Win%".padStart(6)}`);
  console.log("─".repeat(48));

  const standings = [...stats.entries()]
    .map(([name, s]) => ({ name, ...s, winPct: (s.gameWins + s.gameLosses) > 0 ? s.gameWins / (s.gameWins + s.gameLosses) : 0 }))
    .sort((a, b) => b.matchWins - a.matchWins || b.gameWins - a.gameWins);

  for (const p of standings) {
    const cfg = PLAYER_CONFIGS.find((x) => x.name === p.name)!;
    const winPct = (p.winPct * 100).toFixed(0) + "%";
    console.log(
      `${cfg.color}${c.bold}${p.name.padEnd(16)}${c.reset}` +
      ` ${String(p.matchWins).padStart(7)} ${String(p.gameWins).padStart(7)} ${String(p.gameLosses).padStart(7)} ${winPct.padStart(6)}`
    );
  }

  if (LOG_ENABLED) writeLog(TOURNAMENT);
  console.log();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
