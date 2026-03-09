# CodeClash Project Specification

## Overview

CodeClash is a bot tournament platform for hack nights. Friends write bots that play a card game (Flip 7), then compete in round-robin tournaments. Results are displayed on a web app hosted on Cloudflare Workers.

**Key URLs:**
- Site: `codeclash.colinhauch.com`
- Repo: Personal GitHub

**Tech Stack:**
- Runtime: Bun (local), V8 (deployed Workers)
- Framework: React 19 + Vite + Cloudflare Vite Plugin
- Styling: Tailwind CSS
- Routing: React Router v7
- Storage: Cloudflare KV (for live tournament results)
- Deployment: Cloudflare Workers with static assets

---

## Project Structure

```
codeclash/
├── README.md
├── package.json                    ✅ Created
├── tsconfig.json                   ✅ Created
├── vite.config.ts                  ✅ Created
├── wrangler.jsonc                  ✅ Created
├── tailwind.config.js              ✅ Created
├── postcss.config.js               ✅ Created
├── index.html                      ✅ Created
│
├── docs/                           📝 To create
│   ├── how-to-play.md             # Game rules for humans ✅ Created
│   ├── bot-guide.md               # How to write your first bot
│   └── api-reference.md           # Type and helper documentation
│
├── src/
│   ├── game/                       
│   │   ├── types.ts               ✅ Created - Core type definitions
│   │   ├── helpers.ts             ✅ Created - Bot helper utilities
│   │   ├── engine.ts              📝 To create - Game rules & state machine
│   │   └── deck.ts                📝 To create - Deck creation & shuffling
│   │
│   ├── cli/                        📝 To create
│   │   ├── tournament.ts          # Round-robin tournament runner
│   │   ├── test-harness.ts        # Test your bot locally
│   │   ├── match.ts               # Single match execution
│   │   └── upload-results.ts      # Push results to KV
│   │
│   └── app/                        📝 To create
│       ├── main.tsx               # React entry point
│       ├── App.tsx                # Root component with router
│       ├── index.css              # Tailwind imports
│       ├── pages/
│       │   ├── Home.tsx           # Landing page
│       │   ├── Rules.tsx          # Game rules (from markdown)
│       │   ├── Guide.tsx          # Bot writing guide
│       │   ├── API.tsx            # API reference
│       │   ├── Results.tsx        # Tournament grid
│       │   ├── Matchup.tsx        # Bot vs Bot detail
│       │   └── GameReplay.tsx     # Step-through visualizer
│       └── components/
│           ├── Layout.tsx         # Shared layout with nav
│           ├── TournamentGrid.tsx # Round-robin results grid
│           ├── MatchupCard.tsx    # Single matchup summary
│           ├── GameVisualizer.tsx # Flip 7 game state display
│           ├── MoveList.tsx       # List of moves with controls
│           └── Card.tsx           # Single card component
│
├── worker/                         📝 To create
│   └── index.ts                   # API routes for results
│
├── submissions/
│   ├── _template.ts               ✅ Created
│   └── example-bots/
│       ├── random.ts              ✅ Created
│       ├── conservative.ts        ✅ Created
│       └── probability.ts         ✅ Created
│
├── results/                        
│   └── .gitkeep
│
└── public/
    └── favicon.svg                📝 To create
```

---

## Flip 7 Game Rules

See docs/how-to-play.md for details

---

## Implementation Tasks

### Phase 1: Game Engine (src/game/)

#### deck.ts
This should create the full deck of 94 cards.

#### engine.ts
Implement the game state machine:

```typescript
import type { GameState, PlayerState, Move, VisibleGameState, BotContext } from "./types";

export function createInitialState(playerIds: string[]): GameState
export function getVisibleState(state: GameState, playerId: string): VisibleGameState
export function getBotContext(state: GameState, playerId: string): BotContext
export function getLegalMoves(state: GameState): MoveAction[]
export function applyMove(state: GameState, move: Move): GameState
export function isGameOver(state: GameState): boolean
export function getWinner(state: GameState): string | null
export function calculateFinalScores(state: GameState): Record<string, number>
```

Key implementation notes:
- `applyMove` should return a NEW state object (immutable)
- Handle wild card value assignment
- Track revealed cards as they're drawn
- Advance turn to next non-stood, non-busted player
- Detect game over when all players done

### Phase 2: CLI Tools (src/cli/)

#### match.ts
Execute a single match between two bots:

```typescript
export interface MatchConfig {
  moveTimeoutMs: number;
  seed?: number;
}

export async function runMatch(
  bot1: BotInfo,
  bot2: BotInfo,
  config: MatchConfig
): Promise<GameResult>
```

Implementation:
1. Create initial game state
2. Loop until game over:
   - Get current player
   - Build visible state and context
   - Call bot function with timeout
   - Validate move is legal
   - Apply move
   - Record in history
3. Return complete game result

**Timeout handling:**
```typescript
async function executeWithTimeout<T>(
  fn: () => T,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  return Promise.race([
    Promise.resolve(fn()),
    new Promise<T>((resolve) =>
      setTimeout(() => resolve(fallback), timeoutMs)
    ),
  ]);
}
```

#### test-harness.ts
CLI for testing bots locally:

```bash
# Usage examples
bun run test my-bot random --games 50
bun run test my-bot conservative --watch
bun run test my-bot my-bot --games 100  # Self-play
```

Implementation:
- Parse CLI args
- Load bot modules dynamically
- Run matches
- Print results (win/loss/draw, sample games)
- `--watch` mode: show game state after each move

#### tournament.ts
Run full round-robin tournament:

```typescript
export async function runTournament(
  bots: BotInfo[],
  config: TournamentConfig
): Promise<TournamentResult>
```

Implementation:
1. Generate all pairings (each bot vs each other bot)
2. For each pairing, run `config.gamesPerMatchup` games
3. Aggregate results
4. Calculate standings
5. Output to JSON file and/or upload to KV

**Suggested defaults:**
- `gamesPerMatchup`: 20 (statistical significance)
- `moveTimeoutMs`: 1000 (1 second)

#### upload-results.ts
Push results to Cloudflare KV:

```bash
bun run upload-results results/2026-03-15.json
```

Uses wrangler CLI under the hood:
```bash
wrangler kv key put --binding RESULTS "latest" "$(cat results/file.json)"
wrangler kv key put --binding RESULTS "2026-03-15" "$(cat results/file.json)"
```

### Phase 3: React App (src/app/)

#### main.tsx
```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

#### index.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### App.tsx
```typescript
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Rules from "./pages/Rules";
import Guide from "./pages/Guide";
import API from "./pages/API";
import Results from "./pages/Results";
import Matchup from "./pages/Matchup";
import GameReplay from "./pages/GameReplay";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="rules" element={<Rules />} />
        <Route path="guide" element={<Guide />} />
        <Route path="api" element={<API />} />
        <Route path="results" element={<Results />} />
        <Route path="results/:bot1-vs-:bot2" element={<Matchup />} />
        <Route path="results/:bot1-vs-:bot2/game/:gameId" element={<GameReplay />} />
      </Route>
    </Routes>
  );
}
```

#### Pages

**Home.tsx**
- Hero section: "CodeClash - Bot Tournament Arena"
- Current game: Flip 7
- Quick links to Rules, Guide, Results
- Countdown to next tournament (optional)

**Rules.tsx**
- Render docs/how-to-play.md
- Use a markdown renderer or pre-convert at build time
- Simple approach: import as raw string, use `dangerouslySetInnerHTML` with a markdown-to-html converter

**Results.tsx**
- Fetch from `/api/results` (or from KV via worker)
- Display TournamentGrid component
- Poll every 5 seconds for live updates during tournament

**Matchup.tsx**
- Parse bot1 and bot2 from URL params
- Show head-to-head record
- List all games with outcome and duration
- Click to navigate to GameReplay

**GameReplay.tsx**
- Load specific game from results
- Step-through visualizer:
  - Current game state (both hands, totals, deck size)
  - Move history with current position highlighted
  - Prev/Next/Play controls
- GameVisualizer component for display

#### Components

**TournamentGrid.tsx**
```typescript
interface Props {
  result: TournamentResult;
  onMatchupClick: (bot1: string, bot2: string) => void;
}
```
- Render NxN grid where N = number of bots
- Headers are bot names
- Cells show "W-L" record (from perspective of row bot)
- Color code: green = winning record, red = losing, gray = even
- Diagonal is empty (can't play yourself)

**GameVisualizer.tsx**
- Display current Flip 7 state
- Show each player's cards (face up)
- Show their total
- Indicate who's busted/stood
- Show deck remaining count
- Highlight current player

**Card.tsx**
- Render a single playing card
- Show value and suit
- Wild cards get special styling
- Props: `card: Card`, `faceDown?: boolean`

### Phase 4: Worker API (worker/)

#### index.ts
```typescript
interface Env {
  RESULTS: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // API routes
    if (url.pathname === "/api/results") {
      return handleGetResults(env);
    }
    
    if (url.pathname === "/api/results/upload" && request.method === "POST") {
      return handleUploadResults(request, env);
    }
    
    // Let static assets handle everything else
    return new Response("Not found", { status: 404 });
  },
};

async function handleGetResults(env: Env): Promise<Response> {
  const results = await env.RESULTS.get("latest");
  
  if (!results) {
    return Response.json({ error: "No results found" }, { status: 404 });
  }
  
  return Response.json(JSON.parse(results), {
    headers: { "Cache-Control": "no-cache" },
  });
}

async function handleUploadResults(
  request: Request,
  env: Env
): Promise<Response> {
  // Optional: Add simple auth token check
  const data = await request.json();
  const id = data.id || new Date().toISOString().split("T")[0];
  
  await env.RESULTS.put("latest", JSON.stringify(data));
  await env.RESULTS.put(id, JSON.stringify(data));
  
  return Response.json({ success: true, id });
}
```

### Phase 5: Documentation (docs/)

#### how-to-play.md
Write clear game rules:
- Overview
- Setup
- Turn structure
- Scoring
- Example game walkthrough

#### bot-guide.md
Getting started guide:
- Prerequisites (Bun, clone repo)
- Quick start (copy template, implement bot, test)
- Understanding the state and context
- Using helper functions
- Testing strategies
- Common mistakes

#### api-reference.md
Document all types and helpers:
- Complete type definitions
- Helper function reference
- Example usage

---

## Deployment Setup

### 1. Create Cloudflare KV Namespace
```bash
wrangler kv namespace create RESULTS
```
Copy the ID to wrangler.jsonc.

### 2. Configure Custom Domain
In Cloudflare Dashboard:
1. Go to Workers & Pages > codeclash
2. Settings > Domains & Routes
3. Add custom domain: codeclash.colinhauch.com

Or via wrangler.jsonc:
```json
{
  "routes": [
    { "pattern": "codeclash.colinhauch.com", "custom_domain": true }
  ]
}
```

### 3. Deploy
```bash
bun run deploy
```

---

## Hack Night Flow

### Before (1 week out)
1. Announce the game and share repo link
2. Site should have rules and guide ready
3. Example bots for people to test against

### Day of
```bash
# Everyone clones and implements their bot
git clone <repo>
cd codeclash
bun install

# Test locally
bun run test my-bot random --games 50
bun run test my-bot probability --games 50

# Submit (commit to submissions/)
git add submissions/my-bot.ts
git commit -m "Add my-bot"
git push
```

### Tournament Time
```bash
# You (as host) pull all submissions
git pull

# Run tournament
bun run tournament --output results/2026-03-15.json

# Upload to live site
bun run upload-results results/2026-03-15.json

# Everyone watches results at codeclash.colinhauch.com/results
```

---

## Future Enhancements (Post-MVP)

- [ ] ELO rating system across tournaments
- [ ] Multiple games (Super Tic Tac Toe, Poker)
- [ ] Bot code syntax highlighting in UI
- [ ] Tournament brackets (elimination mode)
- [ ] Real-time WebSocket updates
- [ ] Bot submission via web form (no git needed)
- [ ] Replay sharing (unique URLs)
- [ ] Statistics dashboard (win rate over time, etc.)

---

## Development Commands

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Type check
bun run typecheck

# Test a bot
bun run test <bot-name> <opponent> --games <n>

# Run tournament
bun run tournament --output results/<date>.json

# Build for production
bun run build

# Preview production build locally
bun run preview

# Deploy to Cloudflare
bun run deploy

# Upload results to KV
bun run upload-results results/<date>.json
```

---

## Notes for Claude Code

When implementing:

1. **Start with the game engine** - It's the foundation everything builds on
2. **Test the engine manually** before building CLI tools
3. **Build CLI test harness early** - You'll use it constantly
4. **Keep the site simple** - Functionality over beauty for MVP
5. **Use Tailwind utility classes** - Don't overcomplicate styling

**Key files to reference:**
- `src/game/types.ts` - All type definitions
- `src/game/helpers.ts` - Helper utilities
- `submissions/_template.ts` - How bots are structured

**External docs:**
- Cloudflare Vite Plugin: https://developers.cloudflare.com/workers/vite-plugin/
- React Router v7: https://reactrouter.com/
- Tailwind CSS: https://tailwindcss.com/docs
