import { useEffect } from "react";
import { useNativeState, AlertDialog, Host, Column, Text, TextButton, Button, OutlinedTextField } from "@expo/ui/jetpack-compose";
import { fillMaxWidth, verticalScroll } from "@expo/ui/jetpack-compose/modifiers";
import { colors } from "@/lib/theme";
import type { UnlockDialogContentProps } from "./unlock-dialog-content";

export function UnlockDialogContent({ visible, busy, error, password, visiblePassword, onCancel, submit, setPassword, setError, setVisiblePassword }: UnlockDialogContentProps) {
  const value = useNativeState("");
  // Only synchronize clears; echoing asynchronous typing events back can move the cursor.
  useEffect(() => { if (!password) value.set(""); }, [password, value]);
  if (!visible) return null;
  return <Host colorScheme="light" seedColor={colors.primary} style={{ position: "absolute", width: 0, height: 0 }}>
    <AlertDialog colors={{ containerColor: colors.card, titleContentColor: colors.foreground, textContentColor: colors.mutedForeground }}
      properties={{ dismissOnBackPress: !busy, dismissOnClickOutside: !busy }} onDismissRequest={() => { if (!busy) onCancel(); }}>
      <AlertDialog.Title><Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 20 }}>Déverrouiller les identifiants</Text></AlertDialog.Title>
      <AlertDialog.Text><Column modifiers={[verticalScroll()]} verticalArrangement={{ spacedBy: 16 }}>
        <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 14 }}>Votre mot de passe maître déchiffre les identifiants sur cet appareil. Le coffre reste ouvert pour cette session.</Text>
        <OutlinedTextField value={value} onValueChange={setPassword} autoFocus singleLine enabled={!busy} isError={!!error}
          modifiers={[fillMaxWidth()]} visualTransformation={visiblePassword ? "none" : "password"}
          textStyle={{ fontFamily: "Poppins_400Regular", fontSize: 14 }}
          colors={{ focusedIndicatorColor: colors.primary, cursorColor: colors.primary, focusedLabelColor: colors.foreground }}
          keyboardOptions={{ keyboardType: "password", capitalization: "none", autoCorrectEnabled: false, imeAction: "done" }}
          keyboardActions={{ onDone: () => { void submit(); } }}>
          <OutlinedTextField.Label><Text style={{ fontFamily: "Poppins_400Regular" }}>Mot de passe maître</Text></OutlinedTextField.Label>
          <OutlinedTextField.TrailingIcon><TextButton enabled={!busy} onClick={() => setVisiblePassword(current => !current)}><Text style={{ fontFamily: "Poppins_500Medium", fontSize: 11 }}>{visiblePassword ? "Masquer" : "Afficher"}</Text></TextButton></OutlinedTextField.TrailingIcon>
        </OutlinedTextField>
        {error ? <Text color={colors.destructive} style={{ fontFamily: "Poppins_400Regular", fontSize: 13 }}>{error}</Text> : null}
      </Column></AlertDialog.Text>
      <AlertDialog.DismissButton><TextButton enabled={!busy} onClick={onCancel} colors={{ contentColor: colors.foreground }}><Text style={{ fontFamily: "Poppins_500Medium" }}>Fermer</Text></TextButton></AlertDialog.DismissButton>
      <AlertDialog.ConfirmButton><Button enabled={!busy && (!!error || !!password)} colors={{ containerColor: colors.primary, contentColor: colors.primaryForeground }}
        onClick={error ? () => { setPassword(""); setError(""); setVisiblePassword(false); } : () => { void submit(); }}>
        <Text style={{ fontFamily: "Poppins_500Medium" }}>{busy ? "Ouverture…" : error ? "Réessayer" : "Déverrouiller"}</Text>
      </Button></AlertDialog.ConfirmButton>
    </AlertDialog>
  </Host>;
}
