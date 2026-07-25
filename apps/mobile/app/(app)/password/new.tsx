import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
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
import { colors } from "@/lib/theme";

export default function NewPassword() {
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
      Alert.alert("Missing information", "Title and password are required.");
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
      Alert.alert("Error", "Failed to save password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <FormScreenHeader title="New password" subtitle="Add a login to your vault" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40, gap: 22 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FadeIn>
          <FormSection title="Login details">
            <FormField label="Title">
              <Input placeholder="GitHub, Netflix, Banking…" value={title} onChangeText={setTitle} autoFocus />
            </FormField>
            <FormField label="Website">
              <Input
                placeholder="example.com"
                autoCapitalize="none"
                keyboardType="url"
                value={url}
                onChangeText={setUrl}
              />
            </FormField>
            <FormField label="Username or email">
              <Input
                placeholder="you@example.com"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />
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
              placeholder="Enter or generate a password"
            />
          </FormSection>
        </FadeIn>

        <FadeIn delay={100}>
          <FormSection title="Notes">
            <Input
              placeholder="Recovery details, account context…"
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
              className="h-24 py-3"
            />
          </FormSection>
        </FadeIn>

        <View>
          <Button loading={saving} onPress={onSave} disabled={!title.trim() || !password}>
            <Save size={18} color={colors.primaryForeground} />
            <Text>Save password</Text>
          </Button>
          <Text className="mt-3 text-center text-xs text-muted-foreground">
            Encrypted locally before it leaves this device
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
