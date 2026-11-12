import type { ReactNode } from "react";
import { View } from "react-native";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/lib/theme";

export function ScreenHeader({
  eyebrow = "ESPACE PERSONNEL",
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={{ backgroundColor: colors.background }}>
      <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
        <Logo size={20} />
        <ThemeToggle />
      </View>
      <View className="flex-row items-end justify-between gap-3 px-5 pb-4 pt-2">
        <View className="flex-1">
          <Text className="mb-1 text-[11px] font-semibold tracking-[1.2px] text-primary">{eyebrow}</Text>
          <Text className="text-[29px] font-semibold leading-9 text-foreground">{title}</Text>
          {subtitle ? <Text className="mt-1 text-sm text-muted-foreground">{subtitle}</Text> : null}
        </View>
        {action}
      </View>
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Text className="text-sm font-semibold text-foreground">{title}</Text>
      {action}
    </View>
  );
}
