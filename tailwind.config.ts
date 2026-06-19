import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "#1D9E75", foreground: "#FFFFFF" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "DM Sans", "sans-serif"],
        serif: ["var(--font-serif)", "DM Serif Display", "serif"],
      },
      borderRadius: { lg: "12px", xl: "16px", "2xl": "20px" },
      boxShadow: { soft: "0 12px 36px rgba(28,28,26,.08)" },
    },
  },
  plugins: [tailwindcssAnimate],
};
export default config;
