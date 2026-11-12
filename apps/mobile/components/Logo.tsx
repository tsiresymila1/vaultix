import { Image, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/lib/theme";

export function Logo({ size = 24, showText = true }: { size?: number; showText?: boolean }) {
  const { colors } = useAppTheme();
  return (
    <View className="flex-row items-center gap-2">
      <View className="items-center justify-center rounded-[12px]" style={{ width: size + 16, height: size + 16, backgroundColor: colors.elevated }}>
        <Image source={require("../assets/icon.png")} resizeMode="contain" style={{ width: size + 5, height: size + 5 }} />
      </View>
      {showText ? <Text className="font-bold text-foreground" style={{ fontSize: 17 }}>Vaultix</Text> : null}
    </View>
  );
}
