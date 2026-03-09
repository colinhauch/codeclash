/**
 * CodeClash - Test Harness
 *
 * CLI tool for testing bots locally
 *
 * Usage:
 *   bun run test <bot-name> <opponent> [--games 50] [--watch]
 *   bun run test my-bot random --games 50
 *   bun run test my-bot conservative --watch
 *   bun run test my-bot my-bot --games 100  # Self-play
 */

import * as fs from "fs";
import * as path from "path";
import { runMatch } from "./match";
import type { BotInfo } from "../game/types";

interface TestConfig {
  botName: string;
  opponentName: string;
  gamesCount: number;
  watchMode: boolean;
  seed?: number;
}

/**
 * Parse CLI arguments
 */
function parseArgs(): TestConfig {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      "Usage: bun run test <bot-name> <opponent> [--games 50] [--watch]"
    );
    process.exit(1);
  }

  const botName = args[0];
  const opponentName = args[1];
  let gamesCount = 1;
  let watchMode = false;
  let seed: number | undefined;

  for (let i = 2; i < args.length; i++) {
    if (args[i] === "--games" && i + 1 < args.length) {
      gamesCount = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === "--watch") {
      watchMode = true;
    } else if (args[i] === "--seed" && i + 1 < args.length) {
      seed = parseInt(args[i + 1]);
      i++;
    }
  }

  return {
    botName,
    opponentName,
    gamesCount,
    watchMode,
    seed,
  };
}

/**
 * Load a bot from the submissions directory
 */
async function loadBot(botName: string): Promise<BotInfo> {
  const baseDir = process.cwd();
  const botPath = path.join(baseDir, "submissions", `${botName}.ts`);

  if (!fs.existsSync(botPath)) {
    // Try without .ts extension
    const botPath2 = path.join(baseDir, "submissions", botName);
    if (!fs.existsSync(botPath2)) {
      throw new Error(`Bot not found: ${botName}`);
    }
  }

  // Dynamically import the bot module
  const module = await import(botPath);
  const bot = module.default || module.bot;

  if (!bot) {
    throw new Error(`No bot export found in ${botPath}`);
  }

  return bot as BotInfo;
}

/**
 * Run test matches
 */
async function runTests(config: TestConfig): Promise<void> {
  console.log(`Loading bots...`);

  const bot1 = await loadBot(config.botName);
  const bot2 = await loadBot(config.opponentName);

  console.log(
    `Testing ${bot1.name} vs ${bot2.name} (${config.gamesCount} games)`
  );
  console.log("---");

  const results = {
    bot1Wins: 0,
    bot2Wins: 0,
    draws: 0,
  };

  for (let i = 0; i < config.gamesCount; i++) {
    const gameConfig = {
      moveTimeoutMs: 1000,
      seed: config.seed ? config.seed + i : undefined,
    };

    const result = await runMatch(bot1, bot2, gameConfig);

    if (result.winner === bot1.id) {
      results.bot1Wins++;
    } else if (result.winner === bot2.id) {
      results.bot2Wins++;
    } else {
      results.draws++;
    }

    if (config.watchMode || i === 0) {
      console.log(`Game ${i + 1}:`);
      console.log(`  Winner: ${result.winner || "Draw"}`);
      console.log(
        `  Scores: ${bot1.name}=${result.finalScores[bot1.id]}, ${bot2.name}=${result.finalScores[bot2.id]}`
      );
      console.log(`  Rounds: ${result.rounds}`);
      console.log();
    }
  }

  console.log("---");
  console.log("Results:");
  console.log(
    `  ${bot1.name}: ${results.bot1Wins}W - ${results.bot2Wins}L - ${results.draws}D`
  );
  console.log(
    `  ${bot2.name}: ${results.bot2Wins}W - ${results.bot1Wins}L - ${results.draws}D`
  );

  const bot1WinRate = (results.bot1Wins / config.gamesCount) * 100;
  console.log(`  Win rate: ${bot1WinRate.toFixed(1)}%`);
}

// Main
const config = parseArgs();
runTests(config).catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
