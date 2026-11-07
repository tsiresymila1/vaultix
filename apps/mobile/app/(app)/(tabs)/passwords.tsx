import { useMemo, useState } from "react";
import { ActivityIndicator, SectionList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { KeyRound, Plus, Search } from "lucide-react-native";
import { StaggerItem } from "@/components/motion";
import { PasswordListItem } from "@/components/password-list-item";
import { ScreenHeader } from "@/components/screen-header";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useFavorites } from "@/lib/favorites";
import { usePasswords } from "@/lib/passwords";
import { colors } from "@/lib/theme";

type Filter = "all" | "favorites" | "shared";

export default function Passwords() {
  const { entries, loading, error } = usePasswords();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const router = useRouter();
  const favorites = useFavorites();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (filter === "shared" && !entry.shared) return false;
      if (filter === "favorites" && !favorites.ids.includes(entry.id)) return false;
      if (!q) return true;
      return (
        entry.title.toLowerCase().includes(q) ||
        (entry.username ?? "").toLowerCase().includes(q) ||
        (entry.website_url ?? "").toLowerCase().includes(q)
      );
    });
  }, [entries, filter, query, favorites.ids]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScreenHeader
        title="Identifiants"
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ajouter un identifiant"
            onPress={() => router.push("/(app)/password/new")}
            className="h-12 w-12 items-center justify-center rounded-2xl bg-elevated"
            style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
          >
            <Plus size={21} color={colors.primary} />
          </Pressable>
        }
      />

      <View className="px-6 pb-3">
        <View className="h-[52px] flex-row items-center gap-3 rounded-2xl bg-input px-4">
          <Search size={18} color={colors.mutedForeground} />
          <Input
            placeholder="Rechercher"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            className="h-12 flex-1 border-0 bg-transparent px-0 text-base"
          />
        </View>
        <View className="mt-2 flex-row gap-6 border-b border-border">
          {(["all", "favorites", "shared"] as const).map((value) => (
            <Pressable
              key={{ all: "Tous", favorites: "Favoris", shared: "Partagés" }[value]}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === value }}
              onPress={() => setFilter(value)}
              className={`min-h-[48px] items-center justify-center border-b-2 ${
                filter === value ? "border-primary" : "border-transparent"
              }`}
            >
              <Text className={`text-xs font-semibold capitalize ${filter === value ? "text-foreground" : "text-muted-foreground"}`}>
                {{ all: "Tous", favorites: "Favoris", shared: "Partagés" }[value]}
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
        <SectionList
          sections={(query || filter !== "all" ? [{ title: "Identifiants", data: filtered }] : [
            { title: "Favoris", data: filtered.filter(entry => favorites.ids.includes(entry.id)) },
            { title: "Récents", data: filtered.filter(entry => !favorites.ids.includes(entry.id)) },
          ]).filter(section => section.data.length > 0)}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => <Text className="pb-2 pt-5 text-xs text-muted-foreground">{section.title}</Text>}
          ListHeaderComponent={favorites.error ? <Text accessibilityRole="alert" className="py-3 text-sm text-destructive">{favorites.error}</Text> : null}
          keyExtractor={(entry) => entry.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View className="items-center py-20">
              <View className="h-14 w-14 items-center justify-center rounded-md border border-border bg-card">
                <KeyRound size={24} color={colors.mutedForeground} />
              </View>
              <Text className="mt-4 font-semibold text-foreground">Aucun identifiant trouvé</Text>
              <Text className="mt-1 text-sm text-muted-foreground">
                {query || filter !== "all" ? "Essayez un autre nom ou un autre site" : "Ajoutez votre premier identifiant"}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <StaggerItem index={index}>
              <PasswordListItem favorite={favorites.ids.includes(item.id)} onFavorite={() => favorites.toggle(item.id)} favoriteDisabled={!favorites.ready} entry={item} onPress={() => router.push(`/(app)/password/${item.id}`)} />
            </StaggerItem>
          )}
        />
      )}
    </SafeAreaView>
  );
}
