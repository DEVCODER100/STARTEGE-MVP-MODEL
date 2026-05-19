import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        "bg-primary": "#FFFFFF",      // page canvas (pure white)
        "bg-sidebar": "#F7F6F3",      // off-white sidebar (Notion-style)
        "bg-surface": "#FFFFFF",      // cards, inputs
        "bg-soft": "#FAFAF7",         // subtle hover/section bg
        "bg-accent-dk": "#ECF8F2",    // accent tint (selected pills, callouts)

        // Borders
        border: "#E6E6E0",            // hairline 1px
        "border-strong": "#D4D4CD",   // hover/focused

        // Accent (darker teal for light bg contrast)
        accent: "#0F8A60",
        "accent-light": "#0B6E4E",    // hover (darker)

        // Text
        "text-primary": "#1A1A1A",
        "text-secondary": "#5C5C57",
        "text-muted": "#8A8A82",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "ui-serif", "Georgia", "serif"],
      },
      borderRadius: {
        DEFAULT: "10px",
        card: "16px",
        pill: "9999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
        elevated:
          "0 4px 6px -1px rgba(16,24,40,0.04), 0 10px 15px -3px rgba(16,24,40,0.08)",
        focus: "0 0 0 3px rgba(15,138,96,0.18)",
      },
    },
  },
  plugins: [],
};
export default config;
