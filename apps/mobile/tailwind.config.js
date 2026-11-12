/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        foreground: "#09090B",
        card: "#FFFFFF",
        "card-foreground": "#09090B",
        elevated: "#E2F4E9",
        primary: "#32BE51",
        "primary-foreground": "#092312",
        secondary: "#F4F4F5",
        "secondary-foreground": "#171717",
        muted: "#F4F4F5",
        "muted-foreground": "#71717B",
        accent: "#F4F4F5",
        warning: "#80622D",
        border: "#E4E4E7",
        input: "#E4E4E7",
        destructive: "#E7000B",
        ring: "#32BE51",
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
        lg: "16px",
      },
    },
  },
  plugins: [],
};
