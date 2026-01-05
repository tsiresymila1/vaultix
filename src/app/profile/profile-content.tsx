"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { UserData } from "@/types";
import { CheckCircle2, Fingerprint, Key, Loader2, Mail, Shield, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";


export default function ProfilePageContent() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null);

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");

    const fetchUserData = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from("users")
                .select("*")
                .eq("id", user.id)
                .single();
            if (error) throw error;
            setUserData(data);
            setFullName(data.full_name || "");
            setEmail(user.email || "");
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchUserData();
        }
    }, [user, fetchUserData]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (!user) throw new Error("No user found");

            // Update local profile data
            const { error: profileError } = await supabase
                .from("users")
                .update({ full_name: fullName })
                .eq("id", user.id);

            if (profileError) throw profileError;

            // Update Auth email if changed (triggers confirmation)
            if (email !== user.email) {
                const { error: authError } = await supabase.auth.updateUser({ email });
                if (authError) throw authError;
                toast.info("Validation email sent to new address");
            }

            toast.success("Profile updated successfully");
            fetchUserData();
        } catch (error) {
            console.error("Error updating profile:", error);
            const message = error instanceof Error ? error.message : "Failed to update profile";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="space-y-8 max-w-5xl">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Account Profile
                </h1>
                <p className="text-muted-foreground text-sm">
                    Manage your identity and cryptographic security settings
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Avatar & Quick Info */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="rounded-lg border-border bg-card shadow-sm overflow-hidden h-fit py-0">
                        <CardHeader className="text-center py-6 border-b border-border bg-secondary/30">
                            <div className="flex justify-center mb-4">
                                <Avatar className="h-20 w-20 border-2 border-background shadow-sm">
                                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                                        {(fullName || user.email)?.[0]?.toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            <CardTitle className="text-lg font-bold">{fullName || user.email?.split('@')[0]}</CardTitle>
                            <CardDescription className="font-mono text-[10px] uppercase tracking-widest mt-1">
                                Member since {new Date(user.created_at).toLocaleDateString()}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-3 p-3 rounded-md bg-secondary/50 border border-border">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-1">Email</span>
                                    <span className="text-xs font-semibold truncate">{user.email}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-md bg-secondary/50 border border-border">
                                <Fingerprint className="h-3.5 w-3.5 text-muted-foreground" />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-1">Account ID</span>
                                    <span className="text-xs font-mono truncate text-muted-foreground">{user.id}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-lg border-border bg-card shadow-sm p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-primary mb-1">
                            <Shield className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">Trust Status</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-medium">Your account is secured with end-to-end encryption.</p>
                    </Card>
                </div>

                {/* Right: Forms */}
                <div className="lg:col-span-8 space-y-6">
                    <Card className="rounded-lg border-border bg-card shadow-sm overflow-hidden">
                        <CardHeader className="p-6 border-b border-border bg-secondary/10">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />
                                Public Identity
                            </CardTitle>
                            <CardDescription className="text-xs">How you appear to other vault members</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <form onSubmit={handleUpdateProfile} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-0.5">Display Name</label>
                                        <Input
                                            placeholder="Your name"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="h-9 rounded-md bg-secondary/20 border-border text-sm font-medium focus:ring-1 focus:ring-primary/50"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-0.5">Email Address</label>
                                        <Input
                                            type="email"
                                            placeholder="your@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="h-9 rounded-md bg-secondary/20 border-border text-sm font-medium focus:ring-1 focus:ring-primary/50"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end border-t border-border pt-6">
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="rounded-md h-9 px-6 font-semibold shadow-sm"
                                    >
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        Update Profile
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="rounded-lg border-border bg-card shadow-sm overflow-hidden">
                        <CardHeader className="p-6 border-b border-border bg-secondary/10">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Key className="h-4 w-4 text-primary" />
                                Cryptographic Identity
                            </CardTitle>
                            <CardDescription className="text-xs">Manage your unique encryption keys</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Public Key</p>
                                        <p className="text-[11px] text-muted-foreground">Shared identifier for vault access control</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (userData?.public_key) {
                                                navigator.clipboard.writeText(userData.public_key);
                                                toast.success("Public key copied");
                                            }
                                        }}
                                        className="rounded-md h-8 text-[11px] font-bold uppercase tracking-wider"
                                    >
                                        Copy Key
                                    </Button>
                                </div>
                                <div className="p-3 bg-secondary/50 rounded-md border border-border font-mono text-[10px] break-all leading-relaxed text-muted-foreground select-all">
                                    {userData?.public_key || "Retrieving cryptographic identity..."}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-md border border-emerald-500/20 bg-emerald-500/[0.02]">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-500/20">
                                        <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-bold">Private Key Secured</p>
                                        <p className="text-[10px] text-muted-foreground font-medium">Encrypted with your Master Key</p>
                                    </div>
                                </div>
                                <div className="px-2 py-0.5 bg-emerald-500 text-white rounded text-[9px] font-black uppercase tracking-widest">
                                    Verified
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}


