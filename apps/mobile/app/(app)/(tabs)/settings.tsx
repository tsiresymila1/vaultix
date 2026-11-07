import { useEffect, useState } from "react";
import { AppState, Platform, Alert, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronRight, KeyRound, LogOut, ShieldCheck, Smartphone } from "lucide-react-native";
import { FadeIn } from "@/components/motion";
import { ScreenHeader, SectionHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { isAutofillSupported, isAutofillEnabled, openAutofillSettings } from "@/modules/vaultix-autofill";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function Settings() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const email = session?.email || "Vaultix user";
  const autofillSupported = isAutofillSupported();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const refresh = () => { isAutofillEnabled().then(setEnabled).catch(() => setEnabled(false)); };
    refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => subscription.remove();
  }, []);

  const onSignOut = () => {
    Alert.alert("Sign out?", "Your decrypted session and local autofill data will be cleared.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Réglages" />

        <View className="px-6">
          <SectionHeader title="Compte" />
          <Text className="py-4 text-base">{email}</Text>
        </View>

        <View className="mt-8 px-6">
          <SectionHeader title="Sur cet appareil" />
          <View className="overflow-hidden bg-background">
            <SettingsRow
              icon={<ShieldCheck size={19} color={colors.primary} />}
              title="Chiffrement de bout en bout"
              subtitle="Actif sur cet appareil"
              status="Actif"
            />
            <SettingsRow
              icon={<Smartphone size={19} color={colors.accent} />}
              title="Autoremplissage"
              subtitle={autofillSupported ? (enabled ? "Activé dans les réglages système" : "Configurer Vaultix") : "Indisponible dans cette version"}
              status={autofillSupported ? (enabled ? "Activé" : "Configurer") : undefined}
              onPress={autofillSupported ? () => {
                if (Platform.OS === "android") {
                  try { openAutofillSettings(); } catch { Alert.alert("Autofill", "Open Android Settings → Autofill service → Vaultix."); }
                } else {
                  Alert.alert("Autofill", "Enable Vaultix in Settings → Passwords → Password Options (or General → AutoFill & Passwords).");
                }
              } : undefined}
            />
            <SettingsRow
              icon={<KeyRound size={19} color={colors.warning} />}
              title="Clé d’identité"
              subtitle="Conservée sur cet appareil"
              last
            />
          </View>
        </View>

        <FadeIn delay={90} className="mt-8 px-6">
          <SectionHeader title="Session" />
          <Button variant="outline" onPress={onSignOut} className="border-destructive/30">
            <LogOut size={18} color={colors.destructive} />
            <Text className="text-destructive">Se déconnecter</Text>
          </Button>
          <Text className="mt-3 text-center text-xs text-muted-foreground">Vaultix mobile 0.1.0</Text>
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({
  icon,
  title,
  subtitle,
  status,
  last,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  status?: string;
  last?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole={onPress ? "button" : undefined} className={`h-[76px] flex-row items-center gap-3 px-4 ${last ? "" : "border-b border-border"}`}>
      <View className="h-10 w-10 items-center justify-center bg-transparent">{icon}</View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-semibold text-foreground">{title}</Text>
        <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>{subtitle}</Text>
      </View>
      {status ? <Text className="text-xs font-semibold text-primary">{status}</Text> : <ChevronRight size={17} color={colors.mutedForeground} />}
    </Pressable>
  );
}
