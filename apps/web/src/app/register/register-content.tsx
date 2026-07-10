"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateUserKeyPair } from "@/lib/crypto";
import { db } from "@/lib/db";
import { api, bearer } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { Key, Loader2, Shield } from "lucide-react";
import { motion, AnimatePresence } from "@/components/motion";
import { fade } from "@/lib/motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Step = "email" | "code";

export default function RegisterPageContent() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { setKeys } = useAuth();
  const router = useRouter();

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await db.auth.sendMagicCode({ email });
      setStep("code");
      toast.success("We emailed you a verification code");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await db.auth.signInWithMagicCode({ email, code });
      const authUser = await db.getAuth();

      // Already set up? Just load keys and go in.
      const meRes = await api.account.me.$get(
        {},
        { headers: bearer(authUser?.refresh_token) },
      );
      const me = meRes.ok ? await meRes.json() : { profile: null };
      if (me.profile) {
        setKeys(me.profile.privateKey, me.profile.publicKey);
        router.push("/vaults");
        return;
      }

      // Create the identity: generate a keypair; the server wraps the private
      // key at rest and hands it back on future logins. No master password.
      const keyPair = await generateUserKeyPair();
      const res = await api.account.setup.$post(
        { json: { publicKey: keyPair.publicKey, privateKey: keyPair.privateKey } },
        { headers: bearer(authUser?.refresh_token) },
      );
      if (!res.ok) throw new Error("Could not create your identity — try again.");

      setKeys(keyPair.privateKey, keyPair.publicKey);
      toast.success("Welcome to Vaultix");
      router.push("/vaults");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="hidden lg:block relative h-full">
        <div className="absolute inset-0  border-r " />
        <div className="relative h-full flex flex-col justify-between p-10 text-white z-20">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-medium hover:opacity-80 transition-opacity"
          >
            <Shield className="w-6 h-6 text-primary" /> Vaultix
          </Link>
          <div className="w-full flex justify-center ">
            <Image src={"/preview.png"} width={200} height={200} alt="Preview" />
          </div>
          <div className="space-y-2 max-w-lg">
            <blockquote className="space-y-2">
              <p className="text-sm">
                {
                  "Security isn't just a feature, it's the foundation. Vaultix gives us the peace of mind we need to move fast without breaking things."
                }
              </p>
            </blockquote>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center py-12 min-h-screen">
        <div className="mx-auto w-full max-w-[350px] space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-2">
              <Key className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Create your account
            </h1>
            <p className="text-muted-foreground text-sm">
              {step === "email" && "Enter your email to get started"}
              {step === "code" && `Enter the code we sent to ${email}`}
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={step} variants={fade} initial="hidden" animate="show" exit="exit">
              {step === "email" && (
                <form onSubmit={sendCode} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">Email</label>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-9 rounded-md focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-9 rounded-md text-sm font-medium" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
                  </Button>
                </form>
              )}

              {step === "code" && (
                <form onSubmit={verifyCode} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">Verification code</label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="h-9 rounded-md focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                      required
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full h-9 rounded-md text-sm font-medium" disabled={loading}>
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verifying...</span>
                      </div>
                    ) : (
                      "Verify & continue"
                    )}
                  </Button>
                </form>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              <Link href="/login" className="hover:text-brand underline underline-offset-4">
                Already have an account? Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
