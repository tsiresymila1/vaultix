import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import {
  ChevronLeft,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Pencil,
  Trash2,
  UserRound,
  Users,
} from "lucide-react-native";
import { deletePassword, revealPassword, usePasswords, type PasswordEntry } from "@/lib/passwords";
import { useAuth } from "@/lib/auth";
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

  const entry = entries.find((item) => item.id === id) as PasswordEntry | undefined;
  const [password, setPassword] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [visible, setVisible] = useState(false);

  const ensureDecrypted = async (): Promise<string | null> => {
    if (password) return password;
    if (!entry || !session) return null;

    setRevealing(true);
    try {
      const decrypted = await revealPassword(entry, session.pwPublicKey, session.pwPrivateKey);
      setPassword(decrypted);
      return decrypted;
    } catch {
      Alert.alert("Error", "Failed to decrypt this password.");
      return null;
    } finally {
      setRevealing(false);
    }
  };

  const toggleReveal = async () => {
    if (!visible) {
      const decrypted = await ensureDecrypted();
      if (!decrypted) return;
    }
    setVisible((current) => !current);
  };

  const copy = async (value: string | null | undefined, label: string) => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    Alert.alert("Copied", `${label} copied to clipboard.`);
  };

  const copyPassword = async () => {
    const decrypted = await ensureDecrypted();
    if (decrypted) await copy(decrypted, "Password");
  };

  const openWebsite = async () => {
    if (!entry?.website_url) return;
    const url = /^https?:\/\//i.test(entry.website_url)
      ? entry.website_url
      : `https://${entry.website_url}`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Can't open website", "Check that the website address is valid.");
    }
  };

  const onDelete = () => {
    if (!entry || !session) return;
    Alert.alert("Delete password?", `\"${entry.title}\" will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePassword(session, entry.id);
            router.back();
          } catch {
            Alert.alert("Error", "Failed to delete this password.");
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
      <View className="h-14 flex-row items-center justify-between px-4">
        <IconButton label="Go back" onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.foreground} />
        </IconButton>

        <Text className="text-base font-semibold text-foreground">Password</Text>

        <View className="w-[92px] flex-row justify-end gap-2">
          {entry && !entry.shared ? (
            <>
              <IconButton label="Edit password" onPress={() => router.push(`/(app)/password/edit/${entry.id}`)}>
                <Pencil size={18} color={colors.foreground} />
              </IconButton>
              <IconButton label="Delete password" onPress={onDelete} destructive>
                <Trash2 size={18} color={colors.destructive} />
              </IconButton>
            </>
          ) : null}
        </View>
      </View>

      {loading && !entry ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !entry ? (
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <View className="h-12 w-12 items-center justify-center rounded-md bg-secondary">
            <KeyRound size={22} color={colors.mutedForeground} />
          </View>
          <Text className="text-base font-semibold text-foreground">Password not found</Text>
          <Text className="text-center text-sm text-muted-foreground">
            This item may have been removed or is no longer shared with you.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        >
          <FadeIn>
            <View className="items-center pb-7 pt-5">
              <View className="h-16 w-16 items-center justify-center rounded-md border border-primary/20 bg-primary/10">
                <Text className="text-2xl font-bold text-primary">
                  {entry.title.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <Text className="mt-4 text-center text-2xl font-bold text-foreground">{entry.title}</Text>
              <View className="mt-1 flex-row items-center gap-1.5">
                {entry.shared ? <Users size={13} color={colors.accent} /> : null}
                <Text className="max-w-[280px] text-sm text-muted-foreground" numberOfLines={1}>
                  {entry.shared ? "Shared with you" : entry.website_url || "Personal password"}
                </Text>
              </View>
            </View>
          </FadeIn>

          <FadeIn delay={40}>
            <View className="mb-8 flex-row overflow-hidden rounded-md border border-border bg-card">
              <QuickAction
                icon={<UserRound size={20} color={entry.username ? colors.primary : colors.mutedForeground} />}
                label="Username"
                onPress={() => copy(entry.username, "Username")}
                disabled={!entry.username}
              />
              <View className="w-px bg-border" />
              <QuickAction
                icon={<Copy size={20} color={colors.primary} />}
                label="Password"
                onPress={copyPassword}
                busy={revealing}
              />
              <View className="w-px bg-border" />
              <QuickAction
                icon={<ExternalLink size={20} color={entry.website_url ? colors.accent : colors.mutedForeground} />}
                label="Open site"
                onPress={openWebsite}
                disabled={!entry.website_url}
              />
            </View>
          </FadeIn>

          <FadeIn delay={80}>
            <Text className="mb-3 text-sm font-semibold text-foreground">Login details</Text>
            <View className="overflow-hidden rounded-md border border-border bg-card px-4">
              <DetailRow
                icon={<UserRound size={18} color={colors.mutedForeground} />}
                label="Username"
                value={entry.username || "Not added"}
                muted={!entry.username}
                action={entry.username ? <Copy size={17} color={colors.primary} /> : undefined}
                onAction={entry.username ? () => copy(entry.username, "Username") : undefined}
              />
              <DetailRow
                icon={<KeyRound size={18} color={colors.mutedForeground} />}
                label="Password"
                value={revealing ? "Decrypting..." : visible && password ? password : "••••••••••••"}
                action={visible ? <EyeOff size={18} color={colors.primary} /> : <Eye size={18} color={colors.primary} />}
                onAction={toggleReveal}
              />
              <DetailRow
                icon={<Globe2 size={18} color={colors.mutedForeground} />}
                label="Website"
                value={entry.website_url || "Not added"}
                muted={!entry.website_url}
                action={entry.website_url ? <ExternalLink size={17} color={colors.accent} /> : undefined}
                onAction={entry.website_url ? openWebsite : undefined}
                last={!entry.notes}
              />
              {entry.notes ? (
                <DetailRow
                  icon={<Copy size={18} color={colors.mutedForeground} />}
                  label="Notes"
                  value={entry.notes}
                  action={<Copy size={17} color={colors.primary} />}
                  onAction={() => copy(entry.notes, "Notes")}
                  multiline
                  last
                />
              ) : null}
            </View>
          </FadeIn>

          <View className="mt-5 flex-row items-center justify-center gap-2">
            <KeyRound size={13} color={colors.mutedForeground} />
            <Text className="text-xs text-muted-foreground">End-to-end encrypted</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function IconButton({
  children,
  label,
  onPress,
  destructive = false,
}: {
  children: ReactNode;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      className={`h-10 w-10 items-center justify-center rounded-md border ${
        destructive ? "border-destructive/20 bg-destructive/10" : "border-border bg-card"
      }`}
      style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
      hitSlop={4}
    >
      {children}
    </Pressable>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  disabled = false,
  busy = false,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      className="h-[82px] flex-1 items-center justify-center gap-2"
      style={({ pressed }) => ({ opacity: disabled ? 0.45 : pressed ? 0.65 : 1 })}
    >
      {busy ? <ActivityIndicator size="small" color={colors.primary} /> : icon}
      <Text className="text-xs font-medium text-foreground">{label}</Text>
    </Pressable>
  );
}

function DetailRow({
  icon,
  label,
  value,
  action,
  onAction,
  muted = false,
  multiline = false,
  last = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  action?: ReactNode;
  onAction?: () => void;
  muted?: boolean;
  multiline?: boolean;
  last?: boolean;
}) {
  return (
    <View className={`min-h-[72px] flex-row items-center gap-3 py-3 ${last ? "" : "border-b border-border"}`}>
      <View className="h-9 w-9 items-center justify-center rounded-md bg-secondary">{icon}</View>
      <View className="min-w-0 flex-1">
        <Text className="text-xs text-muted-foreground">{label}</Text>
        <Text
          className={`mt-1 text-[15px] ${muted ? "text-muted-foreground" : "text-foreground"}`}
          numberOfLines={multiline ? undefined : 1}
        >
          {value}
        </Text>
      </View>
      {action && onAction ? (
        <Pressable
          accessibilityLabel={`${label} action`}
          accessibilityRole="button"
          onPress={onAction}
          className="h-10 w-10 items-center justify-center"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          hitSlop={4}
        >
          {action}
        </Pressable>
      ) : null}
    </View>
  );
}
