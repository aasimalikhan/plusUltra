import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "hsl(var(--bg) / <alpha-value>)",
          subtle: "hsl(var(--bg-subtle) / <alpha-value>)",
          card: "hsl(var(--bg-card) / <alpha-value>)",
          border: "hsl(var(--bg-border) / <alpha-value>)",
        },
        fg: {
          DEFAULT: "hsl(var(--fg) / <alpha-value>)",
          muted: "hsl(var(--fg-muted) / <alpha-value>)",
          subtle: "hsl(var(--fg-subtle) / <alpha-value>)",
        },
        accent: {
          rich: "hsl(var(--accent-rich) / <alpha-value>)",
          muscular: "hsl(var(--accent-muscular) / <alpha-value>)",
          intelligent: "hsl(var(--accent-intelligent) / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: "0.625rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      letterSpacing: {
        brand: "-0.02em",
      },
      boxShadow: {
        card: "0 1px 0 hsl(0 0% 100% / 0.04) inset, 0 8px 24px -8px hsl(0 0% 0% / 0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
