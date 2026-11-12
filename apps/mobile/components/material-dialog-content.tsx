import { View, type AlertButton } from "react-native";
import { Dialog, Portal } from "react-native-paper";
import { ShieldAlert } from "lucide-react-native";
import { ScreenScroll } from "./ui/screen-scroll";
import { useAppTheme } from "@/lib/theme";
import { Button } from "./ui/button";
import { Text } from "./ui/text";
export type MaterialDialogContentProps = {
  message: { title: string; message?: string; buttons?: AlertButton[]; compactActions?: boolean } | null;
  dismiss: () => void; onAction: (button: AlertButton) => void;
};
export function MaterialDialogContent({ message, dismiss, onAction }: MaterialDialogContentProps) {
  const { colors } = useAppTheme();
  const destructive = message?.buttons?.some(button => button.style === "destructive");
  return <Portal><Dialog visible={!!message} onDismiss={dismiss} style={{ backgroundColor: colors.card, borderRadius: 24, marginHorizontal: 20 }}>
      <View className="px-5 py-5">
        <View accessibilityViewIsModal className="gap-2">
          {destructive ? <View className="mb-2 h-11 w-11 items-center justify-center rounded-[14px]" style={{ backgroundColor: colors.destructive + "18" }}><ShieldAlert size={21} color={colors.destructive} /></View> : null}
          <ScreenScroll style={{ maxHeight: 320 }}>
            <Text className="text-[21px] font-semibold">{message?.title}</Text>
            {message?.message ? <Text className="mt-2 text-sm leading-5 text-muted-foreground">{message.message}</Text> : null}
          </ScreenScroll>
          <View className={message?.compactActions ? "mt-4 flex-row justify-end gap-2" : "mt-4 gap-2"}>
            {(message?.buttons ?? [{ text: "Fermer" }]).map((button, i) => (
              <Button key={i} className={message?.compactActions ? "flex-1" : undefined} size={message?.compactActions ? "sm" : "default"} variant={button.style === "destructive" ? "destructive" : button.style === "cancel" ? "outline" : "default"} onPress={() => onAction(button)}>
                <Text>{button.text}</Text>
              </Button>
            ))}
          </View>
        </View>
      </View>
    </Dialog></Portal>;
}
