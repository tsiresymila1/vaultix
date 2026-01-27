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
import { Check, Copy, Link as LinkIcon, Loader2, Shield, Clock, Eye } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface SharePasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    content: string;
}

export function SharePasswordDialog({
    open,
    onOpenChange,
    content,
}: SharePasswordDialogProps) {
    const [password, setPassword] = useState("");
    const [expiration, setExpiration] = useState("1"); // hours
    const [maxViews, setMaxViews] = useState("1");
    const [loading, setLoading] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCreateLink = async () => {
        setLoading(true);
        try {
            const { generateVaultKey, encryptSecret } = await import("@/lib/crypto");
            
            // 1. Generate ephemeral key
            const ephemeralKeyBase64 = await generateVaultKey();

            // 2. Encrypt content
            const { cipher, nonce } = await encryptSecret(content, ephemeralKeyBase64);

            // 3. Store in Supabase
            const expirationDate = new Date();
            expirationDate.setHours(expirationDate.getHours() + parseInt(expiration));

            const { data, error } = await supabase
                .from("shared_secrets")
                .insert({
                    encrypted_payload: cipher,
                    nonce: nonce,
                    expires_at: expirationDate.toISOString(),
                    views_remaining: parseInt(maxViews),
                })
                .select("id")
                .single();

            if (error) throw error;

            // 4. Handle password protection
            let hash = ephemeralKeyBase64;
            if (password.trim()) {
                const { deriveMasterKey, generateSalt, encryptSecret, toBase64 } = await import("@/lib/crypto");
                const salt = await generateSalt();
                const masterKey = await deriveMasterKey(password.trim(), salt);
                const result = await encryptSecret(ephemeralKeyBase64, await toBase64(masterKey));
                hash = `pwd:${await toBase64(salt)}:${result.nonce}:${result.cipher}`;
            }

            const url = `${window.location.origin}/share/${data.id}#${hash}`;
            setGeneratedUrl(url);
            toast.success("Secure link generated!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to share entry.");
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
        setPassword("");
        setExpiration("1");
        setMaxViews("1");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader className="p-4">
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Share Password Entry
                    </DialogTitle>
                    <DialogDescription>
                        Generate a secure, one-time link to share this credential.
                    </DialogDescription>
                </DialogHeader>
                
                {!generatedUrl ? (
                    <div className="space-y-4 py-4 px-4 gap-4 flex flex-col">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Expiration
                                </Label>
                                <Select value={expiration} onValueChange={setExpiration} disabled={loading}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Expires in" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0.08333">5 Minutes</SelectItem>
                                        <SelectItem value="1">1 Hour</SelectItem>
                                        <SelectItem value="4">4 Hours</SelectItem>
                                        <SelectItem value="24">1 Day</SelectItem>
                                        <SelectItem value="168">1 Week</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs flex items-center gap-1">
                                    <Eye className="w-3 h-3" /> Max Views
                                </Label>
                                <Select value={maxViews} onValueChange={setMaxViews} disabled={loading}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Views" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 View</SelectItem>
                                        <SelectItem value="5">5 Views</SelectItem>
                                        <SelectItem value="10">10 Views</SelectItem>
                                        <SelectItem value="100">100 Views</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="share-password">Add Password Protection (Optional)</Label>
                            <Input
                                id="share-password"
                                type="password"
                                placeholder="Recipient must enter this password..."
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Use a separate channel to share this password with the recipient.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 py-4 text-center">
                        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                            <div className="mx-auto w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center mb-2">
                                <LinkIcon className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="text-sm font-semibold text-primary">Secure Link Ready</h3>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Valid for {expiration === "1" ? "1 hour" : expiration === "24" ? "1 day" : expiration === "168" ? "1 week" : expiration === "0.08333" ? "5 minutes" : `${expiration} hours`} or {maxViews === "1" ? "1 view" : `${maxViews} views`}.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Input value={generatedUrl} readOnly className="font-mono text-xs" />
                            <Button size="icon" onClick={copyToClipboard} className="shrink-0">
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {!generatedUrl ? (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreateLink} disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                                Generate Link
                            </Button>
                        </>
                    ) : (
                        <Button className="w-full" onClick={reset}>
                            Done
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
