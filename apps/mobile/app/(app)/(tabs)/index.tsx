import { ScreenScroll } from "@/components/ui/screen-scroll";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useMaterialDialog } from "@/components/material-dialog";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Box } from "lucide-react-native";
import { StaggerItem } from "@/components/motion";
import { ScreenHeader, SectionHeader } from "@/components/screen-header";
import { ListRow } from "@/components/ui/list-row";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/lib/theme";
import { useVaults, type MobileVault } from "@/lib/vaults";

export default function VaultixHome() {
  const dialog = useMaterialDialog();
  const { colors } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => { setRefreshing(true); try { await refresh(); } catch { dialog.alert("Actualisation impossible", "Vérifiez votre connexion et réessayez."); } finally { setRefreshing(false); } };
  const { vaults, loading, error, refresh } = useVaults();

  return (
    <SafeAreaView className="flex-1 bg-background" style={{ backgroundColor: colors.background }} edges={["top"]}>
      <ScreenScroll
          refreshing={refreshing} onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <ScreenHeader eyebrow="ORGANISATION" title="Coffres" subtitle="Vos espaces de confiance" />
        <View className="mt-8 px-6">
          <SectionHeader title="Projets" />
          {loading && vaults.length === 0 ? (
            <View className="h-36 items-center justify-center">
              <Spinner color={colors.primary} />
            </View>
          ) : error ? (
            <View className="items-start rounded-md border border-destructive/30 bg-destructive/10 p-4">
              <Text className="text-sm text-destructive">{error}</Text>
            </View>
          ) : vaults.length === 0 ? (
            <View className="items-center rounded-md border border-dashed border-border py-9">
              <Box size={24} color={colors.mutedForeground} />
              <Text className="mt-3 text-sm font-semibold text-foreground">Aucun coffre</Text>
              <Text className="mt-1 text-xs text-muted-foreground">Vos coffres de projet apparaîtront ici</Text>
            </View>
          ) : (
            <View className="overflow-hidden rounded-2xl px-4" style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}>
              {vaults.map((vault, index) => (
                <StaggerItem key={vault.id} index={index}>
                  <VaultRow vault={vault} last={index === vaults.length - 1} />
                </StaggerItem>
              ))}
            </View>
          )}
        </View>


      </ScreenScroll>
    </SafeAreaView>
  );
}

function VaultRow({ vault, last }: { vault: MobileVault; last: boolean }) {
  const { colors } = useAppTheme();
  const router = useRouter();
  const visibleEnvironments = vault.environments.slice(0, 2);
  const remainingEnvironments = vault.environments.length - visibleEnvironments.length;

  return <ListRow title={vault.name}
    detail={visibleEnvironments.length ? `${visibleEnvironments.join(" · ")}${remainingEnvironments ? ` · +${remainingEnvironments}` : ""}` : "Aucun environnement"}
    icon={<Box size={24} color={colors.primary} />}
    onPress={() => router.push({ pathname: "/(app)/project/[id]", params: { id: vault.id } })}
    trailing={<Text className="px-3 text-xs text-muted-foreground">{vault.environments.length} env</Text>} />;
}
