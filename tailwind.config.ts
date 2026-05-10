import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: "#FDF5E6",
          50: "#FFFCF6",
          100: "#FDF5E6",
          200: "#F7E7C8",
          300: "#EDD49E",
        },
        teal: {
          50: "#E6F2F6",
          100: "#BFDCE6",
          200: "#8CC0D0",
          400: "#1B7A9C",
          500: "#00688B",
          600: "#005775",
          700: "#00445C",
          800: "#003244",
          900: "#001E2A",
        },
        sand: {
          50: "#FAF3E5",
          100: "#F1E1BF",
          200: "#E5CB92",
          400: "#D4A95B",
          500: "#C9A96E",
          600: "#A8893F",
          700: "#7E6831",
        },
        // Karaoke neon accent only
        neon: {
          pink: "#FF3D81",
          violet: "#A855F7",
          cyan: "#22D3EE",
        },
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "teal-gradient":
          "linear-gradient(135deg, #001E2A 0%, #00445C 45%, #00688B 100%)",
        "ivory-gradient":
          "linear-gradient(180deg, #FFFCF6 0%, #FDF5E6 60%, #F7E7C8 100%)",
        "neon-night":
          "radial-gradient(circle at 20% 20%, rgba(255,61,129,0.35), transparent 50%), radial-gradient(circle at 80% 30%, rgba(168,85,247,0.35), transparent 50%), radial-gradient(circle at 50% 80%, rgba(34,211,238,0.25), transparent 55%), linear-gradient(135deg, #0b0420 0%, #1a0b3d 50%, #2d0b5c 100%)",
      },
      boxShadow: {
        soft: "0 10px 40px -10px rgba(0, 68, 92, 0.25)",
        glow: "0 0 40px rgba(255, 61, 129, 0.45)",
        sand: "0 10px 30px -10px rgba(201, 169, 110, 0.5)",
      },
      animation: {
        "slow-zoom": "slow-zoom 18s ease-in-out infinite alternate",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
      },
      keyframes: {
        "slow-zoom": {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.08)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%,100%": { boxShadow: "0 0 25px rgba(255,61,129,0.4)" },
          "50%": { boxShadow: "0 0 55px rgba(255,61,129,0.8)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
