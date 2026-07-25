import { useCallback, useEffect } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { ArrowRight, KeyRound, Plus, ShieldCheck, Users } from "lucide-react-native";
import { Logo } from "@/components/Logo";
import { FadeIn, StaggerItem } from "@/components/motion";
import { PasswordListItem } from "@/components/password-list-item";
import { SectionHeader } from "@/components/screen-header";
import { Text } from "@/components/ui/text";
import { syncAutofill } from "@/lib/autofill";
import { useAuth } from "@/lib/auth";
import { usePasswords } from "@/lib/passwords";
import { colors } from "@/lib/theme";

export default function Home() {
  const { entries, loading, error, refresh } = usePasswords();
  const { session } = useAuth();
  const router = useRouter();
  const sharedCount = entries.filter((entry) => entry.shared).length;
  const recentEntries = entries.slice(0, 3);
  const initial = session?.email?.slice(0, 1).toUpperCase() || "V";

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (session && entries.length > 0) {
      syncAutofill(entries, session.pwPublicKey, session.pwPrivateKey).catch(() => {});
    }
  }, [entries, session]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 104 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between px-5 pt-2 pb-7">
          <Logo size={22} />
          <View className="h-10 w-10 items-center justify-center rounded-md border border-border bg-elevated">
            <Text className="font-bold text-primary">{initial}</Text>
          </View>
        </View>

        <FadeIn className="px-5">
          <Text className="text-sm font-medium text-muted-foreground">Vaultix Password</Text>
          <Text className="mt-1 text-[30px] font-bold leading-9 text-foreground">
            Your vault is ready.
          </Text>
          <Text className="mt-2 max-w-[310px] text-sm leading-5 text-muted-foreground">
            Secure access to every account, on this device and across autofill.
          </Text>
        </FadeIn>

        <FadeIn delay={60} className="mx-5 mt-6 flex-row items-center gap-3 rounded-md border border-primary/20 bg-primary/10 p-4">
          <View className="h-10 w-10 items-center justify-center rounded-md bg-primary/15">
            <ShieldCheck size={21} color={colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-foreground">Protected on-device</Text>
            <Text className="mt-0.5 text-xs text-muted-foreground">Encryption keys never leave your session</Text>
          </View>
          <View className="h-2 w-2 rounded-full bg-primary" />
        </FadeIn>

        <View className="mt-5 flex-row gap-3 px-5">
          <StatTile icon={<KeyRound size={18} color={colors.accent} />} value={entries.length} label="Saved" />
          <StatTile icon={<Users size={18} color={colors.warning} />} value={sharedCount} label="Shared" />
        </View>

        <View className="mt-7 px-5">
          <SectionHeader title="Quick actions" />
          <View className="flex-row gap-3">
            <QuickAction
              icon={<Plus size={20} color={colors.primaryForeground} />}
              title="Add password"
              subtitle="Create a secure login"
              primary
              onPress={() => router.push("/(app)/password/new")}
            />
            <QuickAction
              icon={<KeyRound size={20} color={colors.accent} />}
              title="Open vault"
              subtitle="Browse all logins"
              onPress={() => router.push("/(app)/(tabs)/passwords")}
            />
          </View>
        </View>

        <View className="mt-8 px-5">
          <SectionHeader
            title="Recent passwords"
            action={
              entries.length > 0 ? (
                <Pressable
                  onPress={() => router.push("/(app)/(tabs)/passwords")}
                  className="flex-row items-center gap-1 py-1"
                  hitSlop={8}
                >
                  <Text className="text-xs font-semibold text-primary">View all</Text>
                  <ArrowRight size={14} color={colors.primary} />
                </Pressable>
              ) : null
            }
          />
          {loading && entries.length === 0 ? (
            <View className="h-32 items-center justify-center">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : error ? (
            <View className="rounded-md border border-destructive/30 bg-destructive/10 p-4">
              <Text className="text-sm text-destructive">{error}</Text>
            </View>
          ) : recentEntries.length === 0 ? (
            <View className="items-center rounded-md border border-dashed border-border py-8">
              <KeyRound size={24} color={colors.mutedForeground} />
              <Text className="mt-3 text-sm font-semibold text-foreground">Your vault is empty</Text>
              <Text className="mt-1 text-xs text-muted-foreground">Add your first password to get started</Text>
            </View>
          ) : (
            recentEntries.map((entry, index) => (
              <StaggerItem key={entry.id} index={index}>
                <PasswordListItem
                  entry={entry}
                  onPress={() => router.push(`/(app)/password/${entry.id}`)}
                />
              </StaggerItem>
            ))
          )}
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

function QuickAction({
  icon,
  title,
  subtitle,
  primary,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`h-[118px] flex-1 justify-between rounded-md border p-4 ${
        primary ? "border-primary bg-primary" : "border-border bg-card"
      }`}
      style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
    >
      <View className={`h-9 w-9 items-center justify-center rounded-md ${primary ? "bg-black/10" : "bg-accent/10"}`}>
        {icon}
      </View>
      <View>
        <Text className={`text-sm font-semibold ${primary ? "text-primary-foreground" : "text-foreground"}`}>
          {title}
        </Text>
        <Text className={`mt-0.5 text-xs ${primary ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}
