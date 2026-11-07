import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Keyboard, View, Pressable } from "react-native";
import { KeyRound, Settings, Vault } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { colors } from "@/lib/theme";

const destinations = [
  { name: "passwords", title: "Identifiants", Icon: KeyRound },
  { name: "index", title: "Coffres", Icon: Vault },
  { name: "settings", title: "Réglages", Icon: Settings },
] as const;

export default function TabsLayout() {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return (
    <Tabs initialRouteName="passwords" screenOptions={{ headerShown: false }} tabBar={({ state, navigation, insets }) => keyboardVisible ? null : (
      <View style={{ flexDirection: "row", paddingTop: 8, paddingBottom: Math.max(8, insets.bottom), paddingLeft: insets.left, paddingRight: insets.right, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border }}>
        {destinations.map(({ name, title, Icon }) => {
          const route = state.routes.find(item => item.name === name);
          if (!route) return null;
          const focused = state.routes[state.index].key === route.key;
          return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={title} accessibilityState={{ selected: focused }}
            onPress={() => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
            }}
            onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
            style={({ pressed }) => ({ flex: 1, minHeight: 56, alignItems: "center", justifyContent: "center", gap: 6, opacity: pressed ? 0.65 : 1 })}>
            <View style={{ width: 60, height: 30, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: focused ? colors.elevated : "transparent" }}>
              <Icon size={22} strokeWidth={1.7} color={focused ? colors.primary : colors.mutedForeground} />
            </View>
            <Text numberOfLines={1} className="text-[11px] font-medium" style={{ color: focused ? colors.foreground : colors.mutedForeground }}>{title}</Text>
          </Pressable>;
        })}
      </View>
    )}>
      {destinations.map(({ name, title }) => <Tabs.Screen key={name} name={name} options={{ title }} />)}
    </Tabs>
  );
}
