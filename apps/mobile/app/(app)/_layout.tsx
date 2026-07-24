import { Stack, Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";

export default function AppLayout() {
  const { ready, session } = useAuth();
  if (ready && !session) return <Redirect href="/(auth)/login" />;
  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />;
}
