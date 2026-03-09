import type { Card as CardType } from "../../game/types";

interface CardProps {
  card: CardType;
  faceDown?: boolean;
  animated?: boolean;
  active?: boolean;
  busted?: boolean;
  className?: string;
}

export default function Card({
  card,
  faceDown = false,
  animated = false,
  active = false,
  busted = false,
  className = "",
}: CardProps) {
  if (faceDown) {
    return (
      <div
        className={`playing-card face-down ${animated ? "flip-in" : ""} ${className}`}
      >
        <div className="w-full h-full flex items-center justify-center text-[#9d4edd] font-mono text-2xl font-bold opacity-50">
          ?
        </div>
      </div>
    );
  }

  const isAction = card.type === "action";
  const isModifier = card.type === "modifier";
  const isNumber = card.type === "number";

  return (
    <div
      className={`playing-card ${animated ? "flip-in" : ""} ${
        active ? "active" : ""
      } ${busted ? "busted" : ""} ${isModifier ? "wild" : ""} ${className}`}
    >
      <div className="w-full h-full flex flex-col items-center justify-center relative p-4">
        {/* Art Deco Corner Accents */}
        <div className="absolute top-3 left-3 corner-accent"></div>
        <div className="absolute top-3 right-3 corner-accent"></div>
        <div className="absolute bottom-3 left-3 corner-accent"></div>
        <div className="absolute bottom-3 right-3 corner-accent"></div>

        {/* Card Content */}
        {isNumber && (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="text-6xl font-mono font-bold text-[#d4af37] drop-shadow-lg">
              {(card as any).value}
            </div>
            <div className="text-xs font-mono text-[#6b7684] font-semibold tracking-widest">
              ◆ NUMBER ◆
            </div>
            <div className="w-8 h-px bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-40"></div>
          </div>
        )}

        {isModifier && (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="text-5xl font-bold font-mono text-[#0a0e27] drop-shadow-lg">
              {(card as any).modifier}
            </div>
            <div className="text-xs font-mono text-[#0a0e27] font-semibold tracking-widest">
              ◆ MODIFIER ◆
            </div>
            <div className="w-8 h-px bg-gradient-to-r from-transparent via-[#0a0e27] to-transparent opacity-40"></div>
          </div>
        )}

        {isAction && (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="text-2xl font-mono font-bold text-[#ff006e] uppercase text-center leading-tight">
              {(card as any).action === "freeze" && "🧊"}
              {(card as any).action === "flip-three" && "🃏"}
              {(card as any).action === "second-chance" && "💫"}
            </div>
            <div className="text-xs font-mono font-semibold text-[#ff006e] tracking-widest uppercase">
              {(card as any).action === "freeze" && "FREEZE"}
              {(card as any).action === "flip-three" && "FLIP 3"}
              {(card as any).action === "second-chance" && "SECOND CHANCE"}
            </div>
            <div className="w-8 h-px bg-gradient-to-r from-transparent via-[#ff006e] to-transparent opacity-40"></div>
          </div>
        )}
      </div>
    </div>
  );
}
