import * as React from "react";
import { View, type ViewProps } from "react-native";
import { Text } from "./text";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: ViewProps) {
  return <View className={cn("rounded-lg border border-border bg-card", className)} {...props} />;
}

function CardHeader({ className, ...props }: ViewProps) {
  return <View className={cn("gap-1.5 p-4", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text className={cn("text-lg font-semibold text-foreground", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function CardContent({ className, ...props }: ViewProps) {
  return <View className={cn("p-4 pt-0", className)} {...props} />;
}

function CardFooter({ className, ...props }: ViewProps) {
  return <View className={cn("flex-row items-center p-4 pt-0", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
