"use client";

import { useAuth } from "@/context/auth-context";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { deriveMasterKey, decryptPrivateKey, fromBase64 } from "@/lib/crypto";
import { usePathname } from "next/navigation";

export function VaultUnlock() {
    const { user, userData, masterKey, setKeys, signOut } = useAuth();
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    // Only show on protected routes where encryption is needed
    // Skip home page, login, register, share (public part)
    const isPublicPage = pathname === "/" || 
                        pathname === "/login" || 
                        pathname === "/register" || 
                        pathname.startsWith("/share/");

    useEffect(() => {
        if (user && userData && !masterKey && !isPublicPage) {
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }, [user, userData, masterKey, isPublicPage]);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userData) return;
        
        setLoading(true);
        try {
            const salt = await fromBase64(userData.master_key_salt);
            const derivedKey = await deriveMasterKey(password, salt);
            
            const privateKey = await decryptPrivateKey(
                userData.encrypted_private_key,
                userData.private_key_nonce,
                derivedKey
            );

            setKeys(derivedKey, privateKey);
            setIsOpen(false);
            setPassword("");
            toast.success("Vault unlocked");
        } catch (err) {
            console.error(err);
            toast.error("Invalid master password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            // Prevent closing if we are on a protected page and not unlocked
            if (!open && !masterKey && !isPublicPage) return;
            setIsOpen(open);
        }}>
            <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-primary/20 shadow-2xl" showCloseButton={false}>
                <DialogHeader className="flex flex-col items-center gap-4 py-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-center space-y-1">
                        <DialogTitle className="text-2xl font-bold tracking-tight">Unlock Vault</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Enter your master password to restore your encryption session.
                        </DialogDescription>
                    </div>
                </DialogHeader>
                
                <form onSubmit={handleUnlock} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Input
                            type="password"
                            placeholder="Master Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-12 text-center text-lg tracking-[0.2em] font-mono focus-visible:ring-primary/50"
                            autoFocus
                            required
                        />
                    </div>
                    <Button 
                        type="submit" 
                        className="w-full h-12 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                        disabled={loading || !password}
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                            <Shield className="w-5 h-5 mr-2" />
                        )}
                        {loading ? "Unlocking..." : "Unlock Vault"}
                    </Button>
                </form>

                <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t border-border/50 pt-4">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => signOut()}
                    >
                        Switch Account / Sign Out
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
