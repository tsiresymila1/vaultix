import { useState } from "react";
import { View, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Eye, EyeOff, Sparkles } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { createPassword } from "@/lib/passwords";
import { generatePassword } from "@/lib/crypto";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { FadeIn } from "@/components/motion";
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
      Alert.alert("Missing", "Title and password are required");
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
      Alert.alert("Error", "Failed to save");
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
        <Text className="text-lg font-semibold text-foreground ml-1">New password</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <FadeIn className="gap-4">
          <View className="gap-2">
            <Label>Title</Label>
            <Input placeholder="e.g. GitHub" value={title} onChangeText={setTitle} autoFocus />
          </View>
          <View className="gap-2">
            <Label>Website</Label>
            <Input
              placeholder="github.com"
              autoCapitalize="none"
              keyboardType="url"
              value={url}
              onChangeText={setUrl}
            />
          </View>
          <View className="gap-2">
            <Label>Username</Label>
            <Input
              placeholder="you@example.com"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />
          </View>

          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Label>Password</Label>
              <Pressable onPress={onGenerate} className="flex-row items-center gap-1 py-1" hitSlop={6}>
                <Sparkles size={14} color={colors.primary} />
                <Text className="text-xs font-semibold text-primary">Generate</Text>
              </Pressable>
            </View>
            <View className="flex-row items-center rounded-md border border-border bg-input pr-2">
              <Input
                placeholder="••••••••"
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
            <Input placeholder="Optional" value={notes} onChangeText={setNotes} multiline />
          </View>

          <View className="mt-2">
            <Button loading={saving} onPress={onSave}>
              <Text>Save</Text>
            </Button>
          </View>
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}
