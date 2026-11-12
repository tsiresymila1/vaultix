import { View, type ViewProps } from "react-native";
import type { ComponentProps } from "react";
import { TextInput } from "react-native-paper";
import { useThemeColors } from "@/lib/theme";
export type InputProps = Omit<ComponentProps<typeof TextInput>, "style" | "theme"> & { style?: ViewProps["style"]; className?: string; normalize?: (value: string) => string };
export function Input({ className, style, normalize, onChangeText, ...props }: InputProps) {
 const colors = useThemeColors();
 return <View className={className} style={style}><TextInput {...props} mode="outlined" onChangeText={value => onChangeText?.(normalize ? normalize(value) : value)} activeOutlineColor={colors.primary} selectionColor={colors.elevated} cursorColor={colors.primary} textColor={colors.foreground} outlineColor={colors.border} style={{ backgroundColor: colors.card, fontSize: 14, fontFamily: "Outfit_400Regular", minHeight: 50 }} /></View>;
}
