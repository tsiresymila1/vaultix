import { View } from "react-native";
import { Dialog, Portal } from "react-native-paper";
import { Eye, EyeOff, ShieldCheck } from "lucide-react-native";
import { useAppTheme } from "@/lib/theme";
import { Text } from "./ui/text";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";

export type UnlockDialogContentProps = {
  visible: boolean; busy: boolean; error: string; password: string; visiblePassword: boolean;
  onCancel: () => void; submit: () => Promise<void>;
  setPassword: (value: string) => void; setError: (value: string) => void;
  setVisiblePassword: (value: boolean | ((current: boolean) => boolean)) => void;
};
export function UnlockDialogContent({ visible, busy, error, password, visiblePassword, onCancel, submit, setPassword, setError, setVisiblePassword }: UnlockDialogContentProps) {
  const { colors } = useAppTheme();
  return <Portal><Dialog visible={visible} dismissable={!busy} onDismiss={() => { if (!busy) onCancel(); }} style={{ backgroundColor: colors.card, borderRadius: 24, marginHorizontal: 20 }}>
    <View accessibilityViewIsModal className="px-5 py-5">
      <View className="mb-4 h-11 w-11 items-center justify-center rounded-[14px]" style={{ backgroundColor: colors.elevated }}>
        <ShieldCheck size={22} color={colors.primary} />
      </View>
      <Text accessibilityRole="header" className="text-[22px] font-semibold">Déverrouiller</Text>
      <Text className="mb-5 mt-2 text-sm leading-5 text-muted-foreground">
        Saisissez votre mot de passe maître pour afficher cet identifiant. Le coffre restera ouvert pour cette session.
      </Text>
      <Label>Mot de passe maître</Label>
      <View className="mt-2 flex-row items-center gap-2">
        <Input
          accessibilityLabel="Mot de passe maître"
          placeholder="Saisir la clé de déverrouillage"
          autoFocus
          secureTextEntry={!visiblePassword}
          autoCapitalize="none"
          autoCorrect={false}
          value={password}
          onChangeText={value => { setPassword(value); if (error) setError(""); }}
          editable={!busy}
          onSubmitEditing={submit}
          returnKeyType="done"
          className="flex-1"
        />
        <Button variant="outline" size="icon" accessibilityRole="button" accessibilityLabel={visiblePassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} onPress={() => setVisiblePassword(current => !current)} className="h-12 w-12 items-center justify-center" style={{ backgroundColor: colors.card }}>
          {visiblePassword ? <EyeOff size={19} color={colors.mutedForeground} /> : <Eye size={19} color={colors.mutedForeground} />}
        </Button>
      </View>
      {error ? <Text accessibilityRole="alert" className="mt-3 text-sm text-destructive">{error}</Text> : null}
      <View className="mt-5 flex-row gap-2">
        <Button className="flex-1" size="sm" variant="outline" disabled={busy} onPress={onCancel}><Text>Fermer</Text></Button>
        <Button className="flex-1" size="sm" disabled={!password || busy} loading={busy} onPress={submit}><Text>Déverrouiller</Text></Button>
      </View>
    </View>
  </Dialog></Portal>;
}
