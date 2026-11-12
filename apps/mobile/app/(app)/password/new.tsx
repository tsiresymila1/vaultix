import { ScreenScroll } from "@/components/ui/screen-scroll";
import { useMaterialDialog } from "@/components/material-dialog";
import { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Save } from "lucide-react-native";
import { FadeIn } from "@/components/motion";
import { FormField, FormScreenHeader, FormSection, SecretInput } from "@/components/password-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth";
import { generatePassword } from "@/lib/crypto";
import { createPassword } from "@/lib/passwords";
import { useAppTheme } from "@/lib/theme";

export default function NewPassword() {
  const { colors } = useAppTheme();
  const dialog = useMaterialDialog();
  const { session } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const onGenerate = async () => {
    setPassword(await generatePassword());
    setShow(true);
  };

  const onSave = async () => {
    if (!title.trim() || !password) {
      dialog.alert("Informations manquantes", "Le titre et le mot de passe sont obligatoires.");
      return;
    }
    if (!session) return;
    setSaving(true);
    try {
      await createPassword(session, {
        title: title.trim(),
        websiteUrl: url.trim(),
        username: username.trim(),
        password,
        notes: notes.trim(),
      });
      router.back();
    } catch {
      dialog.alert("Erreur", "Impossible d’enregistrer le mot de passe.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" style={{ backgroundColor: colors.background }} edges={["top"]}>
      <FormScreenHeader title="Nouvel identifiant" subtitle="Ajoutez un accès à votre coffre" onBack={() => router.back()} />

      <ScreenScroll
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40, gap: 22 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FadeIn>
          <FormSection title="Détails de connexion">
            <FormField label="Titre">
              <Input placeholder="GitHub, Netflix, banque…" value={title} onChangeText={setTitle} autoFocus />
            </FormField>
            <FormField label="Site web">
              <Input
                placeholder="exemple.fr"
                autoCapitalize="none"
                keyboardType="url"
                value={url}
                onChangeText={setUrl}
              />
            </FormField>
            <FormField label="Nom d’utilisateur ou e-mail">
              <Input
                placeholder="nom@exemple.fr"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />
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
              placeholder="Saisissez ou générez un mot de passe"
            />
          </FormSection>
        </FadeIn>

        <FadeIn delay={100}>
          <FormSection title="Notes">
            <Input
              placeholder="Informations de récupération, contexte du compte…"
              value={notes}
              onChangeText={setNotes}
              multiline
              className="min-h-32"
            />
          </FormSection>
        </FadeIn>

        <View>
          <Button loading={saving} onPress={onSave} disabled={!title.trim() || !password}>
            <Save size={18} color={colors.primaryForeground} />
            <Text>Enregistrer dans le coffre</Text>
          </Button>
          <Text className="mt-3 text-center text-xs text-muted-foreground">
            Chiffré sur cet appareil avant synchronisation
          </Text>
        </View>
      </ScreenScroll>
    </SafeAreaView>
  );
}
