import * as React from "react";
import { Text as RNText } from "react-native";
import { Slot } from "@rn-primitives/slot";
import { cn } from "@/lib/utils";
import { useThemeColors } from "@/lib/theme";

const TextClassContext = React.createContext<string | undefined>(undefined);

// react-native-reusables Text: pulls a class from context (e.g. Button injects its
// text color) and uses the app font consistently.
function Text({
  className,
  asChild = false,
  style,
  ...props
}: React.ComponentProps<typeof RNText> & { asChild?: boolean }) {
  const textClass = React.useContext(TextClassContext);
  const colors = useThemeColors();
  const classNames = textClass + " " + (className ?? "");
  const color = classNames.includes("text-muted-foreground") ? colors.mutedForeground
    : classNames.includes("text-destructive") ? colors.destructive
    : classNames.includes("text-primary-foreground") ? colors.primaryForeground
    : classNames.includes("text-primary") ? colors.primary
    : classNames.includes("text-white") ? "#FFFFFF"
    : colors.foreground;
  const Component = asChild ? Slot : RNText;
  return (
    <Component
      className={cn("text-sm text-foreground font-sans", textClass, className)}
      style={[{ color, fontFamily: /font-bold/.test(className ?? "") ? "Outfit_700Bold" : /font-semibold/.test(textClass + " " + (className ?? "")) ? "Outfit_600SemiBold" : /font-medium/.test(className ?? "") ? "Outfit_500Medium" : "Outfit_400Regular" }, style]}
      {...props}
    />
  );
}

export { Text, TextClassContext };
