"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { deriveMasterKey, decryptPrivateKey, fromBase64 } from "@/lib/crypto";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";
import { Shield, Lock, ArrowRight, Loader2, Sparkles, Fingerprint } from "lucide-react";

export default function LoginPageContent() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { setKeys } = useAuth();
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("*")
                .eq("id", authData.user.id)
                .single();

            if (userError) throw userError;

            const salt = await fromBase64(userData.master_key_salt);
            const masterKey = await deriveMasterKey(password, salt);
            const privateKey = await decryptPrivateKey(
                userData.encrypted_private_key,
                userData.private_key_nonce,
                masterKey
            );

            setKeys(masterKey, privateKey);
            toast.success("Welcome back to Vaultix");
            router.push("/vaults");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Invalid credentials";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-700" />
            </div>

            <div className="w-full max-w-lg space-y-8 animate-in fade-in zoom-in duration-700">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary to-blue-600 p-0.5 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                        <div className="w-full h-full bg-background rounded-[1.9rem] flex items-center justify-center">
                            <Shield className="w-10 h-10 text-primary" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
                            Vaultix Portal
                        </h1>
                        <p className="text-muted-foreground font-medium mt-2">
                            Secure access to your encrypted workspace
                        </p>
                    </div>
                </div>

                <Card className="border-border/30 bg-card/30 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl overflow-hidden relative border-t-white/10">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                    <CardHeader className="p-8 pb-0">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-primary/70 mb-2">
                            <Lock className="w-3 h-3" />
                            Identity Authentication
                        </div>
                        <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
                        <CardDescription>Enter your master credentials to unlock your keys.</CardDescription>
                    </CardHeader>

                    <CardContent className="p-8 space-y-6">
                        <form onSubmit={handleLogin} id="login-form" className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Email Identifier</label>
                                <div className="relative group">
                                    <Input
                                        type="email"
                                        placeholder="name@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="h-12 rounded-2xl bg-background/50 border-border/50 pl-11 focus:ring-primary/20 transition-all font-medium"
                                        required
                                    />
                                    <Fingerprint className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Master Password</label>
                                    <Link href="#" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest">Forgot?</Link>
                                </div>
                                <div className="relative group">
                                    <Input
                                        type="password"
                                        placeholder="••••••••••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-12 rounded-2xl bg-background/50 border-border/50 pl-11 focus:ring-primary/20 transition-all font-medium"
                                        required
                                    />
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>
                        </form>
                    </CardContent>

                    <CardFooter className="p-8 pt-0 flex flex-col gap-6">
                        <Button
                            type="submit"
                            form="login-form"
                            className="w-full h-12 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all group"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Unlocking...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    Unlock Vault
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </div>
                            )}
                        </Button>

                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">
                                Don&apos;t have an account?{" "}
                                <Link
                                    href="/register"
                                    className="text-primary font-bold hover:underline inline-flex items-center gap-1 group"
                                >
                                    Create Identity
                                    <Sparkles className="w-3.5 h-3.5 group-hover:animate-bounce" />
                                </Link>
                            </p>
                        </div>
                    </CardFooter>
                </Card>

                <div className="text-center text-[10px] text-muted-foreground/40 font-mono flex items-center justify-center gap-4">
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> E2EE ACTIVE</span>
                    <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> LIBSODIUM WASM</span>
                    <span className="flex items-center gap-1"><ArrowRight className="w-3 h-3" /> SESSION ISOLATED</span>
                </div>
            </div>
        </div>
    );
}
