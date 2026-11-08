import { View, type AlertButton } from "react-native";
import { BottomSheet } from "@expo/ui";
import { ScreenScroll } from "./ui/screen-scroll";
import { colors } from "@/lib/theme";
import { Button } from "./ui/button";
import { Text } from "./ui/text";
export type MaterialDialogContentProps = {
  message: { title: string; message?: string; buttons?: AlertButton[]; compactActions?: boolean } | null;
  dismiss: () => void; onAction: (button: AlertButton) => void;
};
export function MaterialDialogContent({ message, dismiss, onAction }: MaterialDialogContentProps) {
  return <BottomSheet isPresented={!!message} onDismiss={dismiss} containerColor={colors.card} snapPoints={["half", "full"]}>
      <View className="flex-1 px-6 py-6">
        <View accessibilityViewIsModal className="flex-1 gap-4">
          <ScreenScroll><Text className="text-xl font-semibold">{message?.title}</Text><Text className="mt-3 text-sm leading-6 text-muted-foreground">{message?.message}</Text></ScreenScroll>
          <View className={message?.compactActions ? "mt-5 flex-row justify-end gap-2" : "mt-5 gap-2"}>{(message?.buttons ?? [{ text: "Fermer" }]).map((button, i) => <Button key={i} className={message?.compactActions ? "flex-1" : undefined} size={message?.compactActions ? "sm" : "default"} variant={button.style === "destructive" ? "destructive" : button.style === "cancel" ? "ghost" : "default"} onPress={() => onAction(button)}><Text>{button.text}</Text></Button>)}</View>
        </View>
      </View>
    </BottomSheet>;
}
