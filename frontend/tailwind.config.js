/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // ── Auralis (khu vực Bệnh nhân / Bác sĩ) — giá trị trong src/index.css ──
        background: token("background"),
        foreground: token("foreground"),
        card: { DEFAULT: token("card"), foreground: token("foreground") },
        popover: { DEFAULT: token("card"), foreground: token("foreground") },
        primary: { DEFAULT: token("primary"), foreground: token("primary-foreground") },
        secondary: { DEFAULT: token("tile"), foreground: token("tertiary"), strong: token("secondary") },
        tertiary: token("tertiary"),
        subtle: token("neutral"),
        tile: { DEFAULT: token("tile"), strong: token("tile-strong") },
        muted: { DEFAULT: token("tile"), foreground: token("secondary") },
        accent: { DEFAULT: token("accent"), foreground: token("primary-foreground"), soft: token("accent-soft") },
        banner: token("banner"),
        sky: token("sky"),
        lavender: { DEFAULT: token("lavender"), ink: token("lavender-ink") },
        destructive: { DEFAULT: token("danger"), foreground: token("primary-foreground"), soft: token("danger-soft") },
        border: token("border"),
        input: token("input"),
        ring: token("primary"),

        // ── Tên màu cũ, nay ánh xạ về bảng màu #CFEBDF · #4E635A · #9AB0A7 · #DCE4FF · #A5ADC8 ──
        ink: {
          DEFAULT: "#1F2B26",
          soft: "#384841",
          faint: "#566860",
        },
        paper: {
          DEFAULT: "#EFF6F3",
          raised: "#FFFFFF",
          sunken: "#E4F3EC",
        },
        teal: {
          50: "#E4F3EC",
          100: "#CFEBDF",
          200: "#B5D3C6",
          300: "#9AB0A7",
          400: "#6E857B",
          500: "#4E635A",
          600: "#435750",
          700: "#384841",
          800: "#2C3A34",
          900: "#1F2B26",
        },
        gold: {
          50: "#FBF3E2",
          100: "#F4E0B3",
          200: "#EACB80",
          300: "#E1B75B",
          400: "#D9A441",
          500: "#C08D2E",
          600: "#9C7124",
        },
        clay: {
          50: "#FBEBE8",
          400: "#DE7A6B",
          500: "#C4483D",
          600: "#A23931",
        },
        leaf: {
          50: "#E8F5EE",
          400: "#4EAE83",
          500: "#2E8B67",
          600: "#227354",
        },
        slate: {
          50: "#F3F8F6",
          100: "#E4EEE9",
          200: "#D6E4DD",
          300: "#9AB0A7",
          400: "#7A8F86",
        },
      },
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-lg": ["3rem", { lineHeight: "1.05", letterSpacing: "-0.035em", fontWeight: "700" }],
        "display-md": ["2.25rem", { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "700" }],
        "headline": ["1.5rem", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        "title": ["1.125rem", { lineHeight: "1.35", letterSpacing: "-0.01em", fontWeight: "600" }],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(31, 43, 38, 0.06)",
        card: "0 8px 24px -12px rgba(78, 99, 90, 0.18)",
        pop: "0 16px 40px -12px rgba(78, 99, 90, 0.28)",
        float: "0 12px 32px -12px rgba(0, 0, 0, 0.25)",
        hairline: "0 1px 2px rgba(0, 0, 0, 0.04)",
      },
      borderRadius: {
        xl2: "1.1rem",
        field: "12px",
        card: "24px",
        tile: "20px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        "slide-up": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "slide-up": "slide-up 0.35s cubic-bezier(0.16,1,0.3,1)",
      },
    },
  },
  plugins: [],
}
