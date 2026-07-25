import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { ChevronLeft, Eye, EyeOff, Sparkles } from "lucide-react-native";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { colors } from "@/lib/theme";

export function FormScreenHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}) {
  return (
    <View className="h-[70px] flex-row items-center gap-3 px-4">
      <Pressable
        accessibilityLabel="Go back"
        onPress={onBack}
        className="h-10 w-10 items-center justify-center rounded-md border border-border bg-card"
        hitSlop={6}
      >
        <ChevronLeft size={21} color={colors.foreground} />
      </Pressable>
      <View>
        <Text className="text-lg font-semibold text-foreground">{title}</Text>
        <Text className="text-xs text-muted-foreground">{subtitle}</Text>
      </View>
    </View>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-4">
      <Text className="text-xs font-semibold uppercase text-muted-foreground">{title}</Text>
      <View className="gap-4 rounded-md border border-border bg-card p-4">{children}</View>
    </View>
  );
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </View>
  );
}

export function SecretInput({
  value,
  onChangeText,
  visible,
  onToggleVisible,
  onGenerate,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  onGenerate: () => void;
  placeholder: string;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Label className="text-xs text-muted-foreground">Password</Label>
        <Pressable onPress={onGenerate} className="flex-row items-center gap-1.5 py-1" hitSlop={6}>
          <Sparkles size={14} color={colors.primary} />
          <Text className="text-xs font-semibold text-primary">Generate secure</Text>
        </Pressable>
      </View>
      <View className="h-[50px] flex-row items-center rounded-md border border-border bg-input pr-2">
        <Input
          placeholder={placeholder}
          secureTextEntry={!visible}
          autoCapitalize="none"
          value={value}
          onChangeText={onChangeText}
          className="h-12 flex-1 border-0 bg-transparent px-4"
        />
        <Pressable
          accessibilityLabel={visible ? "Hide password" : "Show password"}
          onPress={onToggleVisible}
          className="h-9 w-9 items-center justify-center"
          hitSlop={8}
        >
          {visible ? <EyeOff size={18} color={colors.mutedForeground} /> : <Eye size={18} color={colors.mutedForeground} />}
        </Pressable>
      </View>
    </View>
  );
}
