import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        surface: "var(--surface)",
        "surface-raised": "var(--surface-raised)",
        "surface-sunken": "var(--surface-sunken)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        "ink-muted": "var(--ink-muted)",
        border: "var(--border)",
        cta: "var(--cta)",
        "cta-hover": "var(--cta-hover)",
        terracotta: "var(--terracotta)",
        "terracotta-hover": "var(--terracotta-hover)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        "streak-current": "var(--streak-current)",
        "streak-missed": "var(--streak-missed)",
        // legacy aliases (để các file chưa migrate vẫn render)
        cream: {
          50: "#FFFEF7",
          100: "#F5F2E9",
          200: "#EBE5D6",
          300: "#D8D8CA",
        },
        cocoa: {
          500: "#8A968D",
          600: "#58665B",
          700: "#23382D",
          800: "#1A2921",
        },
        leaf: {
          300: "#A8D5C0",
          400: "#6CB898",
          500: "#285A44",
          600: "#1F4736",
        },
      },
      fontFamily: {
        cozy: ["var(--font-baloo)", "system-ui", "sans-serif"],
        body: ["var(--font-quicksand)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(35,56,45,0.04), 0 8px 24px -8px rgba(35,56,45,0.12)",
        "card-press": "0 1px 2px rgba(35,56,45,0.04), 0 2px 8px -4px rgba(35,56,45,0.10)",
        button: "0 1px 2px rgba(35,56,45,0.08), 0 4px 12px -4px rgba(31,71,54,0.28)",
      },
      maxWidth: {
        app: "1160px",
      },
    },
  },
  plugins: [],
};

export default config;
