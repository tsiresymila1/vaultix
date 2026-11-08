import { View } from "react-native";
import { BottomSheet } from "@expo/ui";
import { interactiveDismissDisabled } from "@expo/ui/swift-ui/modifiers";
import { Eye, EyeOff } from "lucide-react-native";
import { colors } from "@/lib/theme";
import { Text } from "./ui/text";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export type UnlockDialogContentProps = {
  visible: boolean; busy: boolean; error: string; password: string; visiblePassword: boolean;
  onCancel: () => void; submit: () => Promise<void>;
  setPassword: (value: string) => void; setError: (value: string) => void;
  setVisiblePassword: (value: boolean | ((current: boolean) => boolean)) => void;
};
export function UnlockDialogContent({ visible, busy, error, password, visiblePassword, onCancel, submit, setPassword, setError, setVisiblePassword }: UnlockDialogContentProps) {
  return <BottomSheet isPresented={visible} onDismiss={() => { if (!busy) onCancel(); }} modifiers={[interactiveDismissDisabled(busy)]} containerColor={colors.card} snapPoints={["full"]}>
    <View className="px-6 py-8">
      <View accessibilityViewIsModal className="gap-4 rounded-[28px] bg-card p-6">
        <Text accessibilityRole="header" className="text-xl font-semibold">Déverrouiller les identifiants</Text>
        <Text className="text-sm leading-6 text-muted-foreground">Votre mot de passe maître déchiffre les identifiants sur cet appareil. Le coffre reste ouvert pour cette session.</Text>
        <View className="flex-row items-center gap-2">
          <Input accessibilityLabel="Mot de passe maître" placeholder="Mot de passe maître" autoFocus secureTextEntry={!visiblePassword} autoCapitalize="none" autoCorrect={false} value={password} onChangeText={setPassword} editable={!busy} onSubmitEditing={submit} className="flex-1" />
          <Button variant="ghost" size="icon" accessibilityRole="button" accessibilityLabel={visiblePassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} accessibilityState={{ checked: visiblePassword }} onPress={() => setVisiblePassword(current => !current)} className="h-12 w-12 items-center justify-center">
            {visiblePassword ? <EyeOff size={20} color={colors.mutedForeground} /> : <Eye size={20} color={colors.mutedForeground} />}
          </Button>
        </View>
        {error ? <Text accessibilityRole="alert" className="text-sm text-destructive">{error}</Text> : null}
        <View className="flex-row justify-end gap-2">
          <Button className="flex-1" size="sm" variant="ghost" disabled={busy} onPress={onCancel}><Text>Fermer</Text></Button>
          <Button className="flex-1" size="sm" disabled={(!error && !password) || busy} loading={busy} onPress={error ? () => { setPassword(""); setError(""); setVisiblePassword(false); } : submit}><Text>{error ? "Réessayer" : "Déverrouiller"}</Text></Button>
        </View>
      </View>
    </View>
  </BottomSheet>;
}
