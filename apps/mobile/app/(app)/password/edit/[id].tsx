import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, View } from "react-native";
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
import { colors } from "@/lib/theme";

export default function EditPassword() {
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
      Alert.alert("Missing information", "Title is required.");
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
      Alert.alert("Error", "Failed to update password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <FormScreenHeader title="Edit password" subtitle={entry?.title || "Update login details"} onBack={() => router.back()} />

      {loading && !entry ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !entry ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Password not found</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40, gap: 22 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FadeIn>
            <FormSection title="Login details">
              <FormField label="Title">
                <Input value={title} onChangeText={setTitle} />
              </FormField>
              <FormField label="Website">
                <Input autoCapitalize="none" keyboardType="url" value={url} onChangeText={setUrl} />
              </FormField>
              <FormField label="Username or email">
                <Input autoCapitalize="none" value={username} onChangeText={setUsername} />
              </FormField>
            </FormSection>
          </FadeIn>

          <FadeIn delay={60}>
            <FormSection title="Security">
              <SecretInput
                value={password}
                onChangeText={setPassword}
                visible={show}
                onToggleVisible={() => setShow((value) => !value)}
                onGenerate={onGenerate}
                placeholder="Leave blank to keep current"
              />
            </FormSection>
          </FadeIn>

          <FadeIn delay={100}>
            <FormSection title="Notes">
              <Input
                value={notes}
                onChangeText={setNotes}
                multiline
                textAlignVertical="top"
                className="h-24 py-3"
              />
            </FormSection>
          </FadeIn>

          <View>
            <Button loading={saving} onPress={onSave} disabled={!title.trim()}>
              <Save size={18} color={colors.primaryForeground} />
              <Text>Save changes</Text>
            </Button>
            {password ? (
              <Text className="mt-3 text-center text-xs text-warning">The account password will be replaced</Text>
            ) : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
