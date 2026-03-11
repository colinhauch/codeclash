/**
 * Interactive terminal play mode - play Flip 7 against a bot
 *
 * Usage: bun run src/cli/play.ts [bot-name]
 * Controls: d = draw, s = stand, q = quit
 */

import { createInitialState, applyMove, endRound, getLegalMoves } from "../game/engine";
import { cardToString } from "../game/helpers";
import type { GameState, Bot, Card } from "../game/types";
import { existsSync } from "fs";
import path from "path";

// ─── ANSI helpers ────────────────────────────────────────────────────────────

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  white: "\x1b[97m",
  bgBlue: "\x1b[44m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
};

const bold = (s: string) => C.bold + s + C.reset;
const dim = (s: string) => C.dim + s + C.reset;
const cyan = (s: string) => C.cyan + s + C.reset;
const yellow = (s: string) => C.yellow + s + C.reset;
const green = (s: string) => C.green + s + C.reset;
const red = (s: string) => C.red + s + C.reset;
const magenta = (s: string) => C.magenta + s + C.reset;

function clearScreen() {
  process.stdout.write("\x1b[2J\x1b[H");
}

// ─── Card display ─────────────────────────────────────────────────────────────

function formatCard(card: Card): string {
  const s = cardToString(card);
  if (card.type === "number") return cyan(s.padStart(3));
  if (card.type === "modifier") return yellow(s.padStart(3));
  return magenta(s.padStart(3));
}

function formatCardList(cards: Card[]): string {
  if (cards.length === 0) return dim("  (none)");
  return "  " + cards.map(formatCard).join(" ");
}

// ─── State rendering ─────────────────────────────────────────────────────────

function renderState(state: GameState, humanId: string, lastCardDrawn: Card | null, message: string) {
  clearScreen();

  const line = "─".repeat(60);
  console.log(bold(cyan("╔══════════════════════════════════════════════════════════╗")));
  console.log(bold(cyan("║           FLIP 7  ·  Interactive Mode                   ║")));
  console.log(bold(cyan("╚══════════════════════════════════════════════════════════╝")));
  console.log();

  // Round and deck info
  console.log(`  ${bold("Round:")} ${state.round}   ${bold("Deck:")} ${state.deck.length} cards remaining`);
  console.log();

  // Players
  for (const player of state.players) {
    const isHuman = player.id === humanId;
    const isCurrent = state.players[state.currentPlayerIndex]?.id === player.id && !state.roundOver;
    const label = isHuman ? bold(green("YOU")) : bold(red("BOT"));
    const activeLabel = player.isActive ? green("active") : dim("stood/bust");
    const arrow = isCurrent ? yellow(" ◄ YOUR TURN") : "";

    console.log(`  ${label} ${dim(`(${activeLabel})`)}${arrow}`);
    console.log(`    Score: ${bold(String(player.totalScore))} total  |  ${bold(String(player.roundScore))} this round`);
    console.log(`    Numbers:${formatCardList(player.numberCards)}`);
    if (player.modifierCards.length > 0) {
      console.log(`    Modifiers:${formatCardList(player.modifierCards)}`);
    }
    console.log();
  }

  // Last card drawn
  if (lastCardDrawn) {
    const was = `You drew: ${formatCard(lastCardDrawn)}`;
    console.log(`  ${was}`);
  }

  // Message
  if (message) {
    console.log(`  ${bold(message)}`);
  }

  console.log(`  ${dim(line)}`);
}

function renderPrompt(legalMoves: Array<"draw" | "stand">) {
  const parts: string[] = [];
  if (legalMoves.includes("draw")) parts.push(bold(cyan("[d]")) + " Draw");
  if (legalMoves.includes("stand")) parts.push(bold(yellow("[s]")) + " Stand");
  parts.push(bold(red("[q]")) + " Quit");
  process.stdout.write(`  ${parts.join("   ")}  › `);
}

// ─── Keyboard input (raw mode) ────────────────────────────────────────────────

async function readKey(): Promise<string> {
  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once("data", (buf) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      const key = buf.toString("utf8");
      resolve(key);
    });
  });
}

// ─── Bot loader ───────────────────────────────────────────────────────────────

async function loadBot(name: string): Promise<{ bot: Bot; displayName: string }> {
  const candidates = [
    path.resolve(`submissions/${name}.ts`),
    path.resolve(`submissions/${name}`),
  ];

  for (const p of candidates) {
    if (existsSync(p)) {
      const mod = await import(p);
      const info = mod.default ?? mod;
      return { bot: info.bot, displayName: info.name ?? name };
    }
  }

  throw new Error(`Bot not found: "${name}". Place it in submissions/${name}.ts`);
}

// ─── Main loop ────────────────────────────────────────────────────────────────

async function main() {
  const botName = process.argv[2] ?? "random";

  let botInfo: { bot: Bot; displayName: string };
  try {
    botInfo = await loadBot(botName);
  } catch (e: unknown) {
    console.error(red(String(e)));
    process.exit(1);
  }

  const { bot, displayName } = botInfo;
  const humanId = "human";
  const botId = "bot";

  console.log(bold(green(`\nLoaded bot: ${displayName}`)));
  console.log(dim("Press any key to start…"));
  await readKey();

  let state = createInitialState([humanId, botId]);
  let lastCardDrawn: Card | null = null;
  let message = `Playing against ${bold(displayName)}. Good luck!`;

  while (!state.gameOver) {
    // ── Round loop ──────────────────────────────────────────────────────────
    while (!state.roundOver) {
      const currentPlayer = state.players[state.currentPlayerIndex];

      if (currentPlayer.id === humanId) {
        // Human's turn
        const legalMoves = getLegalMoves(state);
        renderState(state, humanId, lastCardDrawn, message);
        renderPrompt(legalMoves);
        lastCardDrawn = null;
        message = "";

        let key = "";
        while (true) {
          key = await readKey();
          if (key === "q" || key === "\x03") {
            console.log(bold(red("\n\nQuit.")));
            process.exit(0);
          }
          if (key === "d" && legalMoves.includes("draw")) break;
          if (key === "s" && legalMoves.includes("stand")) break;
        }

        state = applyMove(state, { action: key === "d" ? "draw" : "stand" }).state;

        if (key === "d") {
          // The drawn card is now at the end of revealedCards
          if (state.revealedCards.length > 0) {
            lastCardDrawn = state.revealedCards[state.revealedCards.length - 1];
            if (lastCardDrawn.type === "number") {
              const humanPlayerAfter = state.players.find(p => p.id === humanId)!;
              if (!humanPlayerAfter.isActive && humanPlayerAfter.roundScore === 0) {
                message = red(`BUST! You drew a duplicate ${formatCard(lastCardDrawn)}. No points this round.`);
              } else if (humanPlayerAfter.numberCards.length === 7) {
                message = green("FLIP 7! You collected 7 unique numbers! +15 bonus!");
              }
            }
          }
        } else {
          message = yellow("You stood.");
        }
      } else {
        // Bot's turn - show state, pause briefly, then apply move
        renderState(state, humanId, lastCardDrawn, message);
        lastCardDrawn = null;
        message = dim("Bot is thinking…");
        console.log(`  ${message}`);
        await new Promise(r => setTimeout(r, 600));

        const botMove = bot(state, botId);
        const prevRevealedLen = state.revealedCards.length;
        state = applyMove(state, botMove).state;

        if (botMove.action === "draw") {
          if (state.revealedCards.length > prevRevealedLen) {
            const drawn = state.revealedCards[state.revealedCards.length - 1];
            const botPlayer = state.players.find(p => p.id === botId)!;
            if (!botPlayer.isActive && botPlayer.roundScore === 0) {
              message = `Bot drew ${formatCard(drawn)} and ` + red("BUSTED!");
            } else if (botPlayer.numberCards.length === 7) {
              message = `Bot drew ${formatCard(drawn)} and got ` + green("FLIP 7! (+15 bonus)");
            } else {
              message = `Bot drew ${formatCard(drawn)}.`;
            }
          }
        } else {
          message = "Bot stood.";
        }
      }
    }

    // ── Round over ──────────────────────────────────────────────────────────
    state = endRound(state).state;

    if (!state.gameOver) {
      renderState(state, humanId, null, "");
      console.log();
      const humanTotal = state.players.find(p => p.id === humanId)?.totalScore ?? 0;
      const botTotal = state.players.find(p => p.id === botId)?.totalScore ?? 0;
      const prevRound = state.round - 1;

      // Show round results (scores were updated by endRound, round already incremented)
      console.log(bold(`  ═══ End of Round ${prevRound} ═══`));
      console.log(`  ${bold(green("You:"))} ${humanTotal} total`);
      console.log(`  ${bold(red("Bot:"))} ${botTotal} total`);
      console.log();
      console.log(dim("  Press any key for next round…"));
      await readKey();
      lastCardDrawn = null;
      message = `Round ${state.round} — go!`;
    }
  }

  // ── Game over ───────────────────────────────────────────────────────────────
  renderState(state, humanId, null, "");
  console.log();
  console.log(bold("  ═══ GAME OVER ═══"));

  const humanTotal = state.players.find(p => p.id === humanId)?.totalScore ?? 0;
  const botTotal = state.players.find(p => p.id === botId)?.totalScore ?? 0;

  console.log(`  ${bold(green("You:"))} ${humanTotal}`);
  console.log(`  ${bold(red("Bot:"))} ${botTotal}`);
  console.log();

  if (state.winner === humanId) {
    console.log(bold(green("  🎉 YOU WIN!")));
  } else if (state.winner === botId) {
    console.log(bold(red("  Bot wins. Better luck next time.")));
  } else {
    console.log(bold(yellow("  It's a tie!")));
  }

  console.log();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
