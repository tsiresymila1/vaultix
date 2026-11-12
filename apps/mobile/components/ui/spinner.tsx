import { ActivityIndicator } from "react-native-paper";
import { useThemeColors } from "@/lib/theme";
export function Spinner({ color, size = "small" }: { color?: string; size?: "small" | "large" }) {
  const colors = useThemeColors();
  return <ActivityIndicator size={size} color={color ?? colors.primary} />;
}
