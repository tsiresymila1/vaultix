import * as React from "react";
import { Text as RNText } from "react-native";
import { Slot } from "@rn-primitives/slot";
import { cn } from "@/lib/utils";

const TextClassContext = React.createContext<string | undefined>(undefined);

// react-native-reusables Text: pulls a class from context (e.g. Button injects its
// text color) and defaults to the Outfit theme font.
function Text({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<typeof RNText> & { asChild?: boolean }) {
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot : RNText;
  return (
    <Component
      className={cn("text-base text-foreground font-sans", textClass, className)}
      {...props}
    />
  );
}

export { Text, TextClassContext };
