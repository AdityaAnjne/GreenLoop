/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "Inter",
          "system-ui",
          "avenir",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        emerald: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#0f9f74",
          600: "#0a7d5c",
          700: "#07634a",
          800: "#064e3b",
          900: "#033a2c",
        },
        harvest: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#e8a317",
          600: "#c1810c",
          700: "#976409",
        },
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(6, 78, 59, 0.18)",
      },
      backdropFilter: {
        glass: "blur(4px) saturate(180%)",
      },
    },
  },
  plugins: [],
};