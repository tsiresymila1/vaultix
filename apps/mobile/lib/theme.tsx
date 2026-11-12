import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";

export type ThemeMode = "light" | "dark";
export const palettes = {
  light: {
    background: "#F5F7F4", foreground: "#18221B", card: "#FFFFFF", elevated: "#E2F4E9",
    primary: "#21A969", primaryForeground: "#0C2116", secondary: "#EFF3EF",
    mutedForeground: "#5E6B61", border: "#DFE6DF", input: "#D8E1D9", accent: "#21A969",
    warning: "#80622D", destructive: "#B3261E", surfaceVariant: "#EEF3EF",
  },
  dark: {
    background: "#111512", foreground: "#F2F5F2", card: "#191E1A", elevated: "#193E2D",
    primary: "#3ECF8E", primaryForeground: "#0C2116", secondary: "#202722",
    mutedForeground: "#AAB5AC", border: "#2B342D", input: "#364039", accent: "#3ECF8E",
    warning: "#D3AE63", destructive: "#FF8A7C", surfaceVariant: "#252D27",
  },
} as const;
export type AppColors = { [K in keyof typeof palettes.light]: string };
type ThemeContextValue = { mode: ThemeMode; colors: AppColors; setMode: (mode: ThemeMode) => void; toggleMode: () => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);
let currentMode: ThemeMode = "light";

export const colors = new Proxy({} as AppColors, {
  get: (_target, property: keyof AppColors) => palettes[currentMode][property],
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  useEffect(() => {
    SecureStore.getItemAsync("vaultix-theme-mode")
      .then(value => {
        if (value === "light" || value === "dark") {
          currentMode = value;
          setModeState(value);
        }
      })
      .catch(() => {});
  }, []);
  const setMode = (value: ThemeMode) => {
    currentMode = value;
    setModeState(value);
    SecureStore.setItemAsync("vaultix-theme-mode", value).catch(() => {});
  };
  const value = useMemo(() => ({
    mode, colors: palettes[mode], setMode, toggleMode: () => setMode(mode === "light" ? "dark" : "light"),
  }), [mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useAppTheme must be used within ThemeProvider");
  return value;
}
export function useThemeColors() {
  return useAppTheme().colors;
}
