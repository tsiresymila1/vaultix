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

import ProgressBarProvider from "@/components/shared/progress-bar-provider";

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
          <ProgressBarProvider>
            <ThemeSynchronizer />
            {children}
            <Toaster position="top-right" />
          </ProgressBarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

