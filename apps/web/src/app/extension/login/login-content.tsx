"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "@/lib/db";
import { api } from "@/lib/http/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2, CheckCircle, LogIn } from "lucide-react";
import { toast } from "sonner";

function LoginContent() {
  const searchParams = useSearchParams();
  const { user, isLoading } = db.useAuth();
  const [status, setStatus] = useState<"idle" | "authorizing" | "success">("idle");

  const callback = searchParams.get("callback");

  const goSignIn = () => {
    const returnTo = encodeURIComponent(
      typeof window !== "undefined" ? window.location.href : "/extension/login",
    );
    window.location.href = `/login?returnTo=${returnTo}`;
  };

  const authorize = async () => {
    try {
      setStatus("authorizing");
      const authUser = await db.getAuth();
      if (!authUser?.refresh_token) {
        goSignIn();
        return;
      }
      const res = await api.auth.token.mint.$post({
        json: { instantToken: authUser.refresh_token },
      });
      const data = await res.json();
      if (!res.ok || !("token" in data)) {
        const msg =
          "error" in data && typeof data.error === "string" ? data.error : "Authorization failed";
        throw new Error(msg);
      }

      // Hand the token + email to the extension. It fetches its encrypted key
      // material from /api/extension/me and prompts for the master password in
      // the popup — the master password never leaves the extension.
      if (callback) {
        const url = new URL(callback);
        url.hash = `token=${encodeURIComponent(data.token)}&email=${encodeURIComponent(data.email)}`;
        window.location.href = url.toString();
        return;
      }
      setStatus("success");
    } catch (error) {
      setStatus("idle");
      toast.error(error instanceof Error ? error.message : "Authorization failed");
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">Extension Authorized!</CardTitle>
            <p className="text-muted-foreground text-sm mt-2">
              You can now close this tab and use the Vaultix extension.
            </p>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => window.close()}>
              Close Tab
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Vaultix Extension</CardTitle>
          <p className="text-muted-foreground text-sm mt-2">
            {isLoading
              ? "Checking your session..."
              : user
                ? `Signed in as ${user.email}`
                : "Sign in to authorize your browser extension"}
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : user ? (
            <Button className="w-full" onClick={authorize} disabled={status !== "idle"}>
              {status === "idle" ? (
                <span className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" /> Authorize
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Authorizing...
                </span>
              )}
            </Button>
          ) : (
            <Button className="w-full" onClick={goSignIn}>
              <span className="flex items-center gap-2">
                <LogIn className="h-4 w-4" /> Sign in
              </span>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ExtensionLoginContent() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
