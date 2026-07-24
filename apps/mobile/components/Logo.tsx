import { View, Text } from "react-native";
import { Shield } from "lucide-react-native";
import { colors } from "@/lib/theme";

export function Logo({ size = 24, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <View className="flex-row items-center gap-2">
      <Shield size={size} color={colors.primary} fill={colors.primary} fillOpacity={0.15} />
      {showText ? <Text className="text-xl font-bold text-foreground tracking-tight">Vaultix</Text> : null}
    </View>
  );
}
