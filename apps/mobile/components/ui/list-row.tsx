import type { ReactNode } from "react";
import { Platform, View } from "react-native";
import { Host, ListItem, RNHostView, Text } from "@expo/ui";
import { colors } from "@/lib/theme";
export function ListRow({ title, detail, icon, onPress, trailing, multiline }: { title: string; detail?: string; icon?: ReactNode; onPress?: () => void; trailing?: ReactNode; multiline?: boolean }) {
  const leading = icon ? <View style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>{icon}</View> : undefined;
  return <View className="min-h-[76px] flex-row items-center border-b border-border">
    <Host matchContents={{ vertical: true }} colorScheme="light" seedColor={colors.primary} style={{ flex: 1 }}>
      <ListItem onPress={onPress} leading={Platform.OS === "android" && leading ? <RNHostView matchContents>{leading}</RNHostView> : leading}
        colors={{ containerColor: colors.background, contentColor: colors.foreground, supportingContentColor: colors.mutedForeground }}
        supportingText={detail ? <Text numberOfLines={multiline ? undefined : 2} textStyle={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground }}>{detail}</Text> : undefined}>
        <Text numberOfLines={2} textStyle={{ fontFamily: "Poppins_500Medium", fontSize: 14, color: colors.foreground }}>{title}</Text>
      </ListItem>
    </Host>
    {trailing}
  </View>;
}
