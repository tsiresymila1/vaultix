import type { ReactNode } from "react";
import { View } from "react-native";
import { List } from "react-native-paper";
import { useAppTheme } from "@/lib/theme";
export function ListRow({ title, detail, icon, onPress, trailing, multiline }: { title: string; detail?: string; icon?: ReactNode; onPress?: () => void; trailing?: ReactNode; multiline?: boolean }) {
 const { colors } = useAppTheme();
 return <View className="min-h-[73px] flex-row items-center border-b" style={{ borderColor: colors.border }}><List.Item style={{ flex: 1, backgroundColor: colors.card }} title={title} description={detail} onPress={onPress} titleStyle={{ fontFamily: "Outfit_500Medium", fontSize: 15, color: colors.foreground }} descriptionStyle={{ fontFamily: "Outfit_400Regular", fontSize: 13, color: colors.mutedForeground }} descriptionNumberOfLines={multiline ? 20 : 2} left={icon ? () => <View className="justify-center px-2">{icon}</View> : undefined} />{trailing}</View>;
}
