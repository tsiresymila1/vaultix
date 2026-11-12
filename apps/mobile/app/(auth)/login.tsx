import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useMaterialDialog } from "@/components/material-dialog";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScreenScroll } from "@/components/ui/screen-scroll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth";
import { useAppTheme } from "@/lib/theme";

type Step = "email" | "code";
const stepIndex: Record<Step, number> = { email: 0, code: 1 };

export default function Login() {
  const dialog = useMaterialDialog();
  const { sendCode, verifyCode } = useAuth();
  const { colors } = useAppTheme();
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const onSend = async () => {
    if (loading || !email.trim()) return;
    setLoading(true);
    try {
      await sendCode(email.trim());
      setStep("code");
    } catch (error) {
      dialog.alert("Erreur", error instanceof Error ? error.message : "Impossible d’envoyer le code.");
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    if (loading || code.length !== 6) return;
    setLoading(true);
    try {
      const { needsSetup } = await verifyCode(email.trim(), code.trim());
      if (needsSetup) {
        dialog.alert("Configurer votre coffre", "Vos projets sont accessibles. Pour ouvrir les identifiants, configurez d’abord le mot de passe maître sur le web.");
        router.replace("/(app)/(tabs)");
        return;
      }
      router.replace("/(app)/(tabs)/passwords");
    } catch (error) {
      dialog.alert("Code invalide", error instanceof Error ? error.message : "Vérifiez le code puis réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScreenScroll contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          <View className="mb-7 flex-row items-center justify-between">
            <Logo size={22} />
            <ThemeToggle />
          </View>
          <View className="mb-6 flex-row gap-2" accessibilityLabel={"Étape " + (stepIndex[step] + 1) + " sur 2"}>
            {[0, 1].map(index => <View key={index} className="h-1 flex-1 rounded-full" style={{ backgroundColor: index <= stepIndex[step] ? colors.primary : colors.border }} />)}
          </View>

          {step === "email" ? (
            <>
              <Text className="mb-1 text-[11px] font-semibold tracking-[1.2px] text-primary">VOTRE ESPACE SÉCURISÉ</Text>
              <Text accessibilityRole="header" className="text-[30px] font-semibold leading-9">Bienvenue sur Vaultix</Text>
              <Text className="mb-7 mt-3 text-sm leading-6 text-muted-foreground">Connectez-vous avec votre adresse e-mail. Nous vous enverrons un code de vérification.</Text>
              <Label>Adresse e-mail</Label>
              <Input accessibilityLabel="Adresse e-mail" placeholder="nom@exemple.fr" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} editable={!loading} returnKeyType="go" onSubmitEditing={onSend} />
              <Button className="mt-4" loading={loading} disabled={!email.trim()} onPress={onSend}>
                <Text>Recevoir un code</Text>
              </Button>
              <Text className="mt-5 text-xs leading-5 text-muted-foreground">Le mot de passe maître sera demandé à l’ouverture de votre premier identifiant.</Text>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" accessibilityRole="button" accessibilityLabel="Retour" disabled={loading} onPress={() => setStep("email")} className="mb-5 h-11 w-11 items-center justify-center" style={{ backgroundColor: colors.card }}>
                <ArrowLeft size={21} color={colors.foreground} />
              </Button>
              <Text className="mb-1 text-[11px] font-semibold tracking-[1.2px] text-primary">VÉRIFICATION</Text>
              <Text accessibilityRole="header" className="text-[30px] font-semibold leading-9">Consultez vos e-mails</Text>
              <Text className="mb-7 mt-3 text-sm leading-6 text-muted-foreground">Saisissez le code envoyé à {email}.</Text>
              <Label>Code de vérification</Label>
              <Input accessibilityLabel="Code de vérification" placeholder="000000" keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" value={code} onChangeText={setCode} normalize={value => value.replace(/[^0-9]/g, "")} maxLength={6} editable={!loading} className="text-center text-xl tracking-[6px]" />
              <Button className="mt-4" loading={loading} disabled={code.length !== 6} onPress={onVerify}><Text>Vérifier le code</Text></Button>
              <Button variant="ghost" disabled={loading} onPress={async () => {
                setLoading(true);
                try { await sendCode(email.trim()); dialog.alert("Code envoyé", "Consultez votre boîte e-mail."); }
                catch { dialog.alert("Erreur", "Impossible de renvoyer le code."); }
                finally { setLoading(false); }
              }}><Text className="text-primary">Renvoyer le code</Text></Button>
            </>
          )}
        </ScreenScroll>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
