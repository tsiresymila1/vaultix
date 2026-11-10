import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import { TextInput } from "react-native-paper";
import { View } from "react-native";
import { ChevronLeft, Eye, EyeOff, Sparkles } from "lucide-react-native";
import { Button } from "@/components/ui/button";
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
      <Button variant="ghost"
        size="icon" accessibilityLabel="Retour"
        onPress={onBack}
        className="h-12 w-12 items-center justify-center"

      >
        <ChevronLeft size={21} color={colors.foreground} />
      </Button>
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
      <Text className="text-xs font-medium text-muted-foreground">{title}</Text>
      <View className="gap-4">{children}</View>
    </View>
  );
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      {Children.map(children, child => isValidElement(child) && child.type === Input ? cloneElement(child as React.ReactElement<import("@/components/ui/input").InputProps>, { label }) : child)}
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
        <Button variant="ghost" onPress={onGenerate} className="w-44" >
          <Sparkles size={14} color={colors.primary} />
          <Text className="text-xs font-semibold text-primary">Generate secure</Text>
        </Button>
      </View>
      <View className="flex-row items-center gap-2">
        <Input
          label="Password"
          placeholder={placeholder}
          right={<TextInput.Icon icon={visible ? "eye-off" : "eye"} onPress={onToggleVisible} accessibilityLabel={visible ? "Hide password" : "Show password"} />}
          secureTextEntry={!visible}
          autoCapitalize="none"
          value={value}
          onChangeText={onChangeText}
          className="flex-1"
        />

      </View>
    </View>
  );
}
