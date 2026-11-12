import { ScreenScroll } from "@/components/ui/screen-scroll";
import { Spinner } from "@/components/ui/spinner";
import { useMaterialDialog } from "@/components/material-dialog";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Save } from "lucide-react-native";
import { FadeIn } from "@/components/motion";
import { FormField, FormScreenHeader, FormSection, SecretInput } from "@/components/password-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth";
import { generatePassword } from "@/lib/crypto";
import { updatePassword, usePasswords } from "@/lib/passwords";
import { useAppTheme } from "@/lib/theme";

export default function EditPassword() {
  const { colors } = useAppTheme();
  const dialog = useMaterialDialog();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { entries, loading } = usePasswords();
  const router = useRouter();
  const entry = entries.find((item) => item.id === id);

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [notes, setNotes] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (entry && !ready) {
      setTitle(entry.title);
      setUrl(entry.website_url ?? "");
      setUsername(entry.username ?? "");
      setNotes(entry.notes ?? "");
      setReady(true);
    }
  }, [entry, ready]);

  const onGenerate = async () => {
    setPassword(await generatePassword());
    setShow(true);
  };

  const onSave = async () => {
    if (!entry || !session) return;
    if (!title.trim()) {
      dialog.alert("Informations manquantes", "Le titre est obligatoire.");
      return;
    }
    setSaving(true);
    try {
      await updatePassword(session, entry, {
        title: title.trim(),
        websiteUrl: url.trim(),
        username: username.trim(),
        notes: notes.trim(),
        newPassword: password || undefined,
      });
      router.back();
    } catch {
      dialog.alert("Erreur", "Impossible de modifier le mot de passe.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" style={{ backgroundColor: colors.background }} edges={["top"]}>
      <FormScreenHeader title="Modifier l’identifiant" subtitle={entry?.title || "Mettre à jour les informations"} onBack={() => router.back()} />

      {loading && !entry ? (
        <View className="flex-1 items-center justify-center">
          <Spinner color={colors.primary} />
        </View>
      ) : !entry ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Identifiant introuvable</Text>
        </View>
      ) : (
        <ScreenScroll
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40, gap: 22 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FadeIn>
            <FormSection title="Détails de connexion">
              <FormField label="Titre">
                <Input value={title} onChangeText={setTitle} />
              </FormField>
              <FormField label="Site web">
                <Input autoCapitalize="none" keyboardType="url" value={url} onChangeText={setUrl} />
              </FormField>
              <FormField label="Nom d’utilisateur ou e-mail">
                <Input autoCapitalize="none" value={username} onChangeText={setUsername} />
              </FormField>
            </FormSection>
          </FadeIn>

          <FadeIn delay={60}>
            <FormSection title="Sécurité">
              <SecretInput
                value={password}
                onChangeText={setPassword}
                visible={show}
                onToggleVisible={() => setShow((value) => !value)}
                onGenerate={onGenerate}
                placeholder="Laisser vide pour conserver le mot de passe actuel"
              />
            </FormSection>
          </FadeIn>

          <FadeIn delay={100}>
            <FormSection title="Notes">
              <Input
                value={notes}
                onChangeText={setNotes}
                multiline
                  className="min-h-32"
              />
            </FormSection>
          </FadeIn>

          <View>
            <Button loading={saving} onPress={onSave} disabled={!title.trim()}>
              <Save size={18} color={colors.primaryForeground} />
              <Text>Enregistrer les modifications</Text>
            </Button>
            {password ? (
              <Text className="mt-3 text-center text-xs text-warning">Le mot de passe du compte sera remplacé</Text>
            ) : null}
          </View>
        </ScreenScroll>
      )}
    </SafeAreaView>
  );
}
