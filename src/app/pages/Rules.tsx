export default function Rules() {
  return (
    <div className="container-max space-y-8 max-w-4xl mx-auto">
      <div className="space-y-4 mb-12">
        <h1 className="art-deco-title text-5xl">How to Play Flip 7</h1>
        <p className="text-lg text-[#b3bcc5]">
          Master the rules and learn the strategy behind this classic press-your-luck card game.
        </p>
      </div>

      {/* Objective */}
      <section className="card space-y-4">
        <h2 className="text-3xl font-bold text-[#d4af37]">Objective</h2>
        <p className="text-[#b3bcc5] leading-relaxed">
          Be the first player to score <span className="font-mono font-bold text-[#ffd60a]">200 points</span> to win.
          You score points based on the total value of cards in your line. The more valuable a card is, the more
          copies exist in the deck.
        </p>
        <div className="bg-[#252d47] border-l-4 border-[#d4af37] p-4 rounded-r-lg space-y-2">
          <p className="font-bold text-[#d4af37]">⭐ The Flip 7 Bonus</p>
          <p className="text-[#b3bcc5]">
            If you successfully Flip 7 unique Number cards into your line, you automatically end the round for
            everyone and score a <span className="text-[#ffd60a] font-bold">+15 bonus</span>!
          </p>
        </div>
      </section>

      <div className="art-deco-divider"></div>

      {/* Deck */}
      <section className="card space-y-6">
        <h2 className="text-3xl font-bold text-[#d4af37]">The Deck</h2>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00d9ff]">Number Cards (79 cards)</h3>
          <p className="text-[#b3bcc5]">
            The deck contains cards numbered 0–12. Each number appears as many times as its value:
          </p>
          <ul className="space-y-2 text-[#b3bcc5]">
            <li className="flex items-center gap-3">
              <span className="text-[#d4af37]">◆</span>
              <span><span className="font-mono font-bold">12</span> cards worth 12 points each</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-[#d4af37]">◆</span>
              <span><span className="font-mono font-bold">11</span> cards worth 11 points each</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-[#d4af37]">◆</span>
              <span>... and so on down to <span className="font-mono font-bold">1</span> card worth 0 points</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-[#ffd60a]">⭐</span>
              <span>The <span className="font-mono font-bold">ZERO</span> increases your chances of getting Flip 7!</span>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00d9ff]">Score Modifier Cards (6 cards)</h3>
          <p className="text-[#b3bcc5]">These cards modify your total score:</p>
          <div className="grid md:grid-cols-2 gap-4">
            {["+2", "+4", "+6", "+8", "+10", "x2"].map((modifier) => (
              <div key={modifier} className="bg-[#252d47] p-4 rounded-lg border border-[#3a4563]">
                <p className="font-mono font-bold text-[#ffd60a]">{modifier}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-[#6b7684] italic">
            Note: <span className="font-mono">x2</span> doesn't apply if you have no number cards
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00d9ff]">Action Cards (9 cards total)</h3>
          <p className="text-[#b3bcc5]">These cards affect other players:</p>
          <div className="space-y-3">
            <div className="bg-[#252d47] p-4 rounded-lg border-l-4 border-[#ff006e]">
              <p className="font-mono font-bold text-[#ff006e] mb-2">🧊 FREEZE (3 cards)</p>
              <p className="text-[#b3bcc5]">The receiving player banks all current points and exits the round.</p>
            </div>
            <div className="bg-[#252d47] p-4 rounded-lg border-l-4 border-[#ff006e]">
              <p className="font-mono font-bold text-[#ff006e] mb-2">🃏 FLIP THREE (3 cards)</p>
              <p className="text-[#b3bcc5]">The receiving player must accept the next three cards. Stop if they Flip 7 or bust.</p>
            </div>
            <div className="bg-[#252d47] p-4 rounded-lg border-l-4 border-[#ff006e]">
              <p className="font-mono font-bold text-[#ff006e] mb-2">💫 SECOND CHANCE (3 cards)</p>
              <p className="text-[#b3bcc5]">Discard a duplicate card and this card. You can only have one Second Chance at a time.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="art-deco-divider"></div>

      {/* How to Play */}
      <section className="card space-y-6">
        <h2 className="text-3xl font-bold text-[#d4af37]">How to Play</h2>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00d9ff]">Setup</h3>
          <p className="text-[#b3bcc5]">
            The dealer shuffles the deck thoroughly. Going in turn order, each player receives one card face up.
            If an action card appears, it's resolved immediately before continuing.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00d9ff]">Starting the Round</h3>
          <p className="text-[#b3bcc5]">
            The dealer offers each player the option to <span className="font-mono font-bold">"Hit"</span> (draw another card)
            or <span className="font-mono font-bold">"Stay"</span> (exit the round).
          </p>
          <div className="bg-[#252d47] border-l-4 border-[#06d6a0] p-4 rounded-r-lg">
            <p className="text-[#b3bcc5]">
              💡 <span className="font-bold">Bust?</span> If you draw a card matching a number already in your hand, you bust
              instantly and score <span className="font-mono text-[#ef476f]">0 points</span> this round.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00d9ff]">Ending the Round</h3>
          <p className="text-[#b3bcc5]">The round ends when:</p>
          <ul className="space-y-2 text-[#b3bcc5]">
            <li className="flex items-center gap-3">
              <span className="text-[#d4af37]">◆</span>
              <span>All players have either busted or chosen to stay, OR</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-[#ffd60a]">⭐</span>
              <span>One player Flips 7 unique numbers (ending it for everyone)</span>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00d9ff]">Next Round</h3>
          <p className="text-[#b3bcc5]">
            All cards from the round are set aside. The player to the left of the dealer becomes the new dealer.
            When the deck runs out, shuffle the discarded cards to form a new deck.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00d9ff]">Ending the Game</h3>
          <p className="text-[#b3bcc5]">
            At the end of a round, if at least one player has reached <span className="font-mono font-bold text-[#ffd60a]">200 points</span>,
            the player with the most points wins!
          </p>
        </div>
      </section>

      <div className="art-deco-divider"></div>

      {/* Strategy Tips */}
      <section className="card space-y-6">
        <h2 className="text-3xl font-bold text-[#d4af37]">Strategy Tips</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[#252d47] p-4 rounded-lg border border-[#3a4563]">
            <p className="font-bold text-[#00d9ff] mb-2">Watch the Deck</p>
            <p className="text-sm text-[#b3bcc5]">
              Track which cards have been revealed. If you need a low number to Flip 7 and most are gone, it might be safer to stand.
            </p>
          </div>

          <div className="bg-[#252d47] p-4 rounded-lg border border-[#3a4563]">
            <p className="font-bold text-[#00d9ff] mb-2">Count Duplicates</p>
            <p className="text-sm text-[#b3bcc5]">
              Higher numbers have more duplicates (12 appears 12 times!). Drawing a 12 when you already have one is risky.
            </p>
          </div>

          <div className="bg-[#252d47] p-4 rounded-lg border border-[#3a4563]">
            <p className="font-bold text-[#00d9ff] mb-2">Action Cards Matter</p>
            <p className="text-sm text-[#b3bcc5]">
              Pay attention to who has Freeze, Flip Three, or Second Chance. These can dramatically shift the round.
            </p>
          </div>

          <div className="bg-[#252d47] p-4 rounded-lg border border-[#3a4563]">
            <p className="font-bold text-[#00d9ff] mb-2">Risk vs. Reward</p>
            <p className="text-sm text-[#b3bcc5]">
              The Flip 7 bonus is worth 15 points, but getting all 7 unique cards is hard. Know when to push and when to fold.
            </p>
          </div>
        </div>
      </section>

      {/* External Resources */}
      <section className="card text-center space-y-4">
        <p className="text-[#b3bcc5]">
          Want to see the game in action?
        </p>
        <a
          href="https://www.youtube.com/watch?v=rX9BG34YOT0"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary inline-block"
        >
          🎥 Watch Official Rules Video
        </a>
      </section>
    </div>
  );
}
