import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function Index() {
  const { ready, session } = useAuth();

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <Redirect href={session ? "/(app)/(tabs)" : "/(auth)/login"} />;
}
