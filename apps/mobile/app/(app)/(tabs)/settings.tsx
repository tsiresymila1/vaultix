import { useEffect, useState } from "react";
import { AppState, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronRight, KeyRound, LogOut, Moon, ShieldCheck, Smartphone, Sun } from "lucide-react-native";
import { ScreenScroll } from "@/components/ui/screen-scroll";
import { useMaterialDialog } from "@/components/material-dialog";
import { FadeIn } from "@/components/motion";
import { ScreenHeader, SectionHeader } from "@/components/screen-header";
import { ListRow } from "@/components/ui/list-row";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { isAutofillSupported, isAutofillEnabled, openAutofillSettings } from "@/modules/vaultix-autofill";
import { useAuth } from "@/lib/auth";
import { useAppTheme } from "@/lib/theme";

export default function Settings() {
  const dialog = useMaterialDialog();
  const { session, signOut } = useAuth();
  const { colors, mode, toggleMode } = useAppTheme();
  const router = useRouter();
  const email = session?.email || "Utilisateur Vaultix";
  const autofillSupported = isAutofillSupported();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const refresh = () => { isAutofillEnabled().then(setEnabled).catch(() => setEnabled(false)); };
    refresh();
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") refresh();
    });
    return () => subscription.remove();
  }, []);

  const onSignOut = () => {
    dialog.alert("Se déconnecter ?", "Vous devrez vous reconnecter pour accéder à vos coffres. La session déchiffrée et les données locales d’autoremplissage seront supprimées.", [
      { text: "Annuler", style: "cancel" },
      { text: "Se déconnecter", style: "destructive", onPress: async () => {
        await signOut();
        router.replace("/(auth)/login");
      } },
    ], { compactActions: true });
  };

  const onAutofill = () => {
    if (!autofillSupported) return;
    if (Platform.OS === "android") {
      try { openAutofillSettings(); }
      catch { dialog.alert("Autoremplissage", "Ouvrez Paramètres Android → Service de saisie automatique → Vaultix."); }
    } else {
      dialog.alert("Autoremplissage", "Activez Vaultix dans Réglages → Mots de passe → Options des mots de passe.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" style={{ backgroundColor: colors.background }} edges={["top"]}>
      <ScreenScroll contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="COMPTE & APPAREIL" title="Réglages" subtitle={email} />

        <View className="px-5">
          <SectionHeader title="Compte" />
          <View className="rounded-2xl border px-4 py-3" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <Text className="text-sm font-medium">{email}</Text>
            <Text className="mt-1 text-xs text-muted-foreground">Compte Vaultix sécurisé</Text>
          </View>
        </View>

        <View className="mt-6 px-5">
          <SectionHeader title="Apparence" />
          <SettingsRow
            icon={mode === "light" ? <Sun size={19} color={colors.primary} /> : <Moon size={19} color={colors.primary} />}
            title="Thème"
            subtitle="Choisissez votre apparence"
            status={mode === "light" ? "Clair" : "Sombre"}
            onPress={toggleMode}
          />
        </View>

        <View className="mt-6 px-5">
          <SectionHeader title="Sur cet appareil" />
          <View className="overflow-hidden rounded-2xl border px-3" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
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
              onPress={onAutofill}
            />
            <SettingsRow
              icon={<KeyRound size={19} color={colors.warning} />}
              title="Clé d’identité"
              subtitle="Conservée sur cet appareil"
              last
            />
          </View>
        </View>

        <FadeIn delay={90} className="mt-6 px-5">
          <SectionHeader title="Session" />
          <Button variant="outline" onPress={onSignOut} className="w-full" style={{ borderColor: colors.destructive + "66" }}>
            <LogOut size={18} color={colors.destructive} />
            <Text className="text-destructive">Se déconnecter</Text>
          </Button>
          <Text className="mt-3 text-center text-xs text-muted-foreground">Vaultix mobile 0.1.0</Text>
        </FadeIn>
      </ScreenScroll>
    </SafeAreaView>
  );
}

function SettingsRow({ icon, title, subtitle, status, last, onPress }: {
  icon: React.ReactNode; title: string; subtitle: string; status?: string; last?: boolean; onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  return <View style={!last ? { borderBottomWidth: 1, borderBottomColor: colors.border } : undefined}>
    <ListRow title={title} detail={subtitle} icon={icon} onPress={onPress}
      trailing={status ? <Text className="px-3 text-xs font-semibold text-primary">{status}</Text> : onPress ? <ChevronRight size={17} color={colors.mutedForeground} /> : undefined} />
  </View>;
}
