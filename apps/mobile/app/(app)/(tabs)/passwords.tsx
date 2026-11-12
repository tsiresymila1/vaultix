import { useMemo, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { KeyRound, Plus, Search, ShieldCheck } from "lucide-react-native";
import { useMaterialDialog } from "@/components/material-dialog";
import { ScreenScroll } from "@/components/ui/screen-scroll";
import { PasswordListItem } from "@/components/password-list-item";
import { ScreenHeader, SectionHeader } from "@/components/screen-header";
import { Segments } from "@/components/ui/segments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Spinner } from "@/components/ui/spinner";
import { useFavorites } from "@/lib/favorites";
import { usePasswords } from "@/lib/passwords";
import { useAppTheme } from "@/lib/theme";

type Filter = "all" | "favorites" | "shared";

export default function Passwords() {
  const dialog = useMaterialDialog();
  const { colors } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);
  const { entries, loading, error, refresh } = usePasswords();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const router = useRouter();
  const favorites = useFavorites();
  const onRefresh = async () => {
    setRefreshing(true);
    try { await refresh(); }
    catch { dialog.alert("Actualisation impossible", "Vérifiez votre connexion et réessayez."); }
    finally { setRefreshing(false); }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(entry => {
      if (filter === "shared" && !entry.shared) return false;
      if (filter === "favorites" && !favorites.ids.includes(entry.id)) return false;
      return !q || entry.title.toLowerCase().includes(q) ||
        (entry.username ?? "").toLowerCase().includes(q) ||
        (entry.website_url ?? "").toLowerCase().includes(q);
    });
  }, [entries, filter, query, favorites.ids]);

  const sections = query || filter !== "all"
    ? [{ title: "Identifiants", data: filtered }]
    : [
      { title: "Favoris", data: filtered.filter(entry => favorites.ids.includes(entry.id)) },
      { title: "Récents", data: filtered.filter(entry => !favorites.ids.includes(entry.id)) },
    ].filter(section => section.data.length > 0);

  return (
    <SafeAreaView className="flex-1 bg-background" style={{ backgroundColor: colors.background }} edges={["top"]}>
      <ScreenHeader
        title="Identifiants"
        subtitle={entries.length + " accès protégés"}
        action={
          <Button
            accessibilityLabel="Ajouter un identifiant"
            onPress={() => router.push("/(app)/password/new")}
            className="h-12 w-12 items-center justify-center rounded-[14px]"
            style={{ backgroundColor: colors.elevated }}
          >
            <Plus size={21} color={colors.primary} />
          </Button>
        }
      />

      <View className="mx-5 mb-3 flex-row items-center gap-3 rounded-2xl border px-4 py-3" style={{ backgroundColor: colors.elevated, borderColor: colors.border }}>
        <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: colors.card }}>
          <ShieldCheck size={21} color={colors.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold">Coffre synchronisé</Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">Chiffré de bout en bout sur cet appareil</Text>
        </View>
      </View>

      <View className="px-5 pb-3">
        <View className="mb-3 flex-row items-center gap-2">
          <Search size={19} color={colors.mutedForeground} />
          <Input
            accessibilityLabel="Rechercher un identifiant"
            placeholder="Rechercher un identifiant"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            className="flex-1"
          />
        </View>
        <Segments
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Tout  " + entries.length },
            { value: "favorites", label: "Favoris  " + favorites.ids.length },
            { value: "shared", label: "Partagés" },
          ]}
        />
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
        <ScreenScroll
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
        >
          <View className="mb-2 mt-2 flex-row items-center justify-between">
            <Text className="text-sm font-semibold">Récemment utilisés</Text>
            <Text className="text-xs text-muted-foreground">Tirer vers le bas pour actualiser</Text>
          </View>
          {favorites.error ? <Text accessibilityRole="alert" className="py-3 text-sm text-destructive">{favorites.error}</Text> : null}
          {filtered.length === 0 ? (
            <View className="items-center rounded-2xl border border-dashed py-12" style={{ borderColor: colors.border }}>
              <KeyRound size={25} color={colors.mutedForeground} />
              <Text className="mt-4 font-semibold">Aucun identifiant trouvé</Text>
              <Text className="mt-1 text-center text-sm text-muted-foreground">
                {query || filter !== "all" ? "Essayez un autre nom ou un autre site" : "Ajoutez votre premier identifiant"}
              </Text>
            </View>
          ) : sections.map(section => (
            <View key={section.title} className="mb-4">
              {sections.length > 1 || query || filter !== "all" ? <SectionHeader title={section.title} /> : null}
              <View className="overflow-hidden rounded-2xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                {section.data.map(entry => (
                  <PasswordListItem
                    key={entry.id}
                    entry={entry}
                    favorite={favorites.ids.includes(entry.id)}
                    onFavorite={() => favorites.toggle(entry.id)}
                    favoriteDisabled={!favorites.ready}
                    onPress={() => router.push({ pathname: "/(app)/password/[id]", params: { id: entry.id } })}
                  />
                ))}
              </View>
            </View>
          ))}
        </ScreenScroll>
      )}
    </SafeAreaView>
  );
}
