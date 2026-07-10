"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "@/lib/db";
import { api } from "@/lib/http/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, Loader2, LogIn } from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();
  const { user, isLoading } = db.useAuth();
  const [status, setStatus] = useState<"idle" | "authorizing">("idle");

  const callback = searchParams.get("callback");

  const goSignIn = () => {
    const returnTo = encodeURIComponent(
      typeof window !== "undefined" ? window.location.href : "/cli/login",
    );
    window.location.href = `/login?returnTo=${returnTo}`;
  };

  const authorize = async () => {
    if (!callback) {
      toast.error("Invalid request: missing callback.");
      return;
    }
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

      const redirectUrl = new URL(callback);
      redirectUrl.searchParams.set("token", data.token);
      redirectUrl.searchParams.set("email", data.email);
      // The CLI decrypts the private key locally by prompting for the master
      // password — it is never sent here.
      window.location.href = redirectUrl.toString();
    } catch (error) {
      setStatus("idle");
      toast.error(error instanceof Error ? error.message : "Authorization failed");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <div className="max-w-md w-full glass p-8 rounded-2xl border border-white/10 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20">
            <Shield className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-purple-500 bg-clip-text text-transparent mb-2">
            Authorize CLI
          </h1>
          <p className="text-gray-400">
            {isLoading
              ? "Checking your session..."
              : user
                ? `Signed in as ${user.email}`
                : "Sign in to authorize the Vaultix CLI"}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-green-500" />
          </div>
        ) : user ? (
          <Button
            onClick={authorize}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-medium h-11 transition-all"
            disabled={status !== "idle"}
          >
            {status === "idle" ? (
              <span className="flex items-center gap-2">
                <LogIn className="w-4 h-4" /> Authorize
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Redirecting...
              </span>
            )}
          </Button>
        ) : (
          <Button
            onClick={goSignIn}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-medium h-11 transition-all"
          >
            <span className="flex items-center gap-2">
              <LogIn className="w-4 h-4" /> Sign in
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}

export default function CliLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
