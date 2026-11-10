import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { TouchableRipple, ActivityIndicator } from "react-native-paper";
import { TextClassContext } from "./text";
import { cn } from "@/lib/utils";
import { colors } from "@/lib/theme";
export type ButtonProps = ViewProps & { variant?: "default" | "destructive" | "outline" | "secondary" | "ghost"; size?: "default" | "sm" | "lg" | "icon"; contentClassName?: string; height?: number; disabled?: boolean; loading?: boolean; onPress?: () => void; children?: ReactNode };
export function Button({ className, style, variant = "default", size = "default", height, contentClassName, disabled, loading, children, onPress, ...props }: ButtonProps) {
 const foreground = variant === "default" ? colors.primaryForeground : variant === "destructive" ? "#fff" : colors.foreground;
 return <TextClassContext.Provider value={cn("text-sm font-semibold", variant === "default" ? "text-primary-foreground" : variant === "destructive" ? "text-white" : "text-foreground")}>
 <View className={className} style={[{ height: height ?? (size === "lg" ? 56 : 48), ...(size === "icon" ? { width: 48 } : {}), borderRadius: 24, overflow: "hidden", backgroundColor: variant === "default" ? colors.primary : variant === "destructive" ? colors.destructive : variant === "secondary" ? colors.secondary : "transparent", borderWidth: variant === "outline" ? 1 : 0, borderColor: colors.border }, style]}>
 <TouchableRipple {...props} accessibilityRole="button" accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }} disabled={disabled || loading} onPress={onPress} style={{ flex: 1, opacity: disabled ? 0.5 : 1 }}>
 <View pointerEvents="none" className={cn("flex-1 flex-row items-center justify-center gap-2 px-3", contentClassName)}>{loading ? <ActivityIndicator size={20} color={foreground} /> : children}</View>
 </TouchableRipple></View></TextClassContext.Provider>;
}
