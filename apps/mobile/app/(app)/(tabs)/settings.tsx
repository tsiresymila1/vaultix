import { Alert, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronRight, KeyRound, LogOut, Mail, ShieldCheck, Smartphone } from "lucide-react-native";
import { FadeIn } from "@/components/motion";
import { ScreenHeader, SectionHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { isAutofillSupported } from "@/modules/vaultix-autofill";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function Settings() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const email = session?.email || "Vaultix user";
  const initial = email.slice(0, 1).toUpperCase();
  const autofillSupported = isAutofillSupported();

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
      <ScrollView contentContainerStyle={{ paddingBottom: 104 }} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="Vaultix Password" title="Settings" subtitle="Security and account preferences" />

        <FadeIn className="mx-5 flex-row items-center gap-3 rounded-md border border-border bg-card p-4">
          <View className="h-12 w-12 items-center justify-center rounded-md bg-accent/10">
            <Text className="text-lg font-bold text-accent">{initial}</Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-xs text-muted-foreground">Signed in as</Text>
            <Text className="mt-0.5 text-base font-semibold text-foreground" numberOfLines={1}>
              {email}
            </Text>
          </View>
          <Mail size={18} color={colors.mutedForeground} />
        </FadeIn>

        <View className="mt-8 px-5">
          <SectionHeader title="Security" />
          <View className="overflow-hidden rounded-md border border-border bg-card">
            <SettingsRow
              icon={<ShieldCheck size={19} color={colors.primary} />}
              title="End-to-end encryption"
              subtitle="Active on this device"
              status="Protected"
            />
            <SettingsRow
              icon={<Smartphone size={19} color={colors.accent} />}
              title="System autofill"
              subtitle={autofillSupported ? "Credentials sync automatically" : "Unavailable in this build"}
              status={autofillSupported ? "Ready" : undefined}
            />
            <SettingsRow
              icon={<KeyRound size={19} color={colors.warning} />}
              title="Identity key"
              subtitle="Stored in your secure session"
              last
            />
          </View>
        </View>

        <FadeIn delay={90} className="mt-8 px-5">
          <SectionHeader title="Account" />
          <Button variant="outline" onPress={onSignOut} className="border-destructive/30">
            <LogOut size={18} color={colors.destructive} />
            <Text className="text-destructive">Sign out</Text>
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
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  status?: string;
  last?: boolean;
}) {
  return (
    <Pressable className={`h-[76px] flex-row items-center gap-3 px-4 ${last ? "" : "border-b border-border"}`}>
      <View className="h-10 w-10 items-center justify-center rounded-md bg-secondary">{icon}</View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-semibold text-foreground">{title}</Text>
        <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>{subtitle}</Text>
      </View>
      {status ? <Text className="text-xs font-semibold text-primary">{status}</Text> : <ChevronRight size={17} color={colors.mutedForeground} />}
    </Pressable>
  );
}
