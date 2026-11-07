import { useEffect } from "react";
import { usePasswords } from "@/lib/passwords";
import { syncAutofill, cancelAutofillSync } from "@/lib/autofill";
import { Stack, Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";

export default function AppLayout() {
  const { ready, session } = useAuth();
  const { entries, loading, error } = usePasswords();
  useEffect(() => {
    if (session && !loading && !error) {
      syncAutofill(entries, session.pwPublicKey, session.pwPrivateKey)
        .catch(() => console.warn("Could not sync system autofill"));
    }
    return cancelAutofillSync;
  }, [entries, loading, error, session]);
  if (ready && !session) return <Redirect href="/(auth)/login" />;
  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />;
}
