import { Button } from "./ui/button";
import { ListRow } from "./ui/list-row";
import { KeyRound, Star } from "lucide-react-native";
import type { PasswordEntry } from "@/lib/passwords";
import { colors } from "@/lib/theme";

export function PasswordListItem({ entry, onPress, favorite, onFavorite, favoriteDisabled }: { entry: PasswordEntry; onPress: () => void; favorite: boolean; onFavorite: () => void; favoriteDisabled: boolean }) {
  const detail = entry.username || entry.website_url || "No username";

  return <ListRow title={entry.shared ? `${entry.title} · Partagé` : entry.title} detail={detail} icon={<KeyRound size={24} color={colors.mutedForeground} strokeWidth={1.7} />} onPress={onPress}
    trailing={<Button variant="ghost" size="icon" accessibilityLabel={`${favorite ? "Retirer" : "Ajouter"} ${entry.title} des favoris`} accessibilityState={{ selected: favorite }} disabled={favoriteDisabled} onPress={onFavorite}>
      <Star size={21} strokeWidth={1.7} color={favorite ? colors.primary : colors.mutedForeground} fill={favorite ? colors.elevated : "transparent"} />
    </Button>} />;
}
