/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        shogun: {
          red: "#e94560",
          "red-light": "#ff6b81",
          navy: "#1a1a2e",
          "navy-light": "#16213e",
          ocean: "#0f3460",
          text: "#f5f5f5",
          muted: "#a0a0b0",
        },
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans JP", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
