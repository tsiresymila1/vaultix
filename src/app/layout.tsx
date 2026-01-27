import { ThemeSynchronizer } from "@/components/shared/theme-synchronizer";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/auth-context";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});



import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vaultix — Zero-Knowledge Secret Manager",
  description: "Secure, client-side encrypted secret manager.",
};

import { createClient } from "@/utils/supabase/server";
import ProgressBarProvider from "@/components/shared/progress-bar-provider";
import { VaultUnlock } from "@/components/shared/vault-unlock";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userData = null;
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();
    userData = data;
  }

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${outfit.className} antialiased`}
      >
        <AuthProvider initialUser={user} initialUserData={userData}>
          <ProgressBarProvider>
            <ThemeSynchronizer />
            <VaultUnlock />
            {children}
            <Toaster position="top-right" />
          </ProgressBarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

