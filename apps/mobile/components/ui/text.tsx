import * as React from "react";
import { Text as RNText, Platform } from "react-native";
import { Slot } from "@rn-primitives/slot";
import { cn } from "@/lib/utils";

const TextClassContext = React.createContext<string | undefined>(undefined);

// react-native-reusables Text: pulls a class from context (e.g. Button injects its
// text color) and uses the platform sans-serif font.
function Text({
  className,
  asChild = false,
  style,
  ...props
}: React.ComponentProps<typeof RNText> & { asChild?: boolean }) {
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot : RNText;
  return (
    <Component
      className={cn("text-base text-foreground font-sans", textClass, className)}
      style={[{ fontFamily: Platform.OS === "ios" ? "System" : "sans-serif" }, style]}
      {...props}
    />
  );
}

export { Text, TextClassContext };
