import { PaperProvider, MD3DarkTheme, MD3LightTheme, configureFonts } from "react-native-paper";
import { useFonts } from "expo-font";
import { Outfit_400Regular } from "@expo-google-fonts/outfit/400Regular";
import { Outfit_500Medium } from "@expo-google-fonts/outfit/500Medium";
import { Outfit_600SemiBold } from "@expo-google-fonts/outfit/600SemiBold";
import { Outfit_700Bold } from "@expo-google-fonts/outfit/700Bold";
import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MaterialDialogProvider } from "@/components/material-dialog";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider, useAppTheme } from "@/lib/theme";

function AppProviders() {
  const { mode, colors } = useAppTheme();
  const base = mode === "dark" ? MD3DarkTheme : MD3LightTheme;
  const theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary, onPrimary: colors.primaryForeground,
      primaryContainer: colors.elevated, onPrimaryContainer: colors.foreground,
      secondary: colors.primary, onSecondary: colors.primaryForeground,
      secondaryContainer: colors.elevated, onSecondaryContainer: colors.foreground,
      tertiary: colors.primary, onTertiary: colors.primaryForeground,
      tertiaryContainer: colors.elevated, onTertiaryContainer: colors.foreground,
      surfaceVariant: colors.surfaceVariant, onSurfaceVariant: colors.mutedForeground,
      outline: colors.border, outlineVariant: colors.border, inversePrimary: colors.primary,
      surfaceDisabled: colors.secondary, error: colors.destructive,
      elevation: { level0: "transparent", level1: colors.card, level2: colors.card, level3: colors.card, level4: colors.card, level5: colors.card },
      background: colors.background, surface: colors.card, onSurface: colors.foreground,
    },
    fonts: configureFonts({ config: { fontFamily: "Outfit_400Regular" } }),
  };
  return <PaperProvider theme={theme}>
    <MaterialDialogProvider>
      <AuthProvider>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: "fade" }} />
      </AuthProvider>
    </MaterialDialogProvider>
  </PaperProvider>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold });
  if (!fontsLoaded) return null;
  return <SafeAreaProvider><ThemeProvider><AppProviders /></ThemeProvider></SafeAreaProvider>;
}
