import { useEffect, useState } from "react";
import { Modal, KeyboardAvoidingView, Platform, View, Pressable } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { colors } from "@/lib/theme";
import { Text } from "./ui/text";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export function UnlockDialog({ visible, onCancel, onUnlock }: { visible: boolean; onCancel: () => void; onUnlock: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (!visible) { setPassword(""); setError(""); setVisiblePassword(false); } }, [visible]);
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
        <View className="flex-row items-center rounded-t-xl border-b border-muted-foreground bg-input">
          <Input accessibilityLabel="Mot de passe maître" placeholder="Mot de passe maître" autoFocus secureTextEntry={!visiblePassword} autoCapitalize="none" autoCorrect={false} value={password} onChangeText={setPassword} editable={!busy} onSubmitEditing={submit} className="flex-1 border-0 bg-transparent" />
          <Pressable accessibilityRole="button" accessibilityLabel={visiblePassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} accessibilityState={{ checked: visiblePassword }} onPress={() => setVisiblePassword(current => !current)} className="h-12 w-12 items-center justify-center">
            {visiblePassword ? <EyeOff size={20} color={colors.mutedForeground} /> : <Eye size={20} color={colors.mutedForeground} />}
          </Pressable>
        </View>
        {error ? <Text accessibilityRole="alert" className="text-sm text-destructive">{error}</Text> : null}
        <View className="flex-row justify-end gap-2">
          <Button size="sm" variant="ghost" disabled={busy} onPress={onCancel}><Text>Fermer</Text></Button>
          <Button size="sm" disabled={(!error && !password) || busy} loading={busy} onPress={error ? () => { setPassword(""); setError(""); setVisiblePassword(false); } : submit}><Text>{error ? "Réessayer" : "Déverrouiller"}</Text></Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
