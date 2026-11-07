import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Box } from "lucide-react-native";
import { StaggerItem } from "@/components/motion";
import { ScreenHeader, SectionHeader } from "@/components/screen-header";
import { Text } from "@/components/ui/text";
import { colors } from "@/lib/theme";
import { useVaults, type MobileVault } from "@/lib/vaults";

export default function VaultixHome() {
  const { vaults, loading, error } = useVaults();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <ScreenHeader title="Coffres" />
        <View className="mt-8 px-6">
          <SectionHeader title="Projets" />
          {loading && vaults.length === 0 ? (
            <View className="h-36 items-center justify-center">
              <ActivityIndicator color={colors.primary} />
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
            <View className="overflow-hidden rounded-2xl bg-card px-4">
              {vaults.map((vault, index) => (
                <StaggerItem key={vault.id} index={index}>
                  <VaultRow vault={vault} last={index === vaults.length - 1} />
                </StaggerItem>
              ))}
            </View>
          )}
        </View>


      </ScrollView>
    </SafeAreaView>
  );
}

function VaultRow({ vault, last }: { vault: MobileVault; last: boolean }) {
  const visibleEnvironments = vault.environments.slice(0, 2);
  const remainingEnvironments = vault.environments.length - visibleEnvironments.length;

  return (
    <View className={`min-h-[76px] flex-row items-center gap-3 py-3 ${last ? "" : "border-b border-border"}`}>
      <View className="h-11 w-11 items-center justify-center">
        <Box size={24} color={colors.primary} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-semibold text-foreground" numberOfLines={1}>{vault.name}</Text>
        <View className="mt-1.5 flex-row items-center gap-1.5">
          {visibleEnvironments.length > 0 ? (
            visibleEnvironments.map((environment) => (
              <View key={environment} className="max-w-[82px] rounded-sm bg-secondary px-1.5 py-0.5">
                <Text className="text-[10px] font-semibold uppercase text-muted-foreground" numberOfLines={1}>
                  {environment}
                </Text>
              </View>
            ))
          ) : (
            <Text className="text-xs text-muted-foreground">Aucun environnement</Text>
          )}
          {remainingEnvironments > 0 ? (
            <Text className="text-[10px] font-semibold text-muted-foreground">+{remainingEnvironments}</Text>
          ) : null}
        </View>
      </View>
      <View className="items-end">
        <Text className="text-sm font-semibold text-foreground">{vault.environments.length}</Text>
        <Text className="text-[10px] text-muted-foreground">env</Text>
      </View>
    </View>
  );
}
