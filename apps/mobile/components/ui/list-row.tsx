import type { ReactNode } from "react";
import { View } from "react-native";
import { List } from "react-native-paper";
export function ListRow({ title, detail, icon, onPress, trailing, multiline }: { title: string; detail?: string; icon?: ReactNode; onPress?: () => void; trailing?: ReactNode; multiline?: boolean }) {
 return <View className="min-h-[76px] flex-row items-center border-b border-border"><List.Item style={{ flex: 1 }} title={title} description={detail} onPress={onPress} titleStyle={{ fontFamily: "Poppins_500Medium", fontSize: 14 }} descriptionStyle={{ fontFamily: "Poppins_400Regular", fontSize: 12 }} descriptionNumberOfLines={multiline ? 20 : 2} left={icon ? () => <View className="justify-center px-2">{icon}</View> : undefined} />{trailing}</View>;
}
