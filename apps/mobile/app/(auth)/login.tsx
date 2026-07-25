import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, ArrowRight, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react-native";
import { Logo } from "@/components/Logo";
import { FadeIn } from "@/components/motion";
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
    if (!email.trim()) return;
    setLoading(true);
    try {
      await sendCode(email.trim());
      setStep("code");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const { needsSetup } = await verifyCode(email.trim(), code.trim());
      if (needsSetup) {
        Alert.alert(
          "Set up your vault",
          "Set your password-vault master password in the Vaultix web app first, then sign in here.",
        );
        return;
      }
      setStep("unlock");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const onUnlock = async () => {
    if (!master) return;
    setLoading(true);
    try {
      await unlock(master);
      router.replace("/(app)/(tabs)");
    } catch {
      Alert.alert("Error", "Incorrect master password");
    } finally {
      setLoading(false);
    }
  };

  const content = {
    email: {
      icon: <Mail size={22} color={colors.primary} />,
      title: "Welcome back",
      subtitle: "Sign in to continue to Vaultix Password.",
    },
    code: {
      icon: <KeyRound size={22} color={colors.accent} />,
      title: "Check your inbox",
      subtitle: `Enter the verification code sent to ${email}.`,
    },
    unlock: {
      icon: <LockKeyhole size={22} color={colors.warning} />,
      title: "Unlock your vault",
      subtitle: "Your master password decrypts this session on-device.",
    },
  }[step];

  const goBack = () => {
    if (step === "unlock") setStep("code");
    if (step === "code") setStep("email");
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center justify-between px-5 pt-2">
          <Logo size={21} />
          <View className="flex-row gap-1.5">
            {[0, 1, 2].map((index) => (
              <View
                key={index}
                className={`h-1.5 w-7 rounded-full ${index <= stepIndex[step] ? "bg-primary" : "bg-secondary"}`}
              />
            ))}
          </View>
        </View>

        <View className="flex-1 justify-center px-6 pb-10">
          {step !== "email" ? (
            <Pressable onPress={goBack} className="mb-7 h-10 w-10 items-center justify-center rounded-md border border-border bg-card">
              <ArrowLeft size={19} color={colors.foreground} />
            </Pressable>
          ) : null}

          <FadeIn key={step}>
            <View className="mb-8">
              <View className="mb-5 h-12 w-12 items-center justify-center rounded-md border border-border bg-card">
                {content.icon}
              </View>
              <Text className="text-[30px] font-bold leading-9 text-foreground">{content.title}</Text>
              <Text className="mt-2 max-w-[320px] text-sm leading-5 text-muted-foreground">
                {content.subtitle}
              </Text>
            </View>

            {step === "email" ? (
              <View className="gap-5">
                <View className="gap-2">
                  <Label className="text-xs text-muted-foreground">Email address</Label>
                  <Input
                    placeholder="name@example.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    autoFocus
                    returnKeyType="go"
                    onSubmitEditing={onSend}
                  />
                </View>
                <Button loading={loading} onPress={onSend} disabled={!email.trim()}>
                  <Text>Continue</Text>
                  <ArrowRight size={18} color={colors.primaryForeground} />
                </Button>
              </View>
            ) : null}

            {step === "code" ? (
              <View className="gap-5">
                <View className="gap-2">
                  <Label className="text-xs text-muted-foreground">Verification code</Label>
                  <Input
                    placeholder="123456"
                    keyboardType="number-pad"
                    value={code}
                    onChangeText={setCode}
                    autoFocus
                    maxLength={6}
                    className="text-center text-xl font-semibold"
                  />
                </View>
                <Button loading={loading} onPress={onVerify} disabled={!code.trim()}>
                  <Text>Verify code</Text>
                  <ArrowRight size={18} color={colors.primaryForeground} />
                </Button>
              </View>
            ) : null}

            {step === "unlock" ? (
              <View className="gap-5">
                <View className="gap-2">
                  <Label className="text-xs text-muted-foreground">Master password</Label>
                  <Input
                    placeholder="Enter your master password"
                    secureTextEntry
                    value={master}
                    onChangeText={setMaster}
                    autoFocus
                    returnKeyType="go"
                    onSubmitEditing={onUnlock}
                  />
                </View>
                <Button loading={loading} onPress={onUnlock} disabled={!master}>
                  <LockKeyhole size={18} color={colors.primaryForeground} />
                  <Text>Unlock vault</Text>
                </Button>
              </View>
            ) : null}
          </FadeIn>
        </View>

        <View className="flex-row items-center justify-center gap-2 pb-4">
          <ShieldCheck size={14} color={colors.mutedForeground} />
          <Text className="text-xs text-muted-foreground">Encrypted on this device</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
