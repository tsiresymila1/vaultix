import { Tabs } from "expo-router";
import { KeyRound, Settings, ShieldCheck } from "lucide-react-native";
import { colors } from "@/lib/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 9,
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarItemStyle: { height: 54 },
        tabBarLabelStyle: { fontFamily: "Outfit_500Medium", fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Vaultix",
          tabBarAccessibilityLabel: "Vaultix tab",
          tabBarIcon: ({ color, size }) => <ShieldCheck color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="passwords"
        options={{
          title: "Passwords",
          tabBarAccessibilityLabel: "Passwords tab",
          tabBarIcon: ({ color, size }) => <KeyRound color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarAccessibilityLabel: "Settings tab",
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
