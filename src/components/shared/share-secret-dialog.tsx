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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/auth-context";
import { decryptSecret, encryptSecret, generateVaultKey } from "@/lib/crypto";
import { supabase } from "@/lib/supabase";
import { Secret } from "@/types";
import { Check, Copy, Link as LinkIcon, Loader2, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ShareSecretDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    secrets: Secret[] | null;
    vaultKey: string | null;
    preDecryptedValue?: string;
}

export function ShareSecretDialog({
    open,
    onOpenChange,
    secrets,
    vaultKey,
    preDecryptedValue,
}: ShareSecretDialogProps) {
    const [loading, setLoading] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
    const [duration, setDuration] = useState("3600"); // Default 1 hour in seconds
    const [views, setViews] = useState("unlimited");
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        if (!secrets || secrets.length === 0) {
            toast.error("No secrets selected to share");
            return;
        }

        if (!vaultKey) {
            toast.error("Vault is locked. Please unlock it first.");
            return;
        }

        setLoading(true);
        try {
            let combinedContent = "";

            if (secrets.length === 1 && preDecryptedValue) {
                combinedContent = `${secrets[0].key}: ${preDecryptedValue}`;
            } else {
                const contents = await Promise.all(secrets.map(async (s) => {
                    const val = await decryptSecret(
                        s.encrypted_payload,
                        s.nonce,
                        vaultKey
                    );
                    return `${s.key}: ${val}`;
                }));
                combinedContent = contents.join("\n");
            }

            // 2. Generate ephemeral key specific to this share link
            const ephemeralKeyBase64 = await generateVaultKey();

            // 3. Encrypt the secret with the ephemeral key
            const { cipher, nonce } = await encryptSecret(combinedContent, ephemeralKeyBase64);

            // 4. Calculate expiration
            const expirationDate = new Date();
            expirationDate.setSeconds(expirationDate.getSeconds() + parseInt(duration));

            // 5. Store in Supabase
            const { data, error } = await supabase
                .from("shared_secrets")
                .insert({
                    encrypted_payload: cipher,
                    nonce: nonce,
                    expires_at: expirationDate.toISOString(),
                    views_remaining: views === "unlimited" ? null : parseInt(views),
                })
                .select("id")
                .single();

            if (error) throw error;

            // 6. Generate URL with hash fragment containing key
            // The key is NEVER sent to the server in this final form, only used to encrypt before sending
            // Wait, we encrypted with ephemeralKeyBase64. We need to put that in the URL.
            const url = `${window.location.origin}/share/${data.id}#${ephemeralKeyBase64}`;
            setGeneratedUrl(url);
            toast.success("Share link created!");
        } catch (error) {
            console.error("Share error:", error);
            toast.error("Failed to create share link");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!generatedUrl) return;
        navigator.clipboard.writeText(generatedUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Link copied to clipboard");
    };

    const reset = () => {
        setGeneratedUrl(null);
        setDuration("3600");
        setViews("unlimited");
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) reset();
            onOpenChange(val);
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Secret</DialogTitle>
                    <DialogDescription>
                        Create a secure, temporary link to share this secret.
                        Anyone with the link can view it.
                    </DialogDescription>
                </DialogHeader>

                {!generatedUrl ? (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="duration">Expiration</Label>
                            <Select value={duration} onValueChange={setDuration}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select duration" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="300">5 Minutes</SelectItem>
                                    <SelectItem value="1800">30 Minutes</SelectItem>
                                    <SelectItem value="3600">1 Hour</SelectItem>
                                    <SelectItem value="86400">1 Day</SelectItem>
                                    <SelectItem value="604800">7 Days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="views">View Limit</Label>
                            <Select value={views} onValueChange={setViews}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select view limit" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unlimited">Unlimited views</SelectItem>
                                    <SelectItem value="1">1 View (Burn after read)</SelectItem>
                                    <SelectItem value="5">5 Views</SelectItem>
                                    <SelectItem value="10">10 Views</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 py-4">
                        <div className="flex items-center space-x-2">
                            <div className="grid flex-1 gap-2">
                                <Label htmlFor="link" className="sr-only">
                                    Link
                                </Label>
                                <Input
                                    id="link"
                                    defaultValue={generatedUrl}
                                    readOnly
                                    className="pr-10"
                                />
                            </div>
                            <Button size="sm" onClick={copyToClipboard} className="px-3">
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                <span className="sr-only">Copy</span>
                            </Button>
                        </div>
                        <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                            <p className="font-semibold mb-1">Security Note:</p>
                            We encrypted this secret with a unique key which is included in the link above (after the #).
                            The key is never sent to our servers.
                        </div>
                    </div>
                )}

                <DialogFooter className="sm:justify-end">
                    {!generatedUrl ? (
                        <>
                            <Button variant="secondary" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleShare} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Link
                            </Button>
                        </>
                    ) : (
                        <Button variant="secondary" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
