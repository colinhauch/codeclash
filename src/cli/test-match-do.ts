/**
 * Test script: drives a match through MatchDO over WebSocket.
 *
 * Usage:
 *   bun run src/cli/test-match-do.ts           # summary only
 *   bun run src/cli/test-match-do.ts --log     # + writes detailed move log to /tmp/match-<id>.log
 *
 * Requires: bun run dev already running on :5173
 */

import conservative from "../../submissions/conservative";
import aggressive from "../../submissions/aggressive";
import random from "../../submissions/random";
import { writeFileSync } from "fs";
import type { VisibleGameState, MoveAction } from "../protocol/messages";

const SERVER = "http://localhost:5173";
const WS_SERVER = "ws://localhost:5173";
const ADMIN_TOKEN = "devtoken";
const TOURNAMENT = "test-match-" + Date.now();
const GAMES = 10;
const LOG_ENABLED = process.argv.includes("--log");

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  gray: "\x1b[90m",
  magenta: "\x1b[35m",
};

// Bot registry
const BOTS: Record<string, typeof conservative> = { conservative, aggressive, random };
const PLAYER_CONFIGS = [
  { name: "Conservative", botName: "conservative" },
  { name: "Aggressive",   botName: "aggressive" },
  { name: "Random",       botName: "random" },
];
const PLAYER_COLORS = [c.cyan, c.yellow, c.magenta];

// ---------------------------------------------------------------------------
// Log buffer
// ---------------------------------------------------------------------------
type LogEntry =
  | { kind: "game_start"; matchId: string; gameNumber: number }
  | { kind: "round_start"; round: number; startingPlayer: string }
  | { kind: "draw"; player: string; card: string }
  | { kind: "stand"; player: string; score: number }
  | { kind: "bust"; player: string; duplicateValue: number }
  | { kind: "flip7"; player: string }
  | { kind: "round_end"; round: number; scores: Record<string, { roundScore: number; totalScore: number }> }
  | { kind: "game_end"; matchId: string; gameNumber: number; winner: string | null; finalScores: Record<string, number> };

const logEntries: LogEntry[] = [];

function cardStr(card: Record<string, unknown>): string {
  if (card.type === "number") return `#${card.value}`;
  if (card.type === "modifier") return `mod(${card.modifier})`;
  return `action(${card.action})`;
}

function recordEvent(
  event: Record<string, unknown>,
  playerNames: Record<string, string>,
  matchId: string,
  gameNumber: number
) {
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
  void matchId; void gameNumber;
}

function writeLog(allPlayerNames: Record<string, string>, tournamentId: string) {
  const lines: string[] = [
    `CodeClash Match Log`,
    `Tournament: ${tournamentId}`,
    `Date: ${new Date().toISOString()}`,
    "",
  ];

  for (const e of logEntries) {
    switch (e.kind) {
      case "game_start":
        lines.push(`${"─".repeat(50)}`);
        lines.push(`MATCH ${e.matchId.slice(0, 8)} — GAME ${e.gameNumber}`);
        lines.push(`${"─".repeat(50)}`);
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
        const scoreLines = Object.entries(e.scores)
          .map(([id, s]) => `      ${(allPlayerNames[id] ?? id).padEnd(16)} +${s.roundScore}  total=${s.totalScore}`)
          .join("\n");
        lines.push(`  Round ${e.round} end:`);
        lines.push(scoreLines);
        break;
      }
      case "game_end": {
        lines.push(`Game result: winner=${e.winner ?? "draw"}`);
        const scoreLines = Object.entries(e.finalScores)
          .map(([id, s]) => `  ${(allPlayerNames[id] ?? id).padEnd(16)} ${s}`)
          .join("\n");
        lines.push(scoreLines);
        lines.push("");
        break;
      }
    }
  }

  const path = `/tmp/tournament-${tournamentId.slice(-12)}.log`;
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
// Play one match (one player's perspective)
// ---------------------------------------------------------------------------
function playMatch(
  matchId: string,
  playerId: string,
  botName: string,
  playerNames: Record<string, string>,
  isPrimary: boolean,
  colorMap: Record<string, string>,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let currentGameNumber = 0;
    const ws = new WebSocket(`${WS_SERVER}/ws/match/${matchId}`);
    ws.onopen = () => ws.send(JSON.stringify({ type: "identify", playerId, name: playerNames[playerId] }));
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
            recordEvent(msg.event as Record<string, unknown>, playerNames, matchId, currentGameNumber);
          break;
        case "game_complete":
          if (isPrimary) {
            currentGameNumber = msg.gameNumber as number;
            if (LOG_ENABLED) {
              logEntries.push({ kind: "game_start", matchId, gameNumber: currentGameNumber });
              logEntries.push({
                kind: "game_end",
                matchId,
                gameNumber: currentGameNumber,
                winner: msg.winner ? (playerNames[msg.winner as string] ?? msg.winner as string) : null,
                finalScores: Object.fromEntries(
                  Object.entries(msg.scores as Record<string, number>).map(([id, s]) => [playerNames[id] ?? id, s])
                ),
              });
            }
            const scores = msg.scores as Record<string, number>;
            const winnerName = msg.winner ? playerNames[msg.winner as string] ?? msg.winner as string : "draw";
            const winnerColor = colorMap[winnerName] ?? c.gray;
            const scoreStr = Object.entries(scores)
              .map(([id, s]) => `${playerNames[id] ?? id} ${s}`)
              .join("  ");
            console.log(`  [${matchId.slice(0, 6)}] Game ${String(currentGameNumber).padStart(2)}  ${c.gray}${scoreStr}${c.reset}  → ${winnerColor}${c.bold}${winnerName}${c.reset}`);
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

  const lobbyUrl = `${WS_SERVER}/ws/lobby?tournament=${TOURNAMENT}`;
  const allPlayerNames: Record<string, string> = {};
  const colorMap: Record<string, string> = {};

  const joinLobby = (name: string, author: string): Promise<{ ws: WebSocket; playerId: string }> =>
    new Promise((resolve, reject) => {
      const ws = new WebSocket(lobbyUrl);
      ws.onopen = () => ws.send(JSON.stringify({ type: "join", name, author, tournament: TOURNAMENT }));
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data as string);
        if (msg.type === "joined") resolve({ ws, playerId: msg.playerId });
      };
      ws.onerror = reject;
    });

  console.log(`\n${c.bold}${c.cyan}=== CodeClash Tournament Test ===${c.reset}`);
  console.log(`${PLAYER_CONFIGS.map((p, i) => `${PLAYER_COLORS[i] ?? ""}${c.bold}${p.name}${c.reset}`).join(" vs ")}  (${GAMES} games/match)${LOG_ENABLED ? `  ${c.gray}[logging]${c.reset}` : ""}\n`);

  // Join all players
  const players = await Promise.all(
    PLAYER_CONFIGS.map((cfg) => joinLobby(cfg.name, "CodeClash"))
  );
  for (let i = 0; i < players.length; i++) {
    allPlayerNames[players[i].playerId] = PLAYER_CONFIGS[i].name;
    colorMap[PLAYER_CONFIGS[i].name] = PLAYER_COLORS[i] ?? c.gray;
  }

  // Connect admin
  const adminWs = new WebSocket(`${WS_SERVER}/ws/admin?tournament=${TOURNAMENT}&token=${ADMIN_TOKEN}`);
  await new Promise<void>((resolve, reject) => {
    adminWs.onopen = () => { adminWs.send(JSON.stringify({ type: "admin_join" })); resolve(); };
    adminWs.onerror = reject;
  });
  await new Promise<void>((r) => setTimeout(r, 300));

  // Each player collects their match assignments (round-robin: N*(N-1)/2 matches total,
  // each player participates in N-1 of them)
  const matchesPerPlayer = players.length - 1;
  const playerMatchIds: Map<string, string[]> = new Map(players.map((p) => [p.playerId, []]));

  const allAssigned = new Promise<void>((resolve) => {
    let remaining = players.length * matchesPerPlayer;
    for (const player of players) {
      player.ws.addEventListener("message", (e) => {
        const msg = JSON.parse((e as MessageEvent).data as string);
        if (msg.type === "match_assigned") {
          playerMatchIds.get(player.playerId)!.push(msg.matchId as string);
          if (--remaining === 0) resolve();
        }
      });
    }
  });

  adminWs.send(JSON.stringify({ type: "start", format: "round-robin", gamesPerMatch: GAMES }));
  await allAssigned;

  console.log(`${c.gray}Running matches...${c.reset}\n`);

  // For each match, the two participating players connect and play.
  // Build a set of unique matchIds and which players are in each.
  const matchToPlayers: Map<string, { playerId: string; botName: string }[]> = new Map();
  for (let i = 0; i < players.length; i++) {
    const pid = players[i].playerId;
    for (const mid of playerMatchIds.get(pid)!) {
      if (!matchToPlayers.has(mid)) matchToPlayers.set(mid, []);
      matchToPlayers.get(mid)!.push({ playerId: pid, botName: PLAYER_CONFIGS[i].botName });
    }
  }

  // Run all matches concurrently; for each match the first player listed is "primary" (prints output)
  const matchPromises: Promise<Record<string, unknown>>[] = [];
  for (const [mid, participants] of matchToPlayers) {
    for (let i = 0; i < participants.length; i++) {
      const { playerId, botName } = participants[i];
      matchPromises.push(playMatch(mid, playerId, botName, allPlayerNames, i === 0, colorMap));
    }
  }

  const summaries = await Promise.all(matchPromises);

  // Deduplicate summaries (one per match, not per player)
  const seen = new Set<string>();
  const uniqueSummaries: Record<string, unknown>[] = [];
  for (const s of summaries) {
    const mid = s.match_id as string;
    if (!seen.has(mid)) { seen.add(mid); uniqueSummaries.push(s); }
  }

  // Aggregate standings across all matches
  const totals: Map<string, { wins: number; games: number; totalScore: number }> = new Map(
    PLAYER_CONFIGS.map((p) => [p.name, { wins: 0, games: 0, totalScore: 0 }])
  );
  for (const s of uniqueSummaries) {
    const gamesPlayed = s.games_played as number;
    for (const p of s.players as Array<{ name: string; wins: number; avg_score: number }>) {
      const t = totals.get(p.name);
      if (!t) continue;
      t.wins += p.wins;
      t.games += gamesPlayed;
      t.totalScore += p.avg_score * gamesPlayed;
    }
  }

  console.log();
  console.log(`${c.bold}Tournament Summary${c.reset}`);
  console.log("─".repeat(48));
  console.log(`Matches played:  ${uniqueSummaries.length}`);
  console.log(`Games per match: ${GAMES}`);
  console.log();
  console.log(`${"Player".padEnd(16)} ${"Wins".padStart(5)} ${"Win%".padStart(6)} ${"Avg Score".padStart(10)}`);
  console.log("─".repeat(48));

  const standings = [...totals.entries()]
    .map(([name, t]) => ({ name, ...t, winPct: t.games > 0 ? t.wins / t.games : 0, avgScore: t.games > 0 ? t.totalScore / t.games : 0 }))
    .sort((a, b) => b.wins - a.wins);

  for (const p of standings) {
    const col = colorMap[p.name] ?? "";
    const winPct = (p.winPct * 100).toFixed(0) + "%";
    console.log(`${col}${c.bold}${p.name.padEnd(16)}${c.reset} ${String(p.wins).padStart(5)} ${winPct.padStart(6)} ${p.avgScore.toFixed(1).padStart(10)}`);
  }

  if (LOG_ENABLED) writeLog(allPlayerNames, TOURNAMENT);

  console.log();
  for (const p of players) p.ws.close();
  adminWs.close();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
