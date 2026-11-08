import type { ReactNode } from "react";
import { View, type ViewProps, type StyleProp, type ViewStyle } from "react-native";
import { Host, ScrollView, RNHostView } from "@expo/ui/swift-ui";
import { frame, refreshable } from "@expo/ui/swift-ui/modifiers";
import { colors } from "@/lib/theme";
export type ScreenScrollProps = ViewProps & {
  children?: ReactNode; horizontal?: boolean; showsVerticalScrollIndicator?: boolean; showsHorizontalScrollIndicator?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>; keyboardShouldPersistTaps?: "handled";
  refreshing?: boolean; onRefresh?: () => Promise<void>;
};
export function ScreenScroll({ children, horizontal, contentContainerStyle, onRefresh, refreshing, keyboardShouldPersistTaps, showsVerticalScrollIndicator, showsHorizontalScrollIndicator, style, ...props }: ScreenScrollProps) {
  return <View {...props} style={[horizontal ? { height: 64 } : { flex: 1 }, style]}>
    <Host colorScheme="light" seedColor={colors.primary} style={{ flex: 1 }}>
      <ScrollView axes={horizontal ? "horizontal" : "vertical"} showsIndicators={horizontal ? showsHorizontalScrollIndicator : showsVerticalScrollIndicator}
        modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity }), ...(onRefresh ? [refreshable(onRefresh)] : [])]}>
        <RNHostView matchContents={horizontal ? true : { vertical: true }}><View style={[!horizontal && { width: "100%" }, contentContainerStyle]}>{children}</View></RNHostView>
      </ScrollView>
    </Host>
  </View>;
}
