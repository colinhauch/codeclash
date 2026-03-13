/**
 * Grand Prix test: N players all compete in a single match simultaneously.
 *
 * Usage:
 *   bun run src/cli/test-grand-prix.ts           # summary only
 *   bun run src/cli/test-grand-prix.ts --log     # + writes detailed move log to /tmp/gp-<id>.log
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
const TOURNAMENT = "grand-prix-" + Date.now();
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
};

const BOTS: Record<string, typeof conservative> = { conservative, aggressive, random };

const PLAYER_CONFIGS = [
  { name: "Conservative", botName: "conservative" },
  { name: "Aggressive",   botName: "aggressive" },
  { name: "Random",       botName: "random" },
];
const PLAYER_COLORS = [c.cyan, c.yellow, c.magenta];

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

function writeLog(playerNames: Record<string, string>, matchId: string) {
  const lines: string[] = [
    `CodeClash Grand Prix Log`,
    `Match ID: ${matchId}`,
    `Tournament: ${TOURNAMENT}`,
    `Date: ${new Date().toISOString()}`,
    `Players: ${Object.values(playerNames).join(" | ")}`,
    `Games: ${GAMES}`,
    "",
  ];

  for (const e of logEntries) {
    switch (e.kind) {
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
        for (const [id, s] of Object.entries(e.scores)) {
          lines.push(`    ${(playerNames[id] ?? id).padEnd(16)} +${s.roundScore}  total=${s.totalScore}`);
        }
        break;
      }
      case "game_end": {
        lines.push(`${"─".repeat(50)}`);
        lines.push(`Game ${e.gameNumber} result: winner=${e.winner ?? "draw"}`);
        for (const [id, s] of Object.entries(e.finalScores)) {
          lines.push(`  ${(playerNames[id] ?? id).padEnd(16)} ${s}`);
        }
        lines.push("");
        break;
      }
    }
  }

  const path = `/tmp/gp-${matchId.slice(0, 12)}.log`;
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

  // Assign player IDs client-side
  const players = PLAYER_CONFIGS.map((cfg) => ({
    ...cfg,
    playerId: crypto.randomUUID(),
  }));

  const playerNames: Record<string, string> = {};
  const colorMap: Record<string, string> = {};
  for (let i = 0; i < players.length; i++) {
    playerNames[players[i].playerId] = players[i].name;
    colorMap[players[i].name] = PLAYER_COLORS[i] ?? c.gray;
  }

  const playerNamesById: Record<string, string> = {};
  for (const p of players) playerNamesById[p.playerId] = p.name;

  console.log(`\n${c.bold}${c.cyan}=== CodeClash Grand Prix ===${c.reset}`);
  console.log(players.map((p, i) => `${PLAYER_COLORS[i] ?? ""}${c.bold}${p.name}${c.reset}`).join(" | ") + `  (${GAMES} games)${LOG_ENABLED ? `  ${c.gray}[logging]${c.reset}` : ""}\n`);

  // Configure the MatchDO directly via HTTP
  const config: MatchConfig = {
    matchId: crypto.randomUUID(),
    tournamentId: TOURNAMENT,
    phase: "grand_prix",
    playerIds: players.map((p) => p.playerId),
    playerNames: playerNamesById,
    totalGames: GAMES,
    moveTimeoutMs: 30000,
    mode: "practice",
  };

  const createRes = await fetch(`${SERVER}/api/match/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!createRes.ok) {
    console.error("Failed to create match:", await createRes.text());
    process.exit(1);
  }
  const { matchId } = await createRes.json() as { matchId: string };

  console.log(`${c.gray}Match ID: ${matchId.slice(0, 12)}...${c.reset}`);
  console.log(`${c.gray}Running ${GAMES} games...${c.reset}\n`);

  // Each player connects to the match; first player is primary (prints output)
  const connectPlayer = (playerId: string, botName: string, isPrimary: boolean): Promise<Record<string, unknown>> =>
    new Promise((resolve, reject) => {
      const ws = new WebSocket(`${WS_SERVER}/ws/match/${matchId}`);
      ws.onopen = () => ws.send(JSON.stringify({ type: "identify", playerId, name: playerNamesById[playerId] }));
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data as string);
        switch (msg.type) {
          case "your_turn": {
            const state = msg.state as VisibleGameState;
            const legalMoves = msg.legalMoves as MoveAction[];
            ws.send(JSON.stringify({ type: "move", action: runBot(botName, state, playerId, legalMoves) }));
            break;
          }
          case "game_event":
            if (isPrimary && LOG_ENABLED)
              recordEvent(msg.event as Record<string, unknown>, playerNames);
            break;
          case "game_complete":
            if (isPrimary) {
              const gameNumber = msg.gameNumber as number;
              if (LOG_ENABLED) {
                logEntries.push({
                  kind: "game_end",
                  gameNumber,
                  winner: msg.winner ? (playerNames[msg.winner as string] ?? msg.winner as string) : null,
                  finalScores: Object.fromEntries(
                    Object.entries(msg.scores as Record<string, number>).map(([id, s]) => [playerNames[id] ?? id, s])
                  ),
                });
              }
              const scores = msg.scores as Record<string, number>;
              const winnerName = msg.winner ? playerNames[msg.winner as string] ?? msg.winner as string : "draw";
              const winColor = colorMap[winnerName] ?? c.gray;
              const scoreStr = Object.entries(scores)
                .map(([id, s]) => `${playerNames[id] ?? id} ${s}`)
                .join("  ");
              console.log(`  Game ${String(gameNumber).padStart(2)}  ${c.gray}${scoreStr}${c.reset}  → ${winColor}${c.bold}${winnerName}${c.reset}`);
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

  const [summary] = await Promise.all(
    players.map((p, i) => connectPlayer(p.playerId, p.botName, i === 0))
  );

  console.log();
  console.log(`${c.bold}Grand Prix Summary${c.reset}`);
  console.log("─".repeat(48));
  console.log(`Games played:    ${summary.games_played as number}`);
  console.log(`Avg rounds/game: ${(summary.avg_rounds as number).toFixed(1)}`);
  console.log(`Winner:          ${c.bold}${(summary.winner as string | null) ?? "Draw"}${c.reset}`);
  console.log();
  console.log(`${"Player".padEnd(16)} ${"Wins".padStart(5)} ${"Win%".padStart(6)} ${"Avg Score".padStart(10)}`);
  console.log("─".repeat(48));

  const gamesPlayed = summary.games_played as number;
  for (const p of summary.players as Array<{ name: string; rank: number; wins: number; avg_score: number }>) {
    const winPct = (gamesPlayed > 0 ? (p.wins / gamesPlayed) * 100 : 0).toFixed(0) + "%";
    const col = colorMap[p.name] ?? "";
    const nameStr = col + c.bold + p.name.padEnd(16) + c.reset;
    console.log(`${nameStr} ${String(p.wins).padStart(5)} ${winPct.padStart(6)} ${p.avg_score.toFixed(1).padStart(10)}`);
  }

  if (LOG_ENABLED) writeLog(playerNames, matchId);

  console.log();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
