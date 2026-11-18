import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0b0f1a",
          900: "#111827",
          800: "#1b2436",
          700: "#273349",
        },
        flame: {
          400: "#ffb454",
          500: "#ff8a3d",
          600: "#f2622e",
        },
        mint: {
          400: "#4ade80",
          500: "#22c55e",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
