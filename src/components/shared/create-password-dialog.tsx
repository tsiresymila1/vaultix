"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Key, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { encryptSecret } from "@/lib/crypto";

import { PasswordEntry } from "@/types";

interface CreatePasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: () => void;
    editEntry?: PasswordEntry;
    decryptedData?: { pass: string; otp?: string };
}

export function CreatePasswordDialog({
    open,
    onOpenChange,
    onCreated,
    editEntry,
    decryptedData,
}: CreatePasswordDialogProps) {
    const { user, masterKey } = useAuth();
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [websiteUrl, setWebsiteUrl] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [otpEnabled, setOtpEnabled] = useState(false);
    const [otpSeed, setOtpSeed] = useState("");
    const [notes, setNotes] = useState("");

    // Populate fields when editing
    useEffect(() => {
        if (open && editEntry) {
            setTitle(editEntry.title);
            setWebsiteUrl(editEntry.website_url || "");
            setUsername(editEntry.username || "");
            setNotes(editEntry.notes || "");
            if (decryptedData) {
                setPassword(decryptedData.pass);
                setOtpSeed(decryptedData.otp || "");
                setOtpEnabled(!!decryptedData.otp);
            }
        } else if (open && !editEntry) {
            reset();
        }
    }, [open, editEntry, decryptedData]);

    const generatePassword = () => {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
        let newPassword = "";
        for (let i = 0; i < 16; i++) {
            newPassword += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        setPassword(newPassword);
    };

    const handleSubmit = async () => {
        if (!title.trim() || !password.trim()) {
            toast.error("Please enter a title and password.");
            return;
        }

        setLoading(true);
        if (!masterKey) {
            toast.error("Encryption session not initialized. Please re-login.");
            setLoading(false);
            return;
        }

        try {
            const { toBase64 } = await import("@/lib/crypto");
            const b64MK = await toBase64(masterKey);

            const { cipher: encPassword, nonce: passNonce } = await encryptSecret(password, b64MK);
            
            let encOtpSeed = null;
            let otpNonce = null;
            if (otpEnabled && otpSeed.trim()) {
                const result = await encryptSecret(otpSeed.trim(), b64MK);
                encOtpSeed = result.cipher;
                otpNonce = result.nonce;
            }

            const payload = {
                user_id: user?.id,
                title,
                website_url: websiteUrl,
                username,
                encrypted_password: encPassword,
                password_nonce: passNonce,
                encrypted_otp_seed: encOtpSeed,
                otp_nonce: otpNonce,
                notes,
                updated_at: new Date().toISOString(),
            };

            if (editEntry) {
                const { error } = await supabase
                    .from("password_entries")
                    .update(payload)
                    .eq("id", editEntry.id);
                if (error) throw error;
                toast.success("Password entry updated successfully!");
            } else {
                const { error } = await supabase
                    .from("password_entries")
                    .insert(payload);
                if (error) {
                    if (error.code === '42P01') {
                        throw new Error("The 'password_entries' table does not exist in your Supabase database. Please run the migration SQL.");
                    }
                    throw error;
                }
                toast.success("Password entry created successfully!");
            }

            onCreated();
            onOpenChange(false);
            reset();
        } catch (error) {
            console.error("Save password entry error:", error);
            let message = "Failed to save password entry.";
            if (error instanceof Error) message = error.message;
            else if (typeof error === 'object' && error !== null && 'message' in (error as Record<string, unknown>)) message = String((error as Record<string, unknown>).message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setTitle("");
        setWebsiteUrl("");
        setUsername("");
        setPassword("");
        setOtpEnabled(false);
        setOtpSeed("");
        setNotes("");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5 text-primary" />
                        {editEntry ? "Edit Password Entry" : "Add New Password"}
                    </DialogTitle>
                    <DialogDescription>
                        {editEntry ? "Update your stored credentials. Data remains encrypted." : "Store a new set of credentials. All data is encrypted before saving."}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. GitHub Organization"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="url">Website URL</Label>
                            <Input
                                id="url"
                                value={websiteUrl}
                                onChange={(e) => setWebsiteUrl(e.target.value)}
                                placeholder="github.com"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username / Email</Label>
                            <Input
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="admin@org.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="password"
                                    type="text" // Show it while creating
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="font-mono text-sm"
                                />
                                <Button variant="outline" size="icon" onClick={generatePassword} title="Generate random password">
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 py-2">
                        <Switch
                            id="otp-enabled"
                            checked={otpEnabled}
                            onCheckedChange={setOtpEnabled}
                        />
                        <Label htmlFor="otp-enabled" className="text-sm font-medium cursor-pointer">
                            Enable One-Time Password (OTP/2FA)
                        </Label>
                    </div>

                    {otpEnabled && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            <Label htmlFor="otp">Authenticator Key (OTP Seed)</Label>
                            <Input
                                id="otp"
                                value={otpSeed}
                                onChange={(e) => setOtpSeed(e.target.value)}
                                placeholder="JBSWY3DPEHPK3PXP"
                                className="font-mono text-sm"
                            />
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                This seed will be used to generate live auth codes.
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Additional details..."
                            className="h-20 resize-none"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Saving..." : editEntry ? "Update Entry" : "Create Entry"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
