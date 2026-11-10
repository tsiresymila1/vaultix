import { Tabs } from "expo-router";
import { BottomNavigation } from "react-native-paper";
import { KeyRound, Vault, Settings } from "lucide-react-native";
import { colors } from "@/lib/theme";
const icons = { passwords: KeyRound, index: Vault, settings: Settings };
export default function TabsLayout() {
 return <Tabs initialRouteName="passwords" screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }} tabBar={({ state, navigation, insets }) => <BottomNavigation.Bar navigationState={state} safeAreaInsets={insets} style={{ backgroundColor: colors.background }} activeColor={colors.primary} inactiveColor={colors.mutedForeground} onTabPress={({ route, preventDefault }) => { const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true }); if (event.defaultPrevented) preventDefault(); else navigation.navigate(route.name, route.params); }} renderIcon={({ route, color }) => { const Icon = icons[route.name as keyof typeof icons]; return Icon ? <Icon size={24} color={color} /> : null; }} getLabelText={({ route }) => route.name === "passwords" ? "Identifiants" : route.name === "index" ? "Coffres" : "Réglages"} />}>
 <Tabs.Screen name="passwords" /><Tabs.Screen name="index" /><Tabs.Screen name="settings" />
 </Tabs>;
}
