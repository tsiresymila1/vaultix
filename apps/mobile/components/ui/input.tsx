import { useEffect, useRef } from "react";
import { View, type ViewProps, type TextInputProps as RNInputProps } from "react-native";
import { Host, TextInput, useNativeState } from "@expo/ui";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/utils";
export type InputProps = Pick<RNInputProps, "placeholder" | "autoFocus" | "secureTextEntry" | "autoCapitalize" | "autoCorrect" | "keyboardType" | "autoComplete" | "maxLength" | "multiline" | "numberOfLines" | "editable" | "returnKeyType" | "accessibilityLabel" | "testID" | "textContentType"> & {
  style?: ViewProps["style"]; className?: string; value?: string; onChangeText?: (value: string) => void;
  onSubmitEditing?: () => void; normalize?: (value: string) => string;
};
export function Input({ value = "", onChangeText, onSubmitEditing, normalize, className, style, accessibilityLabel, textContentType, ...props }: InputProps) {
  const nativeValue = useNativeState(value);
  const lastValue = useRef(value);
  useEffect(() => { if (lastValue.current !== value) { nativeValue.set(value); lastValue.current = value; } }, [value, nativeValue]);
  const change = (raw: string) => {
    const next = normalize ? normalize(raw) : raw;
    lastValue.current = next;
    if (next !== raw) nativeValue.set(next);
    onChangeText?.(next);
  };
  return <View accessibilityLabel={accessibilityLabel} className={cn("min-h-[56px]", className)} style={style}>
    <Host matchContents={{ vertical: true }} colorScheme="light" seedColor={colors.primary} style={{ width: "100%" }}>
      <TextInput {...props} value={nativeValue} onChangeText={change} onSubmitEditing={onSubmitEditing}
        autoComplete={props.autoComplete ?? (textContentType === "oneTimeCode" ? "one-time-code" : undefined)}
        textStyle={{ fontFamily: "Poppins_400Regular", fontSize: 16, color: colors.foreground }}
        style={{ width: "100%", padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }} />
    </Host>
  </View>;
}
