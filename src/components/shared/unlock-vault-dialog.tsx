"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { decryptPrivateKey, deriveMasterKey, fromBase64 } from "@/lib/crypto";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";

interface UnlockVaultDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUnlocked?: () => void;
}

export function UnlockVaultDialog({
    open,
    onOpenChange,
    onUnlocked
}: UnlockVaultDialogProps) {
    const { userData, setKeys } = useAuth();
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userData) return;

        setLoading(true);
        try {
            const salt = await fromBase64(userData.master_key_salt);
            const masterKey = await deriveMasterKey(password, salt);
            const privateKey = await decryptPrivateKey(
                userData.encrypted_private_key,
                userData.private_key_nonce,
                masterKey
            );

            setKeys(masterKey, privateKey);
            toast.success("Vault session unlocked");
            onOpenChange(false);
            if (onUnlocked) onUnlocked();
        } catch (error) {
            console.error(error);
            toast.error("Invalid Master Password. Encryption keys could not be derived.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Lock className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-center">Unlock Vault Session</DialogTitle>
                    <DialogDescription className="text-center">
                        Your cryptographic session is locked. Enter your Master Password to re-derive your encryption keys.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUnlock} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Master Password</label>
                        <Input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Unlocking...
                                </>
                            ) : (
                                "Unlock Session"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
