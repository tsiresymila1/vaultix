import { Spinner } from "@/components/ui/spinner";
import { useMaterialDialog } from "@/components/material-dialog";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { KeyRound, Plus, Search } from "lucide-react-native";
import { ScreenScroll } from "@/components/ui/screen-scroll";
import { PasswordListItem } from "@/components/password-list-item";
import { ScreenHeader } from "@/components/screen-header";
import { Segments } from "@/components/ui/segments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useFavorites } from "@/lib/favorites";
import { usePasswords } from "@/lib/passwords";
import { colors } from "@/lib/theme";

type Filter = "all" | "favorites" | "shared";

export default function Passwords() {
  const dialog = useMaterialDialog();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => { setRefreshing(true); try { await refresh(); } catch { dialog.alert("Actualisation impossible", "Vérifiez votre connexion et réessayez."); } finally { setRefreshing(false); } };
  const { entries, loading, error, refresh } = usePasswords();
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
          <Button variant="ghost"
            accessibilityRole="button"
            size="icon" accessibilityLabel="Ajouter un identifiant"
            onPress={() => router.push("/(app)/password/new")}
            className="h-12 w-12 items-center justify-center rounded-2xl bg-elevated"
          >
            <Plus size={21} color={colors.primary} />
          </Button>
        }
      />

      <View className="px-6 pb-3">
        <View className="flex-row items-center gap-3">
          <Search size={18} color={colors.mutedForeground} />
          <Input
            placeholder="Rechercher"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            className="flex-1"
          />
        </View>
        <View className="mt-3"><Segments value={filter} onChange={setFilter} options={[{ value: "all", label: "Tous" }, { value: "favorites", label: "Favoris" }, { value: "shared", label: "Partagés" }]} /></View>
      </View>

      {loading && entries.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Spinner color={colors.primary} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-destructive">{error}</Text>
        </View>
      ) : (
        <ScreenScroll refreshing={refreshing} onRefresh={onRefresh} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>
          {favorites.error ? <Text accessibilityRole="alert" className="py-3 text-sm text-destructive">{favorites.error}</Text> : null}
          {filtered.length === 0 ? <View className="items-center py-20">
            <KeyRound size={24} color={colors.mutedForeground} />
            <Text className="mt-4 font-semibold">Aucun identifiant trouvé</Text>
            <Text className="mt-1 text-sm text-muted-foreground">{query || filter !== "all" ? "Essayez un autre nom ou un autre site" : "Ajoutez votre premier identifiant"}</Text>
          </View> : (query || filter !== "all" ? [{ title: "Identifiants", data: filtered }] : [
            { title: "Favoris", data: filtered.filter(entry => favorites.ids.includes(entry.id)) },
            { title: "Récents", data: filtered.filter(entry => !favorites.ids.includes(entry.id)) },
          ]).filter(section => section.data.length).flatMap(section => [
            <Text key={section.title} className="pb-2 pt-5 text-xs text-muted-foreground">{section.title}</Text>,
            ...section.data.map(entry => <PasswordListItem key={entry.id} favorite={favorites.ids.includes(entry.id)} onFavorite={() => favorites.toggle(entry.id)} favoriteDisabled={!favorites.ready} entry={entry} onPress={() => router.push(`/(app)/password/${entry.id}`)} />),
          ])}
        </ScreenScroll>
      )}
    </SafeAreaView>
  );
}
