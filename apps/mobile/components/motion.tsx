import type { ReactNode } from "react";
import { View } from "react-native";

type Props = { children: ReactNode; className?: string; delay?: number; from?: number; index?: number };
export function FadeIn({ children, className }: Props) {
  return <View className={className}>{children}</View>;
}
export const StaggerItem = FadeIn;
