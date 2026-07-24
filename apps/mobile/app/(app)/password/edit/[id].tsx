import { useEffect, useState } from "react";
import { View, ScrollView, Pressable, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Eye, EyeOff, Sparkles } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { usePasswords, updatePassword } from "@/lib/passwords";
import { generatePassword } from "@/lib/crypto";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { FadeIn } from "@/components/motion";
import { colors } from "@/lib/theme";

export default function EditPassword() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { entries, loading } = usePasswords();
  const router = useRouter();
  const entry = entries.find((e) => e.id === id);

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

  const onSave = async () => {
    if (!entry || !session) return;
    if (!title.trim()) {
      Alert.alert("Missing", "Title is required");
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
      Alert.alert("Error", "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center px-3 py-2">
        <Pressable onPress={() => router.back()} className="p-2" hitSlop={8}>
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>
        <Text className="text-lg font-semibold text-foreground ml-1">Edit password</Text>
      </View>

      {loading && !entry ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <FadeIn className="gap-4">
            <View className="gap-2">
              <Label>Title</Label>
              <Input value={title} onChangeText={setTitle} />
            </View>
            <View className="gap-2">
              <Label>Website</Label>
              <Input autoCapitalize="none" keyboardType="url" value={url} onChangeText={setUrl} />
            </View>
            <View className="gap-2">
              <Label>Username</Label>
              <Input autoCapitalize="none" value={username} onChangeText={setUsername} />
            </View>

            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Label>New password</Label>
                <Pressable
                  onPress={async () => {
                    setPassword(await generatePassword());
                    setShow(true);
                  }}
                  className="flex-row items-center gap-1 py-1"
                  hitSlop={6}
                >
                  <Sparkles size={14} color={colors.primary} />
                  <Text className="text-xs font-semibold text-primary">Generate</Text>
                </Pressable>
              </View>
              <View className="flex-row items-center rounded-md border border-border bg-input pr-2">
                <Input
                  placeholder="Leave blank to keep current"
                  secureTextEntry={!show}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                  className="flex-1 h-12 border-0 bg-transparent px-4"
                />
                <Pressable onPress={() => setShow((v) => !v)} className="p-2" hitSlop={8}>
                  {show ? (
                    <EyeOff size={18} color={colors.mutedForeground} />
                  ) : (
                    <Eye size={18} color={colors.mutedForeground} />
                  )}
                </Pressable>
              </View>
            </View>

            <View className="gap-2">
              <Label>Notes</Label>
              <Input value={notes} onChangeText={setNotes} multiline />
            </View>

            <View className="mt-2">
              <Button loading={saving} onPress={onSave}>
                <Text>Save changes</Text>
              </Button>
            </View>
          </FadeIn>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
