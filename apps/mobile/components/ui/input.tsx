import * as React from "react";
import { TextInput, Platform } from "react-native";
import { cn } from "@/lib/utils";
import { colors } from "@/lib/theme";

// react-native-reusables Input: bare field. Pair with <Label> for a labeled row.
function Input({
  className,
  placeholderTextColor,
  style,
  ...props
}: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={placeholderTextColor ?? colors.mutedForeground}
      className={cn(
        "h-[52px] rounded-t-xl border-b border-muted-foreground bg-input px-4 text-base text-foreground font-sans",
        props.editable === false && "opacity-50",
        className,
      )}
      style={[{ fontFamily: Platform.OS === "ios" ? "System" : "sans-serif" }, style]}
      {...props}
    />
  );
}

export { Input };
