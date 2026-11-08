import { Host } from "@expo/ui";
import { ProgressView } from "@expo/ui/swift-ui";
import { tint } from "@expo/ui/swift-ui/modifiers";
import { colors } from "@/lib/theme";
export function Spinner({ size, color = colors.primary }: { size?: "small" | "large"; color?: string }) {
  const length = size === "small" ? 24 : 40;
  return <Host style={{ width: length, height: length }}><ProgressView modifiers={[tint(color)]} /></Host>;
}
