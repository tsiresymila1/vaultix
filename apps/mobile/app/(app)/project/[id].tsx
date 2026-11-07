import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Copy, Eye } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { db } from "@/lib/instant";
import { api, bearer } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { unsealKey, decryptSecret } from "@/lib/crypto";
import { Text } from "@/components/ui/text";
import { useMaterialDialog } from "@/components/material-dialog";
import { colors } from "@/lib/theme";

export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { user } = db.useAuth();
  const router = useRouter();
  const dialog = useMaterialDialog();
  const [environment, setEnvironment] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const { data, isLoading, error } = db.useQuery(user && id ? {
    vaults: { $: { where: { id } }, environments: {}, secrets: { environment: {} } },
    vaultMembers: { $: { where: { "vault.id": id, "member.$user.id": user.id } } },
  } : null);
  const vault = data?.vaults[0];
  const selectedEnvironment = environment ?? vault?.environments[0]?.id;
  const entries = vault?.secrets.filter(secret => secret.environment?.id === selectedEnvironment) ?? [];
  const reveal = async (secret: { id: string; encryptedPayload: string; nonce: string }, copy = false) => {
    if (!session || busy) return;
    setBusy(secret.id);
    try {
      let plain = values[secret.id];
      if (plain === undefined) {
        const res = await api.cli.$post({ json: { action: "get-user-crypto", params: {} } }, { headers: bearer(session.token) });
        const body = await res.json() as { data?: { public_key?: string; private_key?: string } };
        const membership = data?.vaultMembers[0];
        if (!res.ok || !membership || !body.data?.public_key || !body.data.private_key) throw new Error("Accès au projet impossible");
        const key = await unsealKey(membership.encryptedVaultKey, body.data.public_key, body.data.private_key);
        plain = await decryptSecret(secret.encryptedPayload, secret.nonce, key);
        setValues(current => ({ ...current, [secret.id]: plain }));
      }
      if (copy) { await Clipboard.setStringAsync(plain); dialog.alert("Copié", "Valeur copiée dans le presse-papiers."); }
    } catch { dialog.alert("Erreur", "Impossible de déchiffrer cette valeur. Vérifiez votre accès au projet."); }
    finally { setBusy(null); }
  };
  return <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Retour aux coffres" onPress={() => router.back()} className="mb-5 h-12 w-12 justify-center"><ArrowLeft color={colors.foreground} /></Pressable>
      {isLoading ? <ActivityIndicator color={colors.primary} /> : error ? <Text className="text-destructive">Impossible de charger le projet.</Text> : !vault ? <Text>Projet introuvable ou accès retiré.</Text> : <>
        <Text accessibilityRole="header" className="text-[28px] font-semibold">{vault.name}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="my-6"><View className="flex-row gap-3">{vault.environments.map(env => <Pressable key={env.id} accessibilityRole="tab" accessibilityState={{ selected: env.id === selectedEnvironment }} onPress={() => { setEnvironment(env.id); setValues({}); }} className={`min-h-12 justify-center rounded-full px-5 ${env.id === selectedEnvironment ? "bg-elevated" : "bg-card"}`}><Text>{env.name}</Text></Pressable>)}</View></ScrollView>
        {!vault.environments.length ? <Text className="text-muted-foreground">Aucun environnement.</Text> : !entries.length ? <Text className="text-muted-foreground">Aucune variable dans cet environnement.</Text> : entries.map(secret => <View key={secret.id} className="min-h-[80px] flex-row items-center border-b border-border py-3"><View className="flex-1"><Text className="text-sm font-medium">{secret.key}</Text><Text selectable className="mt-2 text-sm text-muted-foreground">{values[secret.id] ?? "••••••••"}</Text></View><Pressable disabled={!!busy} accessibilityLabel={`Afficher ${secret.key}`} onPress={() => { if (values[secret.id] !== undefined) setValues(current => { const next = { ...current }; delete next[secret.id]; return next; }); else void reveal(secret); }} className="h-12 w-12 items-center justify-center">{busy === secret.id ? <ActivityIndicator color={colors.primary} /> : <Eye size={20} color={colors.primary} />}</Pressable><Pressable disabled={!!busy} accessibilityLabel={`Copier ${secret.key}`} onPress={() => reveal(secret, true)} className="h-12 w-12 items-center justify-center"><Copy size={20} color={colors.primary} /></Pressable></View>)}
      </>}
    </ScrollView>
  </SafeAreaView>;
}
