import { Pressable, View } from "react-native";
import { KeyRound, Star, Users } from "lucide-react-native";
import type { PasswordEntry } from "@/lib/passwords";
import { Text } from "@/components/ui/text";
import { colors } from "@/lib/theme";

export function PasswordListItem({ entry, onPress, favorite, onFavorite, favoriteDisabled }: { entry: PasswordEntry; onPress: () => void; favorite: boolean; onFavorite: () => void; favoriteDisabled: boolean }) {
  const detail = entry.username || entry.website_url || "No username";

  return (
    <View className="min-h-[76px] flex-row items-center border-b border-border">
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-[76px] flex-1 flex-row items-center gap-3"
      style={({ pressed }) => ({ opacity: pressed ? 0.68 : 1 })}
    >
      <View className="h-8 w-8 items-center justify-center">
        <KeyRound size={24} color={colors.mutedForeground} strokeWidth={1.7} />
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="flex-shrink text-base font-medium text-foreground" numberOfLines={1}>
            {entry.title}
          </Text>
          {entry.shared ? <Users size={13} color={colors.accent} /> : null}
        </View>
        <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
          {detail}
        </Text>
      </View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`${favorite ? "Retirer" : "Ajouter"} ${entry.title} des favoris`} accessibilityState={{ selected: favorite, disabled: favoriteDisabled }} disabled={favoriteDisabled} onPress={onFavorite} className="h-12 w-12 items-center justify-center">
      <Star size={21} strokeWidth={1.7} color={favorite ? colors.primary : colors.mutedForeground} fill={favorite ? colors.elevated : "transparent"} />
    </Pressable>
    </View>
  );
}
