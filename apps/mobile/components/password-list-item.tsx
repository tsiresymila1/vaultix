import { Pressable, View } from "react-native";
import { ChevronRight, Users } from "lucide-react-native";
import type { PasswordEntry } from "@/lib/passwords";
import { Text } from "@/components/ui/text";
import { colors } from "@/lib/theme";

const avatarColors = [colors.primary, colors.accent, colors.warning, "#D89CFF"];

function colorFor(value: string) {
  const score = [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return avatarColors[score % avatarColors.length];
}

export function PasswordListItem({ entry, onPress }: { entry: PasswordEntry; onPress: () => void }) {
  const color = colorFor(entry.title);
  const detail = entry.username || entry.website_url || "No username";

  return (
    <Pressable
      onPress={onPress}
      className="h-[72px] flex-row items-center gap-3 border-b border-border"
      style={({ pressed }) => ({ opacity: pressed ? 0.68 : 1 })}
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-md border"
        style={{ backgroundColor: `${color}14`, borderColor: `${color}30` }}
      >
        <Text className="text-lg font-bold" style={{ color }}>
          {entry.title.slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="flex-shrink text-base font-semibold text-foreground" numberOfLines={1}>
            {entry.title}
          </Text>
          {entry.shared ? <Users size={13} color={colors.accent} /> : null}
        </View>
        <Text className="mt-0.5 text-sm text-muted-foreground" numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}
