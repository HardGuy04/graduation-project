/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#14231F",
          soft: "#3A4A45",
          faint: "#6B7A75",
        },
        paper: {
          DEFAULT: "#F4F7F5",
          raised: "#FFFFFF",
          sunken: "#EAEFEC",
        },
        teal: {
          50: "#EAF4F2",
          100: "#CFE6E1",
          200: "#A3CFC6",
          300: "#72B5A8",
          400: "#3F9683",
          500: "#0F5C56",
          600: "#0C4C47",
          700: "#0A3E3A",
          800: "#082F2C",
          900: "#06211F",
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
          50: "#F3F6F5",
          100: "#E5EAE8",
          200: "#D2DAD7",
          300: "#AFBAB5",
          400: "#8B978F",
        },
      },
      fontFamily: {
        display: ["Manrope", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(20, 35, 31, 0.06)",
        card: "0 8px 24px -12px rgba(15, 92, 86, 0.18)",
        pop: "0 16px 40px -12px rgba(15, 92, 86, 0.28)",
      },
      borderRadius: {
        xl2: "1.1rem",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: 0, transform: "translateY(4px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
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
