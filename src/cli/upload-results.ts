/**
 * CodeClash - Upload Results to Cloudflare KV
 *
 * Pushes tournament results to Cloudflare Workers KV storage
 *
 * Usage:
 *   bun run upload-results results/2026-03-15.json
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

/**
 * Parse CLI arguments
 */
function parseArgs(): string {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: bun run upload-results <path-to-results.json>");
    process.exit(1);
  }

  return args[0];
}

/**
 * Upload results file to Cloudflare KV
 */
async function uploadResults(): Promise<void> {
  const resultsPath = parseArgs();

  // Check file exists
  if (!fs.existsSync(resultsPath)) {
    console.error(`File not found: ${resultsPath}`);
    process.exit(1);
  }

  // Read file
  const data = fs.readFileSync(resultsPath, "utf-8");
  let result;

  try {
    result = JSON.parse(data);
  } catch (err) {
    console.error("Invalid JSON in results file");
    process.exit(1);
  }

  const resultId = result.id || path.basename(resultsPath, ".json");

  console.log(`Uploading results to Cloudflare KV...`);
  console.log(`ID: ${resultId}`);

  try {
    // Upload as "latest"
    console.log("Uploading as 'latest'...");
    execSync(
      `wrangler kv key put --remote --binding RESULTS "latest" --path "${resultsPath}"`,
      { stdio: "inherit" }
    );

    // Upload with timestamp ID
    console.log(`Uploading as '${resultId}'...`);
    execSync(
      `wrangler kv key put --remote --binding RESULTS "${resultId}" --path "${resultsPath}"`,
      { stdio: "inherit" }
    );

    console.log("Upload complete!");
  } catch (err) {
    console.error("Failed to upload results:");
    console.error((err as Error).message);
    process.exit(1);
  }
}

// Main
uploadResults().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
