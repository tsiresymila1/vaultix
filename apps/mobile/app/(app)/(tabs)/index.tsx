import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowRight, Box, KeyRound, Layers3, ShieldCheck } from "lucide-react-native";
import { Logo } from "@/components/Logo";
import { FadeIn, StaggerItem } from "@/components/motion";
import { SectionHeader } from "@/components/screen-header";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";
import { useVaults, type MobileVault } from "@/lib/vaults";

export default function VaultixHome() {
  const { vaults, loading, error } = useVaults();
  const { session } = useAuth();
  const router = useRouter();
  const environmentCount = vaults.reduce((count, vault) => count + vault.environments.length, 0);
  const initial = session?.email?.slice(0, 1).toUpperCase() || "V";

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 104 }}
      >
        <View className="flex-row items-center justify-between px-5 pb-7 pt-2">
          <Logo size={22} />
          <View className="h-10 w-10 items-center justify-center rounded-md border border-border bg-elevated">
            <Text className="font-bold text-primary">{initial}</Text>
          </View>
        </View>

        <FadeIn className="px-5">
          <Text className="text-sm font-medium text-muted-foreground">Vaultix Secrets</Text>
          <Text className="mt-1 text-[30px] font-bold leading-9 text-foreground">
            Your secure workspace.
          </Text>
          <Text className="mt-2 max-w-[320px] text-sm leading-5 text-muted-foreground">
            Project vaults and environments, protected for every member of your team.
          </Text>
        </FadeIn>

        <FadeIn delay={60} className="mx-5 mt-6 flex-row items-center gap-3 rounded-md border border-primary/20 bg-primary/10 p-4">
          <View className="h-10 w-10 items-center justify-center rounded-md bg-primary/15">
            <ShieldCheck size={21} color={colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-foreground">Encrypted project access</Text>
            <Text className="mt-0.5 text-xs text-muted-foreground">Membership controls access to every vault</Text>
          </View>
          <View className="h-2 w-2 rounded-full bg-primary" />
        </FadeIn>

        <View className="mt-5 flex-row gap-3 px-5">
          <StatTile icon={<Box size={18} color={colors.accent} />} value={vaults.length} label="Vaults" />
          <StatTile icon={<Layers3 size={18} color={colors.warning} />} value={environmentCount} label="Environments" />
        </View>

        <View className="mt-8 px-5">
          <SectionHeader title="Project vaults" />
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
              <Text className="mt-3 text-sm font-semibold text-foreground">No project vaults</Text>
              <Text className="mt-1 text-xs text-muted-foreground">Your team vaults will appear here</Text>
            </View>
          ) : (
            <View className="overflow-hidden rounded-md border border-border bg-card px-4">
              {vaults.map((vault, index) => (
                <StaggerItem key={vault.id} index={index}>
                  <VaultRow vault={vault} last={index === vaults.length - 1} />
                </StaggerItem>
              ))}
            </View>
          )}
        </View>

        <View className="mt-8 px-5">
          <SectionHeader title="Password manager" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Passwords"
            onPress={() => router.push("/(app)/(tabs)/passwords")}
            className="h-[82px] flex-row items-center gap-3 rounded-md border border-border bg-card px-4"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View className="h-11 w-11 items-center justify-center rounded-md border border-accent/20 bg-accent/10">
              <KeyRound size={20} color={colors.accent} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-base font-semibold text-foreground">Passwords</Text>
              <Text className="mt-0.5 text-xs text-muted-foreground">Logins, sharing and device autofill</Text>
            </View>
            <ArrowRight size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <View className="h-[92px] flex-1 justify-between rounded-md border border-border bg-card p-4">
      <View>{icon}</View>
      <View className="flex-row items-end gap-2">
        <Text className="text-2xl font-bold text-foreground">{value}</Text>
        <Text className="pb-1 text-xs text-muted-foreground">{label}</Text>
      </View>
    </View>
  );
}

function VaultRow({ vault, last }: { vault: MobileVault; last: boolean }) {
  const visibleEnvironments = vault.environments.slice(0, 2);
  const remainingEnvironments = vault.environments.length - visibleEnvironments.length;

  return (
    <View className={`min-h-[76px] flex-row items-center gap-3 py-3 ${last ? "" : "border-b border-border"}`}>
      <View className="h-11 w-11 items-center justify-center rounded-md border border-primary/20 bg-primary/10">
        <Text className="text-base font-bold text-primary">{vault.name.slice(0, 1).toUpperCase()}</Text>
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
            <Text className="text-xs text-muted-foreground">No environments</Text>
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
