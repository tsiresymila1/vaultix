import { useState } from "react";
import { View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { FadeIn } from "@/components/motion";

type Step = "email" | "code" | "unlock";

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
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to send code");
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
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Invalid code");
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

  const subtitle =
    step === "email"
      ? "Sign in with your email to access your passwords"
      : step === "code"
        ? `Enter the code we sent to ${email}`
        : "Enter your master password to unlock your vault";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center px-6">
        <FadeIn>
          <View className="items-center mb-10 gap-3">
            <Logo size={40} showText={false} />
            <Text className="text-2xl font-bold text-foreground">Vaultix</Text>
            <Text className="text-sm text-muted-foreground text-center">{subtitle}</Text>
          </View>
        </FadeIn>

        {step === "email" && (
          <FadeIn delay={80} className="gap-4">
            <View className="gap-2">
              <Label>Email</Label>
              <Input
                placeholder="name@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                autoFocus
              />
            </View>
            <Button loading={loading} onPress={onSend}>
              <Text>Send code</Text>
            </Button>
          </FadeIn>
        )}

        {step === "code" && (
          <FadeIn delay={80} className="gap-4">
            <View className="gap-2">
              <Label>Login code</Label>
              <Input
                placeholder="123456"
                keyboardType="number-pad"
                value={code}
                onChangeText={setCode}
                autoFocus
              />
            </View>
            <Button loading={loading} onPress={onVerify}>
              <Text>Verify</Text>
            </Button>
            <Button variant="ghost" onPress={() => setStep("email")}>
              <Text>Use a different email</Text>
            </Button>
          </FadeIn>
        )}

        {step === "unlock" && (
          <FadeIn delay={80} className="gap-4">
            <View className="gap-2">
              <Label>Master password</Label>
              <Input
                placeholder="••••••••"
                secureTextEntry
                value={master}
                onChangeText={setMaster}
                autoFocus
              />
            </View>
            <Button loading={loading} onPress={onUnlock}>
              <Text>Unlock</Text>
            </Button>
          </FadeIn>
        )}
      </View>
    </SafeAreaView>
  );
}
