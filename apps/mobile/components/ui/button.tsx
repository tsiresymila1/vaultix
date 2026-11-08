import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { Host, Button as NativeButton, RNHostView } from "@expo/ui";
import { ProgressView } from "@expo/ui/swift-ui";
import { tint, accessibilityLabel as nativeLabel } from "@expo/ui/swift-ui/modifiers";
import { TextClassContext } from "./text";
import { cn } from "@/lib/utils";
import { colors } from "@/lib/theme";

export type ButtonProps = ViewProps & {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  contentClassName?: string; height?: number; disabled?: boolean; loading?: boolean;
  onPress?: () => void; children?: ReactNode;
};
export function Button({ className, style, variant = "default", size = "default", height, contentClassName, disabled, loading, children, onPress, accessibilityLabel, ...props }: ButtonProps) {
  const buttonHeight = height ?? (size === "lg" ? 56 : size === "icon" ? 48 : size === "sm" ? 48 : 52);
  const Loading = () => <ProgressView modifiers={[tint(variant === "default" ? colors.primaryForeground : colors.primary)]} />;
  return <TextClassContext.Provider value={cn("text-sm font-semibold", variant === "default" ? "text-primary-foreground" : variant === "destructive" ? "text-white" : "text-foreground")}>
    <View {...props} accessibilityLabel={accessibilityLabel} className={className} style={[{ height: buttonHeight, ...(size === "icon" ? { width: 48 } : {}) }, style]}>
      <Host colorScheme="light" seedColor={variant === "destructive" ? colors.destructive : variant === "secondary" ? colors.secondary : colors.primary} style={{ flex: 1, width: "100%" }}>
        <NativeButton modifiers={accessibilityLabel ? [nativeLabel(accessibilityLabel)] : []} disabled={!!disabled || !!loading} onPress={onPress} variant={variant === "ghost" ? "text" : variant === "outline" ? "outlined" : "filled"} style={{ width: "100%", height: buttonHeight }}>
          {loading ? <Loading /> : <RNHostView matchContents><View pointerEvents="none" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }} className={cn("flex-row items-center justify-center gap-2", contentClassName)}>
            {children}
          </View></RNHostView>}
        </NativeButton>
      </Host>
    </View>
  </TextClassContext.Provider>;
}
