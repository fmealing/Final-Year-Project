/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary:    "#39FF6A",
        background: "#111310",
        secondary:  "#1F2E22",
        neutral:    "#8A9E8D",
        warning:    "#FF4444",
        white:      "#F0F7F1",
      },
      fontFamily: {
        grotesk:       ["SpaceGrotesk_400Regular"],
        "grotesk-med": ["SpaceGrotesk_500Medium"],
        "grotesk-sb":  ["SpaceGrotesk_600SemiBold"],
        "grotesk-bold":["SpaceGrotesk_700Bold"],
        mono:          ["SpaceMono_400Regular"],
        "mono-bold":   ["SpaceMono_700Bold"],
      },
    },
  },
  plugins: [],
};
