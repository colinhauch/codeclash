import type { GameState, PlayerState } from "../../game/types";
import Card from "./Card";

interface GameVisualizerProps {
  gameState: GameState;
}

export default function GameVisualizer({ gameState }: GameVisualizerProps) {
  const getPlayerDisplay = (player: PlayerState, isCurrentPlayer: boolean) => {
    const statusColor = player.busted
      ? "text-[#ef476f]"
      : player.stood
        ? "text-[#06d6a0]"
        : "text-[#00d9ff]";

    return (
      <div
        key={player.id}
        className={`card ${isCurrentPlayer ? "ring-2 ring-[#ffd60a] ring-offset-2 ring-offset-[#0a0e27]" : ""}`}
      >
        {/* Player Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-[#d4af37]/30">
          <div>
            <h4 className="font-mono font-bold text-lg">{player.id}</h4>
            <p className={`text-sm font-mono font-semibold ${statusColor}`}>
              {player.busted ? "BUSTED" : player.stood ? "STOOD" : "ACTIVE"}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-mono font-bold text-[#d4af37]">
              {player.numberTotal}
            </div>
            <p className="text-xs text-[#6b7684]">points</p>
          </div>
        </div>

        {/* Cards Display */}
        <div className="space-y-4">
          {/* Number Cards */}
          <div>
            <p className="text-xs text-[#6b7684] font-mono font-semibold mb-3 tracking-widest">
              NUMBERS
            </p>
            <div className="flex flex-wrap gap-2">
              {player.cards.filter((c) => c.type === "number").length > 0 ? (
                player.cards
                  .filter((c) => c.type === "number")
                  .map((card, idx) => (
                    <div key={idx} className="w-16 h-24">
                      <Card card={card} active={isCurrentPlayer} busted={player.busted} />
                    </div>
                  ))
              ) : (
                <p className="text-xs text-[#6b7684]">No number cards</p>
              )}
            </div>
          </div>

          {/* Modifier Cards */}
          {player.cards.some((c) => c.type === "modifier") && (
            <div>
              <p className="text-xs text-[#6b7684] font-mono font-semibold mb-3 tracking-widest">
                MODIFIERS
              </p>
              <div className="flex flex-wrap gap-2">
                {player.cards
                  .filter((c) => c.type === "modifier")
                  .map((card, idx) => (
                    <div key={idx} className="w-16 h-24">
                      <Card card={card} />
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Action Cards */}
          {player.cards.some((c) => c.type === "action") && (
            <div>
              <p className="text-xs text-[#6b7684] font-mono font-semibold mb-3 tracking-widest">
                ACTIONS
              </p>
              <div className="flex flex-wrap gap-2">
                {player.cards
                  .filter((c) => c.type === "action")
                  .map((card, idx) => (
                    <div key={idx} className="w-16 h-24">
                      <Card card={card} />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Deck Info */}
        <div className="mt-6 pt-4 border-t-2 border-[#d4af37]/30 flex items-center justify-between text-sm">
          <div>
            <p className="text-xs text-[#6b7684] font-mono">Cards Remaining</p>
            <p className="font-mono font-bold text-[#00d9ff] text-lg">
              {gameState.deck.length}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#6b7684] font-mono">Total Score</p>
            <p className="font-mono font-bold text-[#d4af37] text-lg">
              {player.totalScore}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const getCompactPlayerDisplay = (player: PlayerState, isCurrentPlayer: boolean) => {
    const statusColor = player.busted
      ? "text-[#ef476f]"
      : player.stood
        ? "text-[#06d6a0]"
        : "text-[#00d9ff]";

    const statusText = player.busted ? "BUST" : player.stood ? "STOOD" : "ACTIVE";

    return (
      <div
        key={player.id}
        className={`p-3 rounded-lg bg-[#151a30] border ${
          isCurrentPlayer
            ? "border-[#ffd60a] ring-1 ring-[#ffd60a]"
            : "border-[#3a4563]"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="font-mono font-bold text-sm truncate">{player.id}</p>
            <p className={`text-xs font-mono font-semibold ${statusColor}`}>
              {statusText}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xl font-mono font-bold text-[#d4af37]">
              {player.numberTotal}
            </p>
            <p className="text-xs text-[#6b7684] font-mono">
              {player.cards.length} cards / {player.totalScore} total
            </p>
          </div>
        </div>
      </div>
    );
  };

  const isCompact = gameState.players.length > 4;

  const currentPlayer =
    gameState.players[gameState.currentPlayerIndex];
  const otherPlayers = gameState.players.filter(
    (p) => p.id !== currentPlayer.id
  );

  return (
    <div className="space-y-8">
      {/* Current Player - Featured */}
      <div>
        <h3 className="art-deco-title text-2xl mb-6">
          {currentPlayer.busted ? "X" : currentPlayer.stood ? "+" : ">"} Current
          Player
        </h3>
        {getPlayerDisplay(currentPlayer, true)}
      </div>

      {/* Other Players */}
      {otherPlayers.length > 0 && (
        <div>
          <h3 className="art-deco-title text-2xl mb-6">Opponents</h3>
          {isCompact ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {otherPlayers.map((player) =>
                getCompactPlayerDisplay(player, false)
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {otherPlayers.map((player) => getPlayerDisplay(player, false))}
            </div>
          )}
        </div>
      )}

      {/* Game Status */}
      <div className="card-elevated">
        <div className="grid md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-[#6b7684] font-mono mb-2">ROUND</p>
            <p className="text-3xl font-mono font-bold text-[#d4af37]">
              {gameState.round}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6b7684] font-mono mb-2">PLAYERS</p>
            <p className="text-3xl font-mono font-bold text-[#00d9ff]">
              {gameState.players.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6b7684] font-mono mb-2">DECK</p>
            <p className="text-3xl font-mono font-bold text-[#06d6a0]">
              {gameState.deck.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6b7684] font-mono mb-2">STATUS</p>
            <p className="text-xl font-mono font-bold text-[#ffd60a]">
              {gameState.gameOver ? "FINISHED" : "ACTIVE"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
