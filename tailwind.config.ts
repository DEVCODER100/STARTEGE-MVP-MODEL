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
        ink: "#171713",
        paper: "#F5F1E8",
        canvas: "#FBFAF6",
        strategy: {
          DEFAULT: "#087A55",
          deep: "#064B39",
          tint: "#E7F1EC",
        },
        accent: {
          DEFAULT: "#E8793B",
          light: "#C75F27",
          tint: "#FBEADF",
        },
        rule: "#D8D2C5",
        muted: "#706D65",
        // Surfaces
        "bg-primary": "#FFFFFF",      // page canvas (pure white)
        "bg-sidebar": "#F7F6F3",      // off-white sidebar (Notion-style)
        "bg-surface": "#FFFFFF",      // cards, inputs
        "bg-soft": "#FAFAF7",         // subtle hover/section bg
        "bg-accent-dk": "#ECF8F2",    // accent tint (selected pills, callouts)

        // Borders
        border: "#E6E6E0",            // hairline 1px
        "border-strong": "#D4D4CD",   // hover/focused

        // Text
        "text-primary": "#1A1A1A",
        "text-secondary": "#5C5C57",
        "text-muted": "#8A8A82",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        label: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.08em" }],
      },
      borderRadius: {
        DEFAULT: "8px",
        card: "12px",
        artifact: "14px",
        pill: "9999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
        elevated:
          "0 4px 6px -1px rgba(16,24,40,0.04), 0 10px 15px -3px rgba(16,24,40,0.08)",
        focus: "0 0 0 3px rgba(15,138,96,0.18)",
        artifact:
          "0 1px 2px rgba(23,23,19,0.04), 0 8px 24px -8px rgba(23,23,19,0.12)",
        raised:
          "0 1px 2px rgba(23,23,19,0.05), 0 18px 40px -16px rgba(23,23,19,0.18)",
      },
      transitionTimingFunction: {
        desk: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        micro: "150ms",
        panel: "300ms",
      },
    },
  },
  plugins: [],
};
export default config;
