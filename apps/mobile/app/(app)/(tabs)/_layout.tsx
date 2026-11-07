import { Tabs } from "expo-router";
import { View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyRound, Settings, Vault } from "lucide-react-native";
import { colors } from "@/lib/theme";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs initialRouteName="passwords" screenOptions={{
      headerShown: false,
      tabBarButton: ({ children, onPress, onLongPress, accessibilityState, accessibilityLabel, testID }) => <Pressable onPress={onPress} onLongPress={onLongPress} accessibilityRole="button" accessibilityState={accessibilityState} accessibilityLabel={accessibilityLabel} testID={testID} style={({ pressed }) => ({ flex: 1, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>{children}</Pressable>,
      tabBarActiveTintColor: colors.foreground,
      tabBarInactiveTintColor: colors.mutedForeground,
      tabBarHideOnKeyboard: true,
      tabBarStyle: { height: 68 + insets.bottom, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8), backgroundColor: colors.background, borderTopColor: colors.border, elevation: 0 },
      tabBarLabelStyle: { fontFamily: "Poppins_500Medium", fontSize: 11 },
    }}>
      {([
        ["passwords", "Identifiants", KeyRound],
        ["index", "Coffres", Vault],
        ["settings", "Réglages", Settings],
      ] as const).map(([name, title, Icon]) => (
        <Tabs.Screen key={name} name={name} options={{ title, tabBarAccessibilityLabel: title,
          tabBarIcon: ({ focused, color }) => <View style={{ width: 60, height: 30, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: focused ? colors.elevated : "transparent" }}><Icon size={22} color={focused ? colors.primary : color} strokeWidth={1.7} /></View>,
        }} />
      ))}
    </Tabs>
  );
}
