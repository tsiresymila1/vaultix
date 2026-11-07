import { useEffect, useState } from "react";
import { Modal, KeyboardAvoidingView, Platform, View } from "react-native";
import { Text } from "./ui/text";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export function UnlockDialog({ visible, onCancel, onUnlock }: { visible: boolean; onCancel: () => void; onUnlock: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (!visible) { setPassword(""); setError(""); } }, [visible]);
  const submit = async () => {
    if (busy || !password) return;
    setBusy(true); setError("");
    try { await onUnlock(password); setPassword(""); }
    catch (reason) { setError(reason instanceof Error ? `Déverrouillage impossible : ${reason.message}` : "Déverrouillage impossible."); }
    finally { setBusy(false); }
  };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy) onCancel(); }}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 justify-center bg-black/40 px-6">
      <View accessibilityViewIsModal className="gap-4 rounded-[28px] bg-card p-6">
        <Text accessibilityRole="header" className="text-xl font-semibold">Déverrouiller les identifiants</Text>
        <Text className="text-sm leading-6 text-muted-foreground">Votre mot de passe maître déchiffre les identifiants sur cet appareil. Le coffre reste ouvert pour cette session.</Text>
        <Input accessibilityLabel="Mot de passe maître" placeholder="Mot de passe maître" autoFocus secureTextEntry autoCapitalize="none" autoCorrect={false} value={password} onChangeText={setPassword} editable={!busy} onSubmitEditing={submit} />
        {error ? <Text accessibilityRole="alert" className="text-sm text-destructive">{error}</Text> : null}
        <Button disabled={!password || busy} loading={busy} onPress={submit}><Text>Déverrouiller</Text></Button>
        <Button variant="ghost" disabled={busy} onPress={onCancel}><Text>Annuler</Text></Button>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
