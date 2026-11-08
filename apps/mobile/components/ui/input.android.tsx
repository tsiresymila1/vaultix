import { useEffect, useRef } from "react";
import { View, type ViewProps, type TextInputProps as RNInputProps } from "react-native";
import { Host, OutlinedTextField, Text, useNativeState } from "@expo/ui/jetpack-compose";
import { fillMaxWidth, semantics } from "@expo/ui/jetpack-compose/modifiers";
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
      <OutlinedTextField value={nativeValue} onValueChange={change} enabled={props.editable !== false} autoFocus={props.autoFocus}
        singleLine={!props.multiline} minLines={props.multiline ? (props.numberOfLines ?? 4) : 1} maxLength={props.maxLength}
        visualTransformation={props.secureTextEntry ? "password" : "none"}
        keyboardOptions={{ keyboardType: props.secureTextEntry ? "password" : props.keyboardType === "email-address" ? "email" : props.keyboardType === "url" ? "uri" : props.keyboardType === "number-pad" || props.keyboardType === "numeric" ? "number" : "text", capitalization: props.autoCapitalize ?? "none", autoCorrectEnabled: props.autoCorrect ?? false, imeAction: props.returnKeyType === "go" ? "go" : props.returnKeyType === "search" ? "search" : "done" }}
        keyboardActions={{ onDone: onSubmitEditing, onGo: onSubmitEditing, onSearch: onSubmitEditing }}
        modifiers={[fillMaxWidth(), semantics({ contentDescription: accessibilityLabel, contentType: props.autoComplete })]}
        textStyle={{ fontFamily: "Poppins_400Regular", fontSize: 16, color: colors.foreground }}
        colors={{ focusedIndicatorColor: colors.primary, cursorColor: colors.primary, focusedContainerColor: colors.card, unfocusedContainerColor: colors.card }}>
        {props.placeholder ? <OutlinedTextField.Placeholder><Text style={{ fontFamily: "Poppins_400Regular", fontSize: 16 }}>{props.placeholder}</Text></OutlinedTextField.Placeholder> : null}
      </OutlinedTextField>
    </Host>
  </View>;
}
