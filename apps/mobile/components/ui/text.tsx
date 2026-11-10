import * as React from "react";
import { Text as RNText } from "react-native";
import { Slot } from "@rn-primitives/slot";
import { cn } from "@/lib/utils";

const TextClassContext = React.createContext<string | undefined>(undefined);

// react-native-reusables Text: pulls a class from context (e.g. Button injects its
// text color) and uses Poppins consistently.
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
      className={cn("text-sm text-foreground font-sans", textClass, className)}
      style={[{ fontFamily: /font-bold/.test(className ?? "") ? "Poppins_700Bold" : /font-semibold/.test(`${textClass} ${className}`) ? "Poppins_600SemiBold" : /font-medium/.test(className ?? "") ? "Poppins_500Medium" : "Poppins_400Regular" }, style]}
      {...props}
    />
  );
}

export { Text, TextClassContext };
