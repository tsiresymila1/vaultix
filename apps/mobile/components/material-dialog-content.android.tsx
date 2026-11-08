import { AlertDialog, Host, Column, Row, Text, TextButton } from "@expo/ui/jetpack-compose";
import { verticalScroll } from "@expo/ui/jetpack-compose/modifiers";
import { colors } from "@/lib/theme";
import type { MaterialDialogContentProps } from "./material-dialog-content";

export function MaterialDialogContent({ message, dismiss, onAction }: MaterialDialogContentProps) {
  if (!message) return null;
  const Actions = message.compactActions ? Row : Column;
  return <Host colorScheme="light" seedColor={colors.primary} style={{ position: "absolute", width: 0, height: 0 }}>
    <AlertDialog onDismissRequest={dismiss} colors={{ containerColor: colors.card, titleContentColor: colors.foreground, textContentColor: colors.mutedForeground }}>
      <AlertDialog.Title><Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 20 }}>{message.title}</Text></AlertDialog.Title>
      <AlertDialog.Text><Column modifiers={[verticalScroll()]}><Text style={{ fontFamily: "Poppins_400Regular", fontSize: 14 }}>{message.message}</Text></Column></AlertDialog.Text>
      <AlertDialog.ConfirmButton><Actions>
        {(message.buttons ?? [{ text: "Fermer" }]).map((button, index) => <TextButton key={index} onClick={() => onAction(button)} colors={{ contentColor: button.style === "destructive" ? colors.destructive : colors.foreground }}>
          <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 14 }}>{button.text}</Text>
        </TextButton>)}
      </Actions></AlertDialog.ConfirmButton>
    </AlertDialog>
  </Host>;
}
