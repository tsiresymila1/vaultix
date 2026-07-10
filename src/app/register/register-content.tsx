"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deriveMasterKey,
  encryptPrivateKey,
  generateSalt,
  generateUserKeyPair,
  toBase64,
} from "@/lib/crypto";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import { useAuth } from "@/context/auth-context";
import { Key, Loader2, Shield } from "lucide-react";
import { motion, AnimatePresence } from "@/components/motion";
import { fade } from "@/lib/motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Step = "email" | "code" | "setup";

export default function RegisterPageContent() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      // Already set up? Skip to app.
      const { data } = await db.queryOnce({
        profiles: { $: { where: { "$user.email": email } } },
      });
      const profiles = data.profiles;
      if (profiles && profiles.length > 0) {
        toast.info("Account already set up — please log in");
        router.push("/login");
        return;
      }
      setStep("setup");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const setup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const authUser = await db.getAuth();
      if (!authUser) throw new Error("Session expired — verify your email again");

      // Derive master key, generate identity keypair, encrypt private key.
      const salt = await generateSalt();
      const masterKey = await deriveMasterKey(password, salt);
      const keyPair = await generateUserKeyPair();
      const encrypted = await encryptPrivateKey(keyPair.privateKey, masterKey);

      const profileId = id();
      await db.transact(
        db.tx.profiles[profileId]
          .update({
            publicKey: keyPair.publicKey,
            encryptedPrivateKey: encrypted.cipher,
            privateKeyNonce: encrypted.nonce,
            masterKeySalt: await toBase64(salt),
            role: "user",
            status: "active",
            createdAt: Date.now(),
          })
          .link({ $user: authUser.id }),
      );

      setKeys(masterKey, keyPair.privateKey);
      toast.success("Identity created successfully");
      router.push("/vaults");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
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
              Create your identity
            </h1>
            <p className="text-muted-foreground text-sm">
              {step === "email" && "Enter your email to get started"}
              {step === "code" && `Enter the code we sent to ${email}`}
              {step === "setup" &&
                "Choose a master password — it encrypts your keys and is never sent to the server"}
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
                />
              </div>
              <Button type="submit" className="w-full h-9 rounded-md text-sm font-medium" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
              </Button>
            </form>
          )}

          {step === "setup" && (
            <form onSubmit={setup} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Master password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9 rounded-md focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Confirm master password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-9 rounded-md focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                  required
                />
              </div>
              <Button type="submit" className="w-full h-9 rounded-md text-sm font-medium" disabled={loading}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating identity...</span>
                  </div>
                ) : (
                  "Create identity"
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
