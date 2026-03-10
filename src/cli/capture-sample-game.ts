/**
 * Capture a sample game and write it to public/sample-game.json for the visualizer dev page.
 */
import { runMatch } from "./match";
import conservativeBot from "../../submissions/conservative";
import aggressiveBot from "../../submissions/aggressive";
import { writeFileSync } from "fs";
import { join } from "path";

const result = await runMatch(aggressiveBot, conservativeBot, {
  moveTimeoutMs: 1000,
  seed: 42,
});

const output = {
  playerIds: [aggressiveBot.id, conservativeBot.id],
  ...result,
};

const outPath = join(import.meta.dir, "../../public/sample-game.json");
writeFileSync(outPath, JSON.stringify(output, null, 2));

console.log(`Saved sample game to public/sample-game.json`);
console.log(`  Winner: ${result.winner}`);
console.log(`  Rounds: ${result.rounds}, Moves: ${result.moves.length}`);
console.log(`  Scores: ${JSON.stringify(result.finalScores)}`);
