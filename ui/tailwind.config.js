/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0A0A0A",
        surface: "#111111",
        "surface-alt": "#1A1A1A",
        "input-bg": "#161616",
        border: "#2A2A2A",
        "border-subtle": "#1F1F1F",
        gold: "#C9A84C",
        "gold-light": "#E2C97E",
        "gold-dim": "#7A6330",
        "text-primary": "#F0EDE8",
        "text-secondary": "#8A8580",
        "text-disabled": "#3D3B38",
        "status-active": "#3DAA6E",
        "status-warn": "#C4873A",
        "status-error": "#B84455",
        "status-info": "#3A6EA8",
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans JP", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        xs: "11px",
        sm: "13px",
        base: "15px",
        md: "17px",
        lg: "21px",
        xl: "28px",
        "2xl": "36px",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "14px",
      },
      boxShadow: {
        sm: "0 1px 3px rgba(0,0,0,0.6)",
        md: "0 4px 16px rgba(0,0,0,0.7)",
        lg: "0 12px 40px rgba(0,0,0,0.8)",
        glow: "0 0 24px rgba(201,168,76,0.12)",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "40px",
        "2xl": "64px",
      },
      animation: {
        "gold-pulse": "gold-pulse 2s ease-in-out infinite",
      },
      keyframes: {
        "gold-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
    },
  },
  plugins: [],
};
