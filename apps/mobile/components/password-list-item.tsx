import { View } from "react-native";
import { Button } from "./ui/button";
import { ListRow } from "./ui/list-row";
import { KeyRound, Star } from "lucide-react-native";
import type { PasswordEntry } from "@/lib/passwords";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/lib/theme";

export function PasswordListItem({ entry, onPress, favorite, onFavorite, favoriteDisabled }: { entry: PasswordEntry; onPress: () => void; favorite: boolean; onFavorite: () => void; favoriteDisabled: boolean }) {
  const { colors } = useAppTheme();
  const service = (entry.title + " " + (entry.website_url ?? "")).toLowerCase();
  const detail = entry.username || entry.website_url || "Aucun nom d’utilisateur";
  const title = entry.shared ? entry.title + " · Partagé" : entry.title;
  const logo = service.includes("github")
    ? <Text style={{ color: colors.foreground, fontSize: 16, fontFamily: "Outfit_700Bold" }}>GH</Text>
    : service.includes("google") || service.includes("gmail")
      ? <Text style={{ color: "#4285F4", fontSize: 17, fontFamily: "Outfit_700Bold" }}>G</Text>
      : service.includes("notion")
        ? <Text style={{ color: colors.foreground, fontSize: 16, fontFamily: "Outfit_700Bold" }}>N</Text>
        : <KeyRound size={20} color={colors.mutedForeground} />;

  return <ListRow title={title} detail={detail} icon={<View className="h-10 w-10 items-center justify-center rounded-[13px] border" style={{ backgroundColor: colors.secondary, borderColor: colors.border }}>{logo}</View>} onPress={onPress}
    trailing={<Button variant="ghost" size="icon" accessibilityLabel={(favorite ? "Retirer " : "Ajouter ") + entry.title + " des favoris"} accessibilityState={{ selected: favorite }} disabled={favoriteDisabled} onPress={onFavorite}>
      <Star size={21} strokeWidth={1.7} color={favorite ? colors.primary : colors.mutedForeground} fill={favorite ? colors.elevated : "transparent"} />
    </Button>} />;
}
