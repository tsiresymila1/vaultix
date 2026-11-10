import { ScrollView, RefreshControl, type ScrollViewProps } from "react-native";
import { colors } from "@/lib/theme";
export type ScreenScrollProps = ScrollViewProps & { refreshing?: boolean; onRefresh?: () => Promise<void> };
export function ScreenScroll({ refreshing, onRefresh, ...props }: ScreenScrollProps) {
 return <ScrollView keyboardShouldPersistTaps="handled" {...props} refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined} />;
}
