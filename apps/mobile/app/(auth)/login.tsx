import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

type Step = "email" | "code" | "unlock";

const stepIndex: Record<Step, number> = { email: 0, code: 1, unlock: 2 };

export default function Login() {
  const { sendCode, verifyCode, unlock } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [master, setMaster] = useState("");
  const [loading, setLoading] = useState(false);

  const onSend = async () => {
    if (loading || !email.trim()) return;
    setLoading(true);
    try {
      await sendCode(email.trim());
      setStep("code");
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Impossible d’envoyer le code");
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
        Alert.alert(
          "Configurer votre coffre",
          "Configurez d’abord votre mot de passe maître dans l’application web Vaultix, puis connectez-vous ici.",
        );
        return;
      }
      setStep("unlock");
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Code incorrect");
    } finally {
      setLoading(false);
    }
  };

  const onUnlock = async () => {
    if (loading || !master) return;
    setLoading(true);
    try {
      await unlock(master);
      router.replace("/(app)/(tabs)/passwords");
    } catch {
      Alert.alert("Erreur", "Mot de passe maître incorrect");
    } finally {
      setLoading(false);
    }
  };

  const titles = { email: "Se connecter", code: "Vérifier votre e-mail", unlock: "Déverrouiller le coffre" };
  const descriptions = {
    email: "Recevez un code pour vous connecter à votre compte.",
    code: `Saisissez le code envoyé à ${email}.`,
    unlock: "Votre mot de passe maître déchiffre le coffre sur cet appareil.",
  };
  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View className="h-12 justify-center">
            {step === "email" ? <Text className="text-xl font-semibold">Vaultix</Text> : (
              <Pressable accessibilityRole="button" accessibilityLabel="Retour" disabled={loading} onPress={() => setStep(step === "unlock" ? "code" : "email")} className="h-12 w-12 justify-center">
                <ArrowLeft size={22} color={colors.foreground} />
              </Pressable>
            )}
          </View>
          <View className="mb-8 mt-5 flex-row gap-1.5" accessibilityLabel={`Étape ${stepIndex[step] + 1} sur 3`}>
            {[0, 1, 2].map(index => <View key={index} className={`h-1 flex-1 rounded-full ${index <= stepIndex[step] ? "bg-primary" : "bg-border"}`} />)}
          </View>
          <Text accessibilityRole="header" className="text-[32px] font-semibold leading-10">{titles[step]}</Text>
          <Text className="mb-8 mt-3 text-sm leading-6 text-muted-foreground">{descriptions[step]}</Text>
          <View className="gap-3">
            <Label>{step === "email" ? "Adresse e-mail" : step === "code" ? "Code à 6 chiffres" : "Mot de passe maître"}</Label>
            {step === "email" ? <Input accessibilityLabel="Adresse e-mail" placeholder="nom@exemple.fr" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} editable={!loading} returnKeyType="go" onSubmitEditing={onSend} /> : step === "code" ? <Input accessibilityLabel="Code de vérification" placeholder="000000" keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" value={code} onChangeText={value => setCode(value.replace(/[^0-9]/g, ""))} maxLength={6} editable={!loading} className="text-xl tracking-[6px]" /> : <Input accessibilityLabel="Mot de passe maître" placeholder="Votre mot de passe maître" secureTextEntry autoComplete="off" value={master} onChangeText={setMaster} editable={!loading} returnKeyType="go" onSubmitEditing={onUnlock} />}
            <Button className="mt-3" loading={loading} disabled={step === "email" ? !email.trim() : step === "code" ? code.length !== 6 : !master} onPress={step === "email" ? onSend : step === "code" ? onVerify : onUnlock}>
              <Text>{step === "email" ? "Recevoir un code" : step === "code" ? "Vérifier le code" : "Ouvrir le coffre"}</Text>
            </Button>
            {step === "code" ? <Button variant="ghost" disabled={loading} onPress={async () => {
              setLoading(true);
              try { await sendCode(email.trim()); Alert.alert("Code envoyé", "Consultez votre boîte e-mail."); }
              catch { Alert.alert("Erreur", "Impossible de renvoyer le code."); }
              finally { setLoading(false); }
            }}><Text>Renvoyer le code</Text></Button> : null}
          </View>
          <Text className="mt-6 text-xs leading-5 text-muted-foreground">{step === "unlock" ? "Vaultix ne peut pas retrouver votre mot de passe maître." : "Votre mot de passe maître ne quitte jamais votre appareil."}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
