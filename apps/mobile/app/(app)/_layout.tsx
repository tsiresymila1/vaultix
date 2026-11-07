import { useEffect } from "react";
import { usePasswords } from "@/lib/passwords";
import { syncAutofill, cancelAutofillSync } from "@/lib/autofill";
import { Stack, Redirect, usePathname, useRouter } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@/lib/auth";

export default function AppLayout() {
  const { ready, session, requestUnlock } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const protectedRoute = pathname.includes("/password/");
  useEffect(() => {
    if (session && protectedRoute && !session.pwPrivateKey) {
      requestUnlock().then(ok => { if (!ok) router.replace("/(app)/(tabs)/passwords"); });
    }
  }, [protectedRoute, session?.pwPrivateKey]);
  const { entries, loading, error } = usePasswords();
  useEffect(() => {
    if (session?.pwPrivateKey && !loading && !error) {
      syncAutofill(entries, session.pwPublicKey, session.pwPrivateKey)
        .catch(() => console.warn("Could not sync system autofill"));
    }
    return cancelAutofillSync;
  }, [entries, loading, error, session]);
  if (ready && !session) return <Redirect href="/(auth)/login" />;
  return <View className="flex-1" pointerEvents={protectedRoute && !session?.pwPrivateKey ? "none" : "auto"}><Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} /></View>;
}
