import { View, Text } from "react-native";
import { ShieldCheck } from "lucide-react-native";
import { colors } from "@/lib/theme";

export function Logo({ size = 24, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <View className="flex-row items-center gap-2">
      <View
        className="items-center justify-center rounded-md border border-primary/20 bg-primary/10"
        style={{ width: size + 12, height: size + 12 }}
      >
        <ShieldCheck size={size} color={colors.primary} strokeWidth={2.2} />
      </View>
      {showText ? <Text className="text-xl font-bold text-foreground">Vaultix</Text> : null}
    </View>
  );
}
