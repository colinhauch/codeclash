/**
 * CodeClash - Admin CLI
 *
 * Connects to LobbyDO as an organizer to manage tournaments in real time.
 *
 * Usage:
 *   bun run admin --server codeclash.colinhauch.com --token <secret>
 *   bun run admin --server localhost:8787 --token dev-secret
 *
 * Commands (interactive):
 *   status   - Show connected players and tournament state
 *   start    - Start the tournament (prompts for format and games)
 *   kick <n> - Kick player by name
 *   reset    - Reset lobby to waiting state
 *   quit     - Disconnect and exit
 */

import type {
  AdminToLobbyMessage,
  LobbyToAdminMessage,
  TournamentFormat,
} from "../protocol/messages";
import * as readline from "readline";

interface AdminArgs {
  server: string;
  token: string;
  tournament: string;
}

function parseArgs(): AdminArgs {
  const args = process.argv.slice(2);
  let server = "localhost:8787";
  let token = "";
  let tournament = "default";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--server" && i + 1 < args.length) {
      server = args[i + 1];
      i++;
    } else if (args[i] === "--token" && i + 1 < args.length) {
      token = args[i + 1];
      i++;
    } else if (args[i] === "--tournament" && i + 1 < args.length) {
      tournament = args[i + 1];
      i++;
    }
  }

  if (!token) {
    console.error("Error: --token is required");
    process.exit(1);
  }

  return { server, token, tournament };
}

function log(msg: string): void {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] ${msg}`);
}

async function main(): Promise<void> {
  const args = parseArgs();

  const protocol = args.server.includes("localhost") || args.server.includes("127.0.0.1") ? "ws" : "wss";
  const url = `${protocol}://${args.server}/ws/admin?token=${encodeURIComponent(args.token)}&tournament=${encodeURIComponent(args.tournament)}`;

  log(`Connecting to ${args.server}...`);

  const ws = new WebSocket(url);

  ws.addEventListener("open", () => {
    log("Connected as admin");
    send(ws, { type: "admin_join" });
    send(ws, { type: "status" });
    startREPL(ws);
  });

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(String(event.data)) as LobbyToAdminMessage;
    handleMessage(msg);
  });

  ws.addEventListener("close", (event) => {
    log(`Disconnected (code: ${event.code})`);
    process.exit(0);
  });

  ws.addEventListener("error", (event) => {
    console.error("WebSocket error:", event);
    process.exit(1);
  });
}

function handleMessage(msg: LobbyToAdminMessage): void {
  switch (msg.type) {
    case "status": {
      console.log("\n--- Lobby Status ---");
      console.log(`Phase: ${msg.phase}`);
      if (msg.format) console.log(`Format: ${msg.format}`);
      if (msg.currentPhase) console.log(`Current phase: ${msg.currentPhase}`);
      console.log(`Matches: ${msg.matchesComplete} complete, ${msg.matchesInProgress} in progress`);
      console.log(`Players (${msg.players.length}):`);
      for (const p of msg.players) {
        const status = p.connected
          ? (p.ready ? "\u2713 ready" : "waiting")
          : "\u2717 disconnected";
        console.log(`  - "${p.name}" (${p.author}) [${status}]`);
      }
      console.log("--------------------\n");
      break;
    }

    case "event":
      log(msg.message);
      break;

    case "error":
      log(`ERROR: ${msg.message}`);
      break;
  }
}

function send(ws: WebSocket, msg: AdminToLobbyMessage): void {
  ws.send(JSON.stringify(msg));
}

function startREPL(ws: WebSocket): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "admin> ",
  });

  rl.prompt();

  rl.on("line", (line) => {
    const parts = line.trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase();

    switch (cmd) {
      case "status":
        send(ws, { type: "status" });
        break;

      case "start": {
        const format = (parts[1] as TournamentFormat) || "round-robin";
        const games = parseInt(parts[2]) || 20;

        if (format !== "bracket" && format !== "round-robin") {
          console.log("Usage: start [bracket|round-robin] [gamesPerMatch]");
          break;
        }

        log(`Starting tournament: ${format}, ${games} games per match`);
        send(ws, { type: "start", format, gamesPerMatch: games });
        break;
      }

      case "kick": {
        const name = parts.slice(1).join(" ");
        if (!name) {
          console.log("Usage: kick <player-name>");
          break;
        }
        // We send name — LobbyDO expects playerId, so admin would need
        // to reference the ID from status. For convenience, send as-is
        // and let LobbyDO handle lookup.
        send(ws, { type: "kick", playerId: name });
        break;
      }

      case "reset":
        send(ws, { type: "reset" });
        break;

      case "quit":
      case "exit":
        ws.close();
        rl.close();
        break;

      case "":
        break;

      default:
        console.log("Commands: status, start [format] [games], kick <name>, reset, quit");
    }

    rl.prompt();
  });

  rl.on("close", () => {
    ws.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
