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
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      fontFamily: {
        sans: [
          '"Helvetica Neue"',
          "Helvetica",
          "Arial",
          '"Liberation Sans"',
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
