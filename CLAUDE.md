# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Runtime & Commands

This project uses `bun` instead of `npm`. Always use the full path `~/.bun/bin/bun`.

```bash
# Type checking (no test framework — this is the primary correctness check)
~/.bun/bin/bun run typecheck

# Run a bot match locally
~/.bun/bin/bun run test submissions/mybot.ts submissions/aggressive.ts --games 10

# Run a full tournament across all submissions/
~/.bun/bin/bun run tournament

# Dev server (React SPA + Worker via Vite + @cloudflare/vite-plugin)
~/.bun/bin/bun run dev

# Build + deploy to Cloudflare
~/.bun/bin/bun run deploy

# Admin CLI (connect to live tournament)
~/.bun/bin/bun run admin --server codeclash.colinhauch.com --token <secret>
```

## Architecture

**Three-tier system on Cloudflare:**
- **React SPA** (`src/app/`) — served as static assets via `ASSETS` binding
- **Worker** (`worker/index.ts`) — routes HTTP + WebSocket; exports DO classes
- **Durable Objects** (`worker/lobby-do.ts`, `worker/match-do.ts`) — stateful, singleton-per-tournament

**Data flow:**
1. Participants connect WebSocket to `/ws/lobby` → `LobbyDO`
2. Admin sends `start` → LobbyDO generates matchups, creates `MatchDO` instances, assigns players
3. Players connect to `/ws/match/:id` → `MatchDO` runs N-game series using the game engine
4. MatchDO reports completion to LobbyDO via internal HTTP (`/match-complete`)
5. Results written to KV (`RESULTS` namespace); React SPA polls `/api/tournament/current`

**Game engine** (`src/game/`) is the authoritative source of truth — never modified by networking code:
- `types.ts` — all game types (Card, PlayerState, GameState, Move, GameEvent)
- `engine.ts` — `createInitialState`, `applyMove`, `endRound`, `isRoundOver`, `isGameOver`, `getWinner`
- `deck.ts` — 94-card deck (79 number 0–12, 6 modifier, 9 action), Fisher-Yates shuffle
- `helpers.ts` — utilities exported to bot authors (also used internally)
- `visibility.ts` — `toVisibleState()` strips deck draw order before sending to players; discard pile is fully visible

**Protocol** (`src/protocol/`) defines the WebSocket contracts:
- `messages.ts` — all discriminated union types for CLI↔LobbyDO and CLI↔MatchDO messages; `VisibleGameState` (deck contents hidden, discard pile visible)
- `kv-schema.ts` — KV key builders (`kvKeys.*`) and typed helpers (`kvGet`, `kvPut`)

**Bot submissions** (`submissions/`) implement `BotInfo` from `src/game/types.ts`. The bot function receives `GameState` and `myId: string`, returns `Move`.

## Key Design Decisions

- **Immutable game state** — engine uses `JSON.parse(JSON.stringify(...))` cloning throughout
- **WebSocket hibernation** — both DOs use `ctx.acceptWebSocket()` (not `new WebSocketPair()`); message handlers are `webSocketMessage()` / `webSocketClose()`
- **MatchDO → LobbyDO callback** — after a match completes, MatchDO fetches the LobbyDO stub at `/match-complete` with the `MatchResultReport`
- **Bracket winner tracking** — `MatchSummary.winner` is a player **name** (not ID); LobbyDO maintains a `nameToId` map for orchestration
- **Tournament formats** — `"bracket"` (single-elimination) and `"round-robin"` selectable at `start` time; LobbyDO handles both
- **Strict TypeScript** — `noUnusedLocals`, `noUnusedParameters` are enforced; prefix intentionally unused params with `_`
- **Match data format** — stored in KV as snake_case JSON matching `MatchSummary` interface (match_id, tournament_id, games_played, etc.)

## Cloudflare Config

`wrangler.jsonc` binds:
- `RESULTS` — KV namespace for all tournament/match data
- `LOBBY` / `MATCH` — Durable Object namespaces
- `ADMIN_SECRET` — secret (set via `wrangler secret put ADMIN_SECRET`)

Custom domain: `codeclash.colinhauch.com`
