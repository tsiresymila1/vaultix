import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { KeyRound, Plus, Search } from "lucide-react-native";
import { StaggerItem } from "@/components/motion";
import { PasswordListItem } from "@/components/password-list-item";
import { ScreenHeader } from "@/components/screen-header";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { syncAutofill } from "@/lib/autofill";
import { useAuth } from "@/lib/auth";
import { usePasswords } from "@/lib/passwords";
import { colors } from "@/lib/theme";

type Filter = "all" | "personal" | "shared";

export default function Passwords() {
  const { entries, loading, error, refresh } = usePasswords();
  const { session } = useAuth();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const router = useRouter();

  useEffect(() => {
    if (session && entries.length > 0) {
      syncAutofill(entries, session.pwPublicKey, session.pwPrivateKey).catch(() => {});
    }
  }, [entries, session]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (filter === "shared" && !entry.shared) return false;
      if (filter === "personal" && entry.shared) return false;
      if (!q) return true;
      return (
        entry.title.toLowerCase().includes(q) ||
        (entry.username ?? "").toLowerCase().includes(q) ||
        (entry.website_url ?? "").toLowerCase().includes(q)
      );
    });
  }, [entries, filter, query]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScreenHeader
        eyebrow="Vaultix Password"
        title="Passwords"
        subtitle={`${entries.length} secure ${entries.length === 1 ? "login" : "logins"}`}
        action={
          <Pressable
            accessibilityLabel="Add password"
            onPress={() => router.push("/(app)/password/new")}
            className="h-11 w-11 items-center justify-center rounded-md bg-primary"
            style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
          >
            <Plus size={21} color={colors.primaryForeground} />
          </Pressable>
        }
      />

      <View className="px-5 pb-3">
        <View className="h-[50px] flex-row items-center gap-2 rounded-md border border-border bg-input px-3">
          <Search size={18} color={colors.mutedForeground} />
          <Input
            placeholder="Search title, email or website"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            className="h-12 flex-1 border-0 bg-transparent px-1 text-base"
          />
        </View>
        <View className="mt-3 flex-row rounded-md bg-secondary p-1">
          {(["all", "personal", "shared"] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setFilter(value)}
              className={`h-9 flex-1 items-center justify-center rounded-sm ${
                filter === value ? "bg-elevated" : "bg-transparent"
              }`}
            >
              <Text className={`text-xs font-semibold capitalize ${filter === value ? "text-foreground" : "text-muted-foreground"}`}>
                {value}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading && entries.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-destructive">{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(entry) => entry.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 104 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View className="items-center py-20">
              <View className="h-14 w-14 items-center justify-center rounded-md border border-border bg-card">
                <KeyRound size={24} color={colors.mutedForeground} />
              </View>
              <Text className="mt-4 font-semibold text-foreground">No passwords found</Text>
              <Text className="mt-1 text-sm text-muted-foreground">
                {query || filter !== "all" ? "Try another search or filter" : "Add your first secure login"}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <StaggerItem index={index}>
              <PasswordListItem entry={item} onPress={() => router.push(`/(app)/password/${item.id}`)} />
            </StaggerItem>
          )}
        />
      )}
    </SafeAreaView>
  );
}
