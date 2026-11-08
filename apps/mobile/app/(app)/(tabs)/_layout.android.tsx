import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Keyboard, View } from "react-native";
import { KeyRound, Settings, Vault } from "lucide-react-native";
import { Host, NavigationBar, NavigationBarItem, RNHostView, Text } from "@expo/ui/jetpack-compose";
import { fillMaxWidth, size } from "@expo/ui/jetpack-compose/modifiers";
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
      <View style={{ width: "100%", paddingLeft: insets.left, paddingRight: insets.right, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border }}>
        {/* Compose owns the bottom system inset and equal item widths. */}
        <Host matchContents={{ vertical: true }} colorScheme="light" seedColor={colors.primary} style={{ width: "100%" }}>
          <NavigationBar containerColor={colors.background} tonalElevation={0} modifiers={[fillMaxWidth()]}>
            {destinations.map(({ name, title, Icon }) => {
              const route = state.routes.find(item => item.name === name);
              if (!route) return null;
              const focused = state.routes[state.index].key === route.key;
              return <NavigationBarItem key={route.key} selected={focused}
                colors={{ selectedIconColor: colors.primary, selectedTextColor: colors.foreground, selectedIndicatorColor: colors.elevated, unselectedIconColor: colors.mutedForeground, unselectedTextColor: colors.mutedForeground }}
                onClick={() => {
                  const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
                }}>
                <NavigationBarItem.Icon><RNHostView modifiers={[size(24, 24)]}><View accessible={false} pointerEvents="none" style={{ width: 24, height: 24 }}><Icon size={24} strokeWidth={1.7} color={focused ? colors.primary : colors.mutedForeground} /></View></RNHostView></NavigationBarItem.Icon>
                <NavigationBarItem.Label><Text maxLines={1} style={{ fontFamily: "Poppins_500Medium", fontSize: 11 }}>{title}</Text></NavigationBarItem.Label>
              </NavigationBarItem>;
            })}
          </NavigationBar>
        </Host>
      </View>
    )}>
      {destinations.map(({ name, title }) => <Tabs.Screen key={name} name={name} options={{ title }} />)}
    </Tabs>
  );
}
