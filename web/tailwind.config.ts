import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#fffaf0",
          100: "#fff6e0",
          200: "#f7e8c8",
          300: "#eedcae",
          400: "#e0c690",
        },
        cocoa: {
          500: "#8a7256",
          600: "#6b573f",
          700: "#5b4a35",
          800: "#463827",
        },
        leaf: {
          300: "#a8e6b8",
          400: "#7fd8a4",
          500: "#4fbe7d",
          600: "#3a9e64",
        },
        blush: {
          300: "#ffc9d4",
          400: "#ff9fb2",
          500: "#f26d8d",
        },
        lavender: {
          300: "#c9bdf5",
          400: "#a794e6",
          500: "#8b74d8",
        },
        skynight: {
          700: "#232a5e",
          800: "#1a2049",
          900: "#141938",
        },
      },
      fontFamily: {
        cozy: ["var(--font-baloo)", "system-ui", "sans-serif"],
        body: ["var(--font-quicksand)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        chunky: "0 4px 0 rgba(70,56,39,0.35)",
        chunkySm: "0 3px 0 rgba(70,56,39,0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
