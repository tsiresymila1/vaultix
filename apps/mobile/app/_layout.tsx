import { PaperProvider, MD3LightTheme, configureFonts } from "react-native-paper";
import { useFonts } from "expo-font";
import { Poppins_400Regular } from "@expo-google-fonts/poppins/400Regular";
import { Poppins_500Medium } from "@expo-google-fonts/poppins/500Medium";
import { Poppins_600SemiBold } from "@expo-google-fonts/poppins/600SemiBold";
import { Poppins_700Bold } from "@expo-google-fonts/poppins/700Bold";
import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MaterialDialogProvider } from "@/components/material-dialog";
import { AuthProvider } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold });
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <PaperProvider theme={{ ...MD3LightTheme, colors: { ...MD3LightTheme.colors, primary: colors.primary, onPrimary: colors.primaryForeground, primaryContainer: colors.elevated, onPrimaryContainer: colors.primaryForeground, secondary: colors.primary, onSecondary: colors.primaryForeground, secondaryContainer: colors.elevated, onSecondaryContainer: colors.primaryForeground, tertiary: colors.primary, onTertiary: colors.primaryForeground, tertiaryContainer: colors.elevated, onTertiaryContainer: colors.primaryForeground, surfaceVariant: colors.secondary, onSurfaceVariant: colors.mutedForeground, outline: colors.border, outlineVariant: colors.border, inversePrimary: colors.primary, surfaceDisabled: colors.secondary, error: colors.destructive, elevation: { level0: "transparent", level1: colors.card, level2: colors.card, level3: colors.card, level4: colors.card, level5: colors.card }, background: colors.background, surface: colors.card, onSurface: colors.foreground }, fonts: configureFonts({ config: { fontFamily: "Poppins_400Regular" } }) }}><MaterialDialogProvider><AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: "fade",
          }}
        />
      </AuthProvider></MaterialDialogProvider></PaperProvider>
    </SafeAreaProvider>
  );
}
