import { View, type ViewProps } from "react-native";
import type { ComponentProps } from "react";
import { TextInput } from "react-native-paper";
import { colors } from "@/lib/theme";
export type InputProps = Omit<ComponentProps<typeof TextInput>, "style" | "theme"> & { style?: ViewProps["style"]; className?: string; normalize?: (value: string) => string };
export function Input({ className, style, normalize, onChangeText, ...props }: InputProps) {
 return <View className={className} style={style}><TextInput {...props} mode="outlined" onChangeText={value => onChangeText?.(normalize ? normalize(value) : value)} activeOutlineColor={colors.primary} selectionColor={colors.elevated} cursorColor={colors.primary} textColor={colors.foreground} style={{ backgroundColor: colors.card, fontSize: 14 }} /></View>;
}
