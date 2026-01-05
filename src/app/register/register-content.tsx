"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    deriveMasterKey,
    encryptPrivateKey,
    generateSalt,
    generateUserKeyPair,
    toBase64
} from "@/lib/crypto";
import { supabase } from "@/lib/supabase";
import { ArrowRight, Key, Loader2, Lock, Mail, Shield, Sparkles } from "lucide-react";
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

            // 4. Store user public key and encrypted private key in public.users table
            const { error: userError } = await supabase.from("users").insert({
                id: authData.user.id,
                email: authData.user.email,
                public_key: keyPair.publicKey,
                encrypted_private_key: encryptedPrivateKeyResult.cipher,
                private_key_nonce: encryptedPrivateKeyResult.nonce,
                master_key_salt: await toBase64(salt),
            });

            if (userError) throw userError;


            toast.success("Identity created successfully");
            router.push("/login");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Registration failed";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse delay-700" />
            </div>

            <div className="w-full max-w-lg space-y-8 animate-in fade-in zoom-in duration-700">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-gradient-to-br from-purple-600 to-primary p-0.5 shadow-2xl -rotate-3 hover:rotate-0 transition-transform duration-500">
                        <div className="w-full h-full bg-background rounded-[1.9rem] flex items-center justify-center">
                            <Sparkles className="w-10 h-10 text-primary" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
                            Create Identity
                        </h1>
                        <p className="text-muted-foreground font-medium mt-2">
                            Initialize your secure cryptographic profile
                        </p>
                    </div>
                </div>

                <Card className="border-border/30 bg-card/30 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl overflow-hidden relative border-t-white/10">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

                    <CardHeader className="p-8 pb-0">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-purple-500/70 mb-2">
                            <Key className="w-3 h-3" />
                            Cryptographic Setup
                        </div>
                        <CardTitle className="text-2xl font-bold">New Account</CardTitle>
                        <CardDescription>Setup your master password. This will be used to derive your local keys.</CardDescription>
                    </CardHeader>

                    <CardContent className="p-8 space-y-5">
                        <form onSubmit={handleRegister} id="register-form" className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Work Email</label>
                                <div className="relative group">
                                    <Input
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="h-12 rounded-2xl bg-background/50 border-border/50 pl-11 focus:ring-primary/20 transition-all font-medium"
                                        required
                                    />
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Master Password</label>
                                    <div className="relative group">
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="h-12 rounded-2xl bg-background/50 border-border/50 pl-11 focus:ring-primary/20 transition-all font-medium"
                                            required
                                        />
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Confirm</label>
                                    <div className="relative group">
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="h-12 rounded-2xl bg-background/50 border-border/50 pl-11 focus:ring-primary/20 transition-all font-medium"
                                            required
                                        />
                                        <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                                <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-wider font-bold">
                                    Your password is never sent to our servers in plain text. It is used to generate local keys on this device.
                                </p>
                            </div>
                        </form>
                    </CardContent>

                    <CardFooter className="p-8 pt-0 flex flex-col gap-6">
                        <Button
                            type="submit"
                            form="register-form"
                            className="w-full h-12 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 bg-gradient-to-r from-primary to-purple-600 hover:scale-[1.02] active:scale-95 transition-all group"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Initializing...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    Create Account
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </div>
                            )}
                        </Button>

                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">
                                Already have an account?{" "}
                                <Link
                                    href="/login"
                                    className="text-primary font-bold hover:underline inline-flex items-center gap-1 group"
                                >
                                    Log In
                                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </p>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
