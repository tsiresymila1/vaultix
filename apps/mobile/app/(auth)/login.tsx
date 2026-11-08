import { ScreenScroll } from "@/components/ui/screen-scroll";
import { useMaterialDialog } from "@/components/material-dialog";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

type Step = "email" | "code";

const stepIndex: Record<Step, number> = { email: 0, code: 1 };

export default function Login() {
  const dialog = useMaterialDialog();
  const { sendCode, verifyCode } = useAuth();
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
      dialog.alert("Erreur", error instanceof Error ? error.message : "Impossible d’envoyer le code");
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
        dialog.alert(
          "Configurer votre coffre",
          "Vos projets sont accessibles. Pour utiliser les identifiants, configurez leur mot de passe maître sur le web.",
        );
        router.replace("/(app)/(tabs)");
        return;
      }
      router.replace("/(app)/(tabs)/passwords");
    } catch (error) {
      dialog.alert("Erreur", error instanceof Error ? error.message : "Code incorrect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScreenScroll contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View className="h-12 justify-center">
            {step === "email" ? <Text className="text-xl font-semibold">Vaultix</Text> : (
              <Button variant="ghost" size="icon" accessibilityRole="button" accessibilityLabel="Retour" disabled={loading} onPress={() => setStep("email")} className="h-12 w-12 justify-center">
                <ArrowLeft size={22} color={colors.foreground} />
              </Button>
            )}
          </View>
          <View className="mb-8 mt-5 flex-row gap-1.5" accessibilityLabel={`Étape ${stepIndex[step] + 1} sur 2`}>
            {[0, 1].map(index => <View key={index} className={`h-1 flex-1 rounded-full ${index <= stepIndex[step] ? "bg-primary" : "bg-border"}`} />)}
          </View>
          <Text accessibilityRole="header" className="text-[32px] font-semibold leading-10">{step === "email" ? "Se connecter" : "Vérifier votre e-mail"}</Text>
          <Text className="mb-8 mt-3 text-sm leading-6 text-muted-foreground">{step === "email" ? "Recevez un code pour vous connecter à votre compte." : `Saisissez le code envoyé à ${email}.`}</Text>
          <View className="gap-3">
            <Label>{step === "email" ? "Adresse e-mail" : "Code à 6 chiffres"}</Label>
            {step === "email" ? <Input accessibilityLabel="Adresse e-mail" placeholder="nom@exemple.fr" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} editable={!loading} returnKeyType="go" onSubmitEditing={onSend} /> : <Input accessibilityLabel="Code de vérification" placeholder="000000" keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" value={code} onChangeText={setCode} normalize={value => value.replace(/[^0-9]/g, "")} maxLength={6} editable={!loading} className="text-xl tracking-[6px]" />}
            <Button className="mt-3" loading={loading} disabled={step === "email" ? !email.trim() : code.length !== 6} onPress={step === "email" ? onSend : onVerify}>
              <Text>{step === "email" ? "Recevoir un code" : "Vérifier le code"}</Text>
            </Button>
            {step === "code" ? <Button variant="ghost" disabled={loading} onPress={async () => {
              setLoading(true);
              try { await sendCode(email.trim()); dialog.alert("Code envoyé", "Consultez votre boîte e-mail."); }
              catch { dialog.alert("Erreur", "Impossible de renvoyer le code."); }
              finally { setLoading(false); }
            }}><Text>Renvoyer le code</Text></Button> : null}
          </View>
          <Text className="mt-6 text-xs leading-5 text-muted-foreground">Votre mot de passe maître sera demandé à l’ouverture d’un identifiant.</Text>
        </ScreenScroll>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
