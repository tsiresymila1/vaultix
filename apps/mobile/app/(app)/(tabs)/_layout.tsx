import { NativeTabs } from "expo-router/unstable-native-tabs";
import { colors } from "@/lib/theme";

export const unstable_settings = { initialRouteName: "passwords" };
export default function TabsLayout() {
  return <NativeTabs tintColor={colors.primary} backgroundColor={colors.background} disableTransparentOnScrollEdge
    labelStyle={{ fontFamily: "Poppins_500Medium", fontSize: 11 }}>
    <NativeTabs.Trigger name="passwords"><NativeTabs.Trigger.Icon sf="key.fill" /><NativeTabs.Trigger.Label>Identifiants</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    <NativeTabs.Trigger name="index"><NativeTabs.Trigger.Icon sf="lock.square.fill" /><NativeTabs.Trigger.Label>Coffres</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    <NativeTabs.Trigger name="settings"><NativeTabs.Trigger.Icon sf="gearshape" /><NativeTabs.Trigger.Label>Réglages</NativeTabs.Trigger.Label></NativeTabs.Trigger>
  </NativeTabs>;
}
