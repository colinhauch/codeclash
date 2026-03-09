/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        serif: ["'Cinzel'", "serif"],
        mono: ["'Space Mono'", "monospace"],
      },
      colors: {
        // CodeClash brand colors - Art Deco inspired
        clash: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        // Art Deco palette
        gold: "#d4af37",
        copper: "#b87333",
        silver: "#c0c0c0",
      },
      animation: {
        "card-flip": "cardFlip 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "page-in": "pageIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        "score-popup": "scorePopup 1.5s ease-out forwards",
        "pulse-glow": "pulseGlow 2s infinite",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
  safelist: [
    "bg-[#0a0e27]",
    "bg-[#1a1f3a]",
    "bg-[#252d47]",
    "text-[#f5f7fa]",
    "text-[#b3bcc5]",
    "text-[#6b7684]",
    "border-[#2d3748]",
    "border-[#3a4563]",
    "border-[#d4af37]",
    "text-[#d4af37]",
    "text-[#00d9ff]",
    "text-[#ffd60a]",
    "text-[#ff006e]",
    "text-[#ef476f]",
    "text-[#06d6a0]",
  ],
};
