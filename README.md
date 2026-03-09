# CodeClash 🎮⚔️

Bot tournament arena for hack nights. Write bots, compete in tournaments, claim victory.

## Current Game: Flip 7

A push-your-luck card game where you try to get as close to 7 as possible without going over.

## Quick Start

```bash
# Install dependencies
bun install

# Copy the bot template
cp submissions/_template.ts submissions/my-bot.ts

# Edit your bot
# (implement your strategy in submissions/my-bot.ts)

# Test against example bots
bun run test my-bot random --games 50
bun run test my-bot probability --games 100

# Submit your bot
git add submissions/my-bot.ts
git commit -m "Add my-bot"
git push
```

## Writing Your First Bot

Your bot is a function that receives the game state and returns a move:

```typescript
import type { Bot, VisibleGameState, BotContext, Move } from "../src/game/types";
import { helpers } from "../src/game/helpers";

export const name = "My Bot";
export const author = "Your Name";

export const bot: Bot = (state: VisibleGameState, ctx: BotContext): Move => {
  // Your strategy here!
  
  // Example: Draw if bust probability is low
  const analysis = helpers.analyzeState(state, ctx);
  
  if (analysis.bustProb < 0.4) {
    return helpers.draw();
  }
  
  return helpers.stand();
};
```

See [Bot Writing Guide](https://codeclash.colinhauch.com/guide) for details.

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start local dev server |
| `bun run test <bot> <opponent>` | Test your bot |
| `bun run tournament` | Run full tournament |
| `bun run deploy` | Deploy to Cloudflare |

## Game Rules

- Deck has 28 cards: values 1-6 (4 each) plus 4 wild cards
- On your turn: **Draw** a card or **Stand**
- Wild cards let you choose any value 1-7
- Going over 7 = **Bust** (score 0)
- Highest total wins (7 is perfect!)

See [Full Rules](https://codeclash.colinhauch.com/rules) for details.

## Links

- 🎯 [Tournament Results](https://codeclash.colinhauch.com/results)
- 📖 [Game Rules](https://codeclash.colinhauch.com/rules)
- 🤖 [Bot Writing Guide](https://codeclash.colinhauch.com/guide)
- 📚 [API Reference](https://codeclash.colinhauch.com/api)

## License

MIT
