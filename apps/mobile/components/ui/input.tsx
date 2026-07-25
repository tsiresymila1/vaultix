import * as React from "react";
import { TextInput } from "react-native";
import { cn } from "@/lib/utils";
import { colors } from "@/lib/theme";

// react-native-reusables Input: bare field. Pair with <Label> for a labeled row.
function Input({
  className,
  placeholderTextColor,
  ...props
}: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={placeholderTextColor ?? colors.mutedForeground}
      className={cn(
        "h-[50px] rounded-md border border-border bg-input px-4 text-base text-foreground font-sans",
        props.editable === false && "opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
