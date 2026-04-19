import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        critical: "var(--color-critical)",
        warning: "var(--color-warning)",
        stable: "var(--color-stable)",
        discharge: "var(--color-discharge)",
        accent: "var(--color-accent)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        button: "var(--radius-button)",
        input: "var(--radius-input)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
