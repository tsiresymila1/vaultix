import { useEffect, useMemo, useState } from "react";
import { View, FlatList, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { KeyRound, Search, Globe, Plus } from "lucide-react-native";
import { useCallback } from "react";
import { usePasswords, type PasswordEntry } from "@/lib/passwords";
import { useAuth } from "@/lib/auth";
import { syncAutofill } from "@/lib/autofill";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { StaggerItem, FadeIn } from "@/components/motion";
import { colors } from "@/lib/theme";

export default function Passwords() {
  const { entries, loading, error, refresh } = usePasswords();
  const { session } = useAuth();
  const [query, setQuery] = useState("");
  const router = useRouter();

  // Publish decrypted credentials to the OS autofill store whenever they change.
  useEffect(() => {
    if (session && entries.length > 0) {
      syncAutofill(entries, session.pwPublicKey, session.pwPrivateKey).catch(() => {});
    }
  }, [entries, session]);

  // Refresh when returning from the create screen so the new entry appears.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.username ?? "").toLowerCase().includes(q) ||
        (e.website_url ?? "").toLowerCase().includes(q),
    );
  }, [entries, query]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-5 pt-2 pb-4 gap-4">
        <View className="flex-row items-center justify-between">
          <Logo size={26} />
          <Pressable
            onPress={() => router.push("/(app)/password/new")}
            className="flex-row items-center gap-1 rounded-md bg-primary px-3 h-9"
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <Plus size={16} color={colors.primaryForeground} />
            <Text className="text-sm font-semibold text-primary-foreground">Add</Text>
          </Pressable>
        </View>
        <View className="flex-row items-center gap-2 rounded-md border border-border bg-input px-3">
          <Search size={16} color={colors.mutedForeground} />
          <Input
            placeholder="Search passwords…"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            className="flex-1 h-11 text-base text-foreground font-sans"
          />
        </View>
      </View>

      {loading && entries.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-destructive text-center">{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 10 }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <FadeIn className="items-center py-20">
              <KeyRound size={36} color={colors.mutedForeground} />
              <Text className="text-muted-foreground mt-3">No passwords yet</Text>
            </FadeIn>
          }
          renderItem={({ item, index }) => (
            <StaggerItem index={index}>
              <PasswordRow entry={item} onPress={() => router.push(`/(app)/password/${item.id}`)} />
            </StaggerItem>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function PasswordRow({ entry, onPress }: { entry: PasswordEntry; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Card className="flex-row items-center gap-3 p-4">
        <View className="w-10 h-10 rounded-md items-center justify-center bg-primary/10">
          <Globe size={20} color={colors.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
            {entry.title}
          </Text>
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {entry.username || entry.website_url || "No username"}
          </Text>
        </View>
        {entry.shared ? (
          <View className="px-2 py-0.5 rounded bg-secondary">
            <Text className="text-[10px] font-bold uppercase text-muted-foreground">Shared</Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}
