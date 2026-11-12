import { ScrollView, RefreshControl, type ScrollViewProps } from "react-native";
import { useAppTheme } from "@/lib/theme";
export type ScreenScrollProps = ScrollViewProps & { refreshing?: boolean; onRefresh?: () => Promise<void> };
export function ScreenScroll({ refreshing, onRefresh, style, ...props }: ScreenScrollProps) {
  const { colors } = useAppTheme();
  return <ScrollView keyboardShouldPersistTaps="handled" {...props} style={[{ backgroundColor: colors.background }, style]} refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined} />;
}
