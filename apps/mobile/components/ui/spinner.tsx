import { ActivityIndicator } from "react-native-paper";
import { colors } from "@/lib/theme";
export function Spinner({ color = colors.primary, size = "small" }: { color?: string; size?: "small" | "large" }) { return <ActivityIndicator size={size} color={color} />; }
