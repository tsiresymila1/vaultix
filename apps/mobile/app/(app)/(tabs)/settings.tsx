import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LogOut, Mail, ShieldCheck } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { FadeIn } from "@/components/motion";
import { colors } from "@/lib/theme";

export default function Settings() {
  const { session, signOut } = useAuth();
  const router = useRouter();

  const onSignOut = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-5 pt-2 pb-4">
        <Text className="text-2xl font-bold text-foreground">Settings</Text>
      </View>
      <View className="px-5 gap-4">
        <FadeIn>
          <Card className="p-4 gap-4">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-md items-center justify-center bg-primary/10">
                <Mail size={18} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-muted-foreground">Signed in as</Text>
                <Text className="text-base font-semibold text-foreground">{session?.email}</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-md items-center justify-center bg-primary/10">
                <ShieldCheck size={18} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-muted-foreground">Encryption</Text>
                <Text className="text-sm text-foreground">Content decrypted on-device with your identity key</Text>
              </View>
            </View>
          </Card>
        </FadeIn>

        <FadeIn delay={80}>
          <Button variant="destructive" onPress={onSignOut}>
            <LogOut size={18} color="#fff" />
            <Text>Sign out</Text>
          </Button>
        </FadeIn>
      </View>
    </SafeAreaView>
  );
}
