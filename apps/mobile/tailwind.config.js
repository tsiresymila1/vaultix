/** @type {import('tailwindcss').Config} */
// Mirrors the web theme (Supabase-green dark aesthetic) so mobile matches the app.
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#1c1c1c",
        foreground: "#fafafa",
        card: "#232323",
        "card-foreground": "#fafafa",
        primary: "#3ECF8E",
        "primary-foreground": "#1c1c1c",
        secondary: "#2e2e2e",
        "secondary-foreground": "#fafafa",
        muted: "#2e2e2e",
        "muted-foreground": "#a1a1aa",
        accent: "#2e2e2e",
        border: "#333333",
        input: "#2e2e2e",
        destructive: "#ef4444",
        ring: "#3ECF8E",
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
        lg: "10px",
      },
    },
  },
  plugins: [],
};
