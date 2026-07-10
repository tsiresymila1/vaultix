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
  title: "Vaultix — Secret & Password Manager",
  description: "Encrypted secret and password manager for teams — CLI injection, browser autofill, role-based sharing.",
};

import ProgressBarProvider from "@/components/shared/progress-bar-provider";
import { MotionProvider } from "@/components/motion";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${outfit.className} antialiased`}
      >
        <AuthProvider>
          <MotionProvider>
            <ProgressBarProvider>
              <ThemeSynchronizer />
              {children}
              <Toaster position="top-right" />
            </ProgressBarProvider>
          </MotionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

