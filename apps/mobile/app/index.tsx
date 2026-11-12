import { Spinner } from "@/components/ui/spinner";
import { Redirect } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@/lib/auth";
import { useAppTheme } from "@/lib/theme";

export default function Index() {
  const { colors } = useAppTheme();
  const { ready, session } = useAuth();

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-background" style={{ backgroundColor: colors.background }}>
        <Spinner color={colors.primary} />
      </View>
    );
  }

  return <Redirect href={session ? "/(app)/(tabs)/passwords" : "/(auth)/login"} />;
}
