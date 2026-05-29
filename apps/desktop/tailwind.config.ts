/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          0: "var(--surface-0)",
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
        },
        accent: "var(--accent)",
        "accent-fg": "var(--accent-fg)",
        border: "var(--border)",
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro",
          "SF Pro Text",
          "Helvetica Neue",
          "sans-serif",
        ],
        mono: [
          "SF Mono",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["10px", "14px"],
        xs: ["11px", "16px"],
        sm: ["12px", "16px"],
        base: ["13px", "18px"],
        lg: ["14px", "20px"],
      },
      spacing: {
        sidebar: "250px",
        "panel-right": "350px",
        "row-height": "32px",
      },
      borderRadius: {
        mac: "6px",
        "mac-sm": "4px",
      },
      transitionDuration: {
        "150": "150ms",
        "200": "200ms",
      },
    },
  },
  plugins: [],
};
