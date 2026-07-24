import { useCallback, useEffect, useState } from "react";
import { View, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { ChevronLeft, Copy, Eye, EyeOff, Globe, Pencil, Trash2 } from "lucide-react-native";
import { usePasswords, revealPassword, deletePassword, type PasswordEntry } from "@/lib/passwords";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { FadeIn } from "@/components/motion";
import { colors } from "@/lib/theme";

export default function PasswordDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entries, loading, refresh } = usePasswords();
  const { session } = useAuth();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const entry = entries.find((e) => e.id === id) as PasswordEntry | undefined;
  const [password, setPassword] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [visible, setVisible] = useState(false);

  const ensureDecrypted = async (): Promise<string | null> => {
    if (password) return password;
    if (!entry || !session) return null;
    setRevealing(true);
    try {
      const pw = await revealPassword(entry, session.pwPublicKey, session.pwPrivateKey);
      setPassword(pw);
      return pw;
    } catch {
      Alert.alert("Error", "Failed to decrypt");
      return null;
    } finally {
      setRevealing(false);
    }
  };

  const toggleReveal = async () => {
    if (!visible) await ensureDecrypted();
    setVisible((v) => !v);
  };

  const copy = async (value: string | null | undefined, label: string) => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    Alert.alert("Copied", `${label} copied to clipboard`);
  };

  const copyPassword = async () => {
    const pw = await ensureDecrypted();
    if (pw) copy(pw, "Password");
  };

  const onDelete = () => {
    if (!entry || !session) return;
    Alert.alert("Delete password?", `"${entry.title}" will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePassword(session, entry.id);
            router.back();
          } catch {
            Alert.alert("Error", "Failed to delete");
          }
        },
      },
    ]);
  };

  useEffect(() => {
    setPassword(null);
    setVisible(false);
  }, [id, entry?.encrypted_password]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center justify-between px-3 py-2">
        <Pressable onPress={() => router.back()} className="p-2" hitSlop={8}>
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>
        {entry && !entry.shared ? (
          <View className="flex-row items-center gap-1">
            <Pressable onPress={() => router.push(`/(app)/password/edit/${entry.id}`)} className="p-2" hitSlop={8}>
              <Pencil size={20} color={colors.foreground} />
            </Pressable>
            <Pressable onPress={onDelete} className="p-2" hitSlop={8}>
              <Trash2 size={20} color={colors.destructive} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {loading && !entry ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !entry ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Not found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          <FadeIn>
            <View className="items-center gap-3 mb-8">
              <View className="w-16 h-16 rounded-2xl items-center justify-center bg-primary/10">
                <Globe size={28} color={colors.primary} />
              </View>
              <Text className="text-2xl font-bold text-foreground text-center">{entry.title}</Text>
              {entry.website_url ? (
                <Text className="text-sm text-muted-foreground">{entry.website_url}</Text>
              ) : null}
            </View>
          </FadeIn>

          <View className="gap-3">
            <Field label="Username" value={entry.username || "—"} onCopy={() => copy(entry.username, "Username")} />

            {entry.website_url ? (
              <Field label="Website" value={entry.website_url} onCopy={() => copy(entry.website_url, "Website")} />
            ) : null}

            <FadeIn delay={60}>
              <Card className="p-4">
                <Text className="text-xs text-muted-foreground mb-1">Password</Text>
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="flex-1 text-base font-medium text-foreground" numberOfLines={1}>
                    {revealing ? "…" : visible && password ? password : "••••••••••••"}
                  </Text>
                  <View className="flex-row gap-1">
                    <Pressable onPress={toggleReveal} className="p-2" hitSlop={8}>
                      {visible ? (
                        <EyeOff size={18} color={colors.mutedForeground} />
                      ) : (
                        <Eye size={18} color={colors.mutedForeground} />
                      )}
                    </Pressable>
                    <Pressable onPress={copyPassword} className="p-2" hitSlop={8}>
                      <Copy size={18} color={colors.primary} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            </FadeIn>

            {entry.notes ? (
              <Field label="Notes" value={entry.notes} multiline onCopy={() => copy(entry.notes, "Notes")} />
            ) : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onCopy,
  multiline,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  multiline?: boolean;
}) {
  return (
    <Card className="p-4">
      <Text className="text-xs text-muted-foreground mb-1">{label}</Text>
      <View className="flex-row items-center justify-between gap-3">
        <Text
          className="flex-1 text-base text-foreground"
          numberOfLines={multiline ? undefined : 1}
        >
          {value}
        </Text>
        {onCopy ? (
          <Pressable onPress={onCopy} className="p-2" hitSlop={8}>
            <Copy size={18} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}
