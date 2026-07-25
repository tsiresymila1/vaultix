import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between gap-4 px-5 pt-2 pb-5">
      <View className="flex-1">
        {eyebrow ? (
          <Text className="mb-1 text-xs font-semibold uppercase text-primary">{eyebrow}</Text>
        ) : null}
        <Text className="text-[28px] font-bold text-foreground">{title}</Text>
        {subtitle ? (
          <Text className="mt-1 text-sm text-muted-foreground" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Text className="text-base font-semibold text-foreground">{title}</Text>
      {action}
    </View>
  );
}
