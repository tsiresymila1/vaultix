import * as React from "react";
import { Text } from "react-native";
import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text className={cn("text-sm font-medium text-foreground font-sans", className)} {...props} />;
}

export { Label };
