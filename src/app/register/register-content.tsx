"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    deriveMasterKey,
    encryptPrivateKey,
    generateSalt,
    generateUserKeyPair,
    toBase64
} from "@/lib/crypto";
import { supabase } from "@/lib/supabase";
import { Key, Loader2, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function RegisterPageContent() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;

            if (!authData.user) throw new Error("Registration failed");

            // 1. Generate salt and master key
            const salt = await generateSalt();
            const masterKey = await deriveMasterKey(password, salt);

            // 2. Generate user key pair
            const keyPair = await generateUserKeyPair();

            // 3. Encrypt private key with master key
            const encryptedPrivateKeyResult = await encryptPrivateKey(
                keyPair.privateKey,
                masterKey
            );

            // 4. Store user public key and encrypted private key using secure RPC
            // This bypasses strict RLS checks that might fail if the session isn't fully established yet (e.g. pending email confirmation)
            const { error: userError } = await supabase.rpc("register_user_profile", {
                p_id: authData.user.id,
                p_email: authData.user.email,
                p_public_key: keyPair.publicKey,
                p_encrypted_private_key: encryptedPrivateKeyResult.cipher,
                p_private_key_nonce: encryptedPrivateKeyResult.nonce,
                p_master_key_salt: await toBase64(salt),
            });

            if (userError) throw userError;


            toast.success("Identity created successfully");
            router.push("/login");
        } catch (error) {
            console.error("Registration error:", error);
            // Ensure we don't leave the user in a half-authenticated state
            // await supabase.auth.signOut();
            const message = error instanceof Error ? error.message : "Registration failed";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
            <div className="hidden bg-muted lg:block relative h-full">
                <div className="absolute inset-0 bg-zinc-900 border-r border-white/10" />
                <div className="relative h-full flex flex-col justify-between p-10 text-white z-20">
                    <Link href="/" className="flex items-center gap-2 text-lg font-medium hover:opacity-80 transition-opacity">
                        <Shield className="w-6 h-6 text-primary" /> Vaultix
                    </Link>
                    <div className="space-y-2 max-w-lg">
                        <blockquote className="space-y-2">
                            <p className="text-sm">
                                {"Security isn't just a feature, it's the foundation. Vaultix gives us the peace of mind we need to move fast without breaking things."}
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
                            Create an account
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Initialize your secure cryptographic identity
                        </p>
                    </div>

                    <form onSubmit={handleRegister} id="register-form" className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                            <Input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-9 rounded-md focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Master Password</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-9 rounded-md focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Confirm Password</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="h-9 rounded-md focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                                    required
                                />
                            </div>
                        </div>

                        <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground border border-border">
                            <p className="font-medium text-foreground mb-1 flex items-center gap-1">
                                <Shield className="w-3 h-3 text-primary" /> Security Note
                            </p>
                            Your master password is used to generate your encryption keys. It is never sent to our servers.
                        </div>

                        <Button
                            type="submit"
                            form="register-form"
                            className="w-full h-9 rounded-md text-sm font-medium"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Creating account...</span>
                                </div>
                            ) : (
                                "Create Account"
                            )}
                        </Button>
                    </form>

                    <p className="px-8 text-center text-sm text-muted-foreground">
                        <Link href="/login" className="hover:text-brand underline underline-offset-4">
                            Already have an account? Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
