/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#FAFBF8",
        foreground: "#202820",
        card: "#EEF1EA",
        "card-foreground": "#202820",
        elevated: "#E0EADC",
        primary: "#31563B",
        "primary-foreground": "#FAFBF8",
        secondary: "#EEF1EA",
        "secondary-foreground": "#202820",
        muted: "#EEF1EA",
        "muted-foreground": "#697166",
        accent: "#31563B",
        warning: "#80622D",
        border: "#E3E7DE",
        input: "#EEF1EA",
        destructive: "#B3261E",
        ring: "#31563B",
      },
      fontFamily: {
        sans: ["sans-serif"],
        medium: ["sans-serif"],
        semibold: ["sans-serif"],
        bold: ["sans-serif"],
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
