import { Host, CircularProgressIndicator } from "@expo/ui/jetpack-compose";
import { size as nativeSize } from "@expo/ui/jetpack-compose/modifiers";
import { colors } from "@/lib/theme";
export function Spinner({ size, color = colors.primary }: { size?: "small" | "large"; color?: string }) {
  const length = size === "small" ? 24 : 40;
  return <Host style={{ width: length, height: length }}><CircularProgressIndicator color={color} modifiers={[nativeSize(length, length)]} /></Host>;
}
