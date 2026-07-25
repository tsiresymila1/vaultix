/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0D1114",
        foreground: "#F4F7F5",
        card: "#151B1E",
        "card-foreground": "#F4F7F5",
        elevated: "#1B2327",
        primary: "#62E6A7",
        "primary-foreground": "#07110C",
        secondary: "#232C31",
        "secondary-foreground": "#F4F7F5",
        muted: "#20282C",
        "muted-foreground": "#8F9BA3",
        accent: "#7EB6FF",
        warning: "#F6C86B",
        border: "#263137",
        input: "#141A1D",
        destructive: "#FF6B6B",
        ring: "#62E6A7",
      },
      fontFamily: {
        sans: ["Outfit_400Regular"],
        medium: ["Outfit_500Medium"],
        semibold: ["Outfit_600SemiBold"],
        bold: ["Outfit_700Bold"],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "8px",
      },
    },
  },
  plugins: [],
};
