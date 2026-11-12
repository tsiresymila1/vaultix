import { Moon, Sun } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { useAppTheme } from "@/lib/theme";

export function ThemeToggle() {
  const { mode, toggleMode, colors } = useAppTheme();
  const next = mode === "light" ? "sombre" : "clair";
  return <Button
    variant="outline"
    size="icon"
    accessibilityLabel={"Activer le thème " + next}
    onPress={toggleMode}
    className="h-11 w-11 items-center justify-center rounded-[14px]"
    style={{ backgroundColor: colors.card, borderColor: colors.border }}
  >
    {mode === "light" ? <Moon size={18} color={colors.foreground} /> : <Sun size={18} color={colors.foreground} />}
  </Button>;
}
