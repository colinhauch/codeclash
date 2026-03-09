/**
 * CodeClash - Tournament Runner
 *
 * Executes a full round-robin tournament between multiple bots
 *
 * Usage:
 *   bun run tournament --output results/2026-03-15.json
 */

import * as fs from "fs";
import * as path from "path";
import { runMatch } from "./match";
import type {
  BotInfo,
  TournamentResult,
  MatchupResult,
  Standing,
} from "../game/types";

interface TournamentArgs {
  outputPath: string;
  gamesPerMatchup: number;
  moveTimeoutMs: number;
  seed?: number;
}

/**
 * Parse CLI arguments
 */
function parseArgs(): TournamentArgs {
  const args = process.argv.slice(2);

  let outputPath = `results/${new Date().toISOString().split("T")[0]}.json`;
  let gamesPerMatchup = 20;
  let moveTimeoutMs = 1000;
  let seed: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--output" && i + 1 < args.length) {
      outputPath = args[i + 1];
      i++;
    } else if (args[i] === "--games" && i + 1 < args.length) {
      gamesPerMatchup = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === "--timeout" && i + 1 < args.length) {
      moveTimeoutMs = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === "--seed" && i + 1 < args.length) {
      seed = parseInt(args[i + 1]);
      i++;
    }
  }

  return { outputPath, gamesPerMatchup, moveTimeoutMs, seed };
}

/**
 * Load all bots from submissions directory
 */
async function loadAllBots(): Promise<BotInfo[]> {
  const baseDir = process.cwd();
  const submissionsDir = path.join(baseDir, "submissions");

  const files = fs.readdirSync(submissionsDir);
  const bots: BotInfo[] = [];

  for (const file of files) {
    if (file.startsWith("_") || !file.endsWith(".ts")) {
      continue; // Skip templates and non-TS files
    }

    const botName = file.replace(".ts", "");
    const botPath = path.join(submissionsDir, file);

    try {
      const module = await import(botPath);
      const bot = module.default || module.bot;

      if (bot) {
        bots.push(bot as BotInfo);
      }
    } catch (err) {
      console.warn(`Failed to load bot ${botName}: ${(err as Error).message}`);
    }
  }

  return bots;
}

/**
 * Generate all pairings (each bot vs each other bot, once each direction)
 */
function generatePairings(
  bots: BotInfo[]
): Array<[BotInfo, BotInfo]> {
  const pairings: Array<[BotInfo, BotInfo]> = [];

  for (let i = 0; i < bots.length; i++) {
    for (let j = i + 1; j < bots.length; j++) {
      pairings.push([bots[i], bots[j]]);
      // Add reverse pairing for fairness
      pairings.push([bots[j], bots[i]]);
    }
  }

  return pairings;
}

/**
 * Calculate standings from matchup results
 */
function calculateStandings(
  bots: BotInfo[],
  matchups: MatchupResult[]
): Standing[] {
  const standings: Record<
    string,
    { wins: number; losses: number; draws: number }
  > = {};

  // Initialize standings
  for (const bot of bots) {
    standings[bot.id] = { wins: 0, losses: 0, draws: 0 };
  }

  // Aggregate results
  for (const matchup of matchups) {
    const summary = matchup.summary;
    standings[matchup.bot1].wins += summary.bot1Wins;
    standings[matchup.bot1].losses += summary.bot2Wins;
    standings[matchup.bot1].draws += summary.draws;

    standings[matchup.bot2].wins += summary.bot2Wins;
    standings[matchup.bot2].losses += summary.bot1Wins;
    standings[matchup.bot2].draws += summary.draws;
  }

  // Create standings array
  const standingsArray: Standing[] = bots.map((bot) => {
    const stats = standings[bot.id];
    const total = stats.wins + stats.losses + stats.draws;
    return {
      botId: bot.id,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws,
      winRate: total > 0 ? stats.wins / total : 0,
      rank: 0, // Will be set after sorting
    };
  });

  // Sort by win rate and wins
  standingsArray.sort((a, b) => {
    if (b.winRate !== a.winRate) {
      return b.winRate - a.winRate;
    }
    return b.wins - a.wins;
  });

  // Set ranks
  for (let i = 0; i < standingsArray.length; i++) {
    standingsArray[i].rank = i + 1;
  }

  return standingsArray;
}

/**
 * Run full tournament
 */
async function runTournament(): Promise<void> {
  const args = parseArgs();

  console.log("Loading bots...");
  const bots = await loadAllBots();

  if (bots.length === 0) {
    console.error("No bots found in submissions directory");
    process.exit(1);
  }

  console.log(`Found ${bots.length} bots`);
  console.log(`Running ${args.gamesPerMatchup} games per matchup`);
  console.log("---");

  const pairings = generatePairings(bots);
  const matchups: MatchupResult[] = [];
  let totalGames = 0;

  for (const [bot1, bot2] of pairings) {
    const matchupResults = [];

    console.log(`${bot1.name} vs ${bot2.name}...`);

    for (let game = 0; game < args.gamesPerMatchup; game++) {
      const config = {
        moveTimeoutMs: args.moveTimeoutMs,
        seed: args.seed ? args.seed + totalGames : undefined,
      };

      const result = await runMatch(bot1, bot2, config);
      matchupResults.push(result);
      totalGames++;

      if ((game + 1) % 5 === 0) {
        process.stdout.write(`  ${game + 1}/${args.gamesPerMatchup}\r`);
      }
    }

    // Aggregate matchup results
    const bot1Wins = matchupResults.filter(
      (r) => r.winner === bot1.id
    ).length;
    const bot2Wins = matchupResults.filter(
      (r) => r.winner === bot2.id
    ).length;
    const draws = matchupResults.filter((r) => r.winner === null).length;

    matchups.push({
      bot1: bot1.id,
      bot2: bot2.id,
      games: matchupResults,
      summary: { bot1Wins, bot2Wins, draws },
    });

    console.log(
      `  ${bot1Wins}W - ${bot2Wins}L - ${draws}D (${bot1.name})`
    );
  }

  console.log("---");

  // Calculate standings
  const standings = calculateStandings(bots, matchups);

  console.log("Final Standings:");
  for (const standing of standings) {
    const bot = bots.find((b) => b.id === standing.botId)!;
    console.log(
      `  ${standing.rank}. ${bot.name}: ${standing.wins}W - ${standing.losses}L - ${standing.draws}D (${(standing.winRate * 100).toFixed(1)}%)`
    );
  }

  // Create tournament result
  const result: TournamentResult = {
    id: `tournament-${Date.now()}`,
    game: "flip-7",
    timestamp: new Date().toISOString(),
    config: {
      gamesPerMatchup: args.gamesPerMatchup,
      moveTimeoutMs: args.moveTimeoutMs,
      seed: args.seed,
    },
    bots: bots.map((b) => ({
      id: b.id,
      name: b.name,
      author: b.author,
      description: b.description,
    })),
    matchups,
    standings,
  };

  // Ensure output directory exists
  const outputDir = path.dirname(args.outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write results to file
  fs.writeFileSync(args.outputPath, JSON.stringify(result, null, 2));
  console.log(`Results written to ${args.outputPath}`);
}

// Main
runTournament().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
