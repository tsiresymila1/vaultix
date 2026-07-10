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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, Copy, Link as LinkIcon, Loader2, Shield, Clock, Eye, UserPlus } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import { api, bearer } from "@/lib/http/client";
import { useAuth } from "@/context/auth-context";

interface ShareEntry {
    id: string;
    ownerEncryptedKey: string;
}

interface SharePasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    content: string;
    entry?: ShareEntry | null;
}

export function SharePasswordDialog({
    open,
    onOpenChange,
    content,
    entry,
}: SharePasswordDialogProps) {
    const { userData, privateKey } = useAuth();
    const [password, setPassword] = useState("");
    const [expiration, setExpiration] = useState("1"); // hours
    const [maxViews, setMaxViews] = useState("1");
    const [loading, setLoading] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Share-with-user state
    const [recipientEmail, setRecipientEmail] = useState("");
    const [sharing, setSharing] = useState(false);

    const handleCreateLink = async () => {
        setLoading(true);
        try {
            const { generateVaultKey, encryptSecret } = await import("@/lib/crypto");
            const ephemeralKeyBase64 = await generateVaultKey();
            const { cipher, nonce } = await encryptSecret(content, ephemeralKeyBase64);
            const expiresAt = Date.now() + parseFloat(expiration) * 60 * 60 * 1000;

            const secretId = id();
            let tx = db.tx.sharedSecrets[secretId].update({
                encryptedPayload: cipher,
                nonce: nonce,
                expiresAt,
                viewsRemaining: parseInt(maxViews),
                createdAt: Date.now(),
            });
            if (userData?.id) tx = tx.link({ creator: userData.id });
            await db.transact(tx);

            let hash = ephemeralKeyBase64;
            if (password.trim()) {
                const { deriveMasterKey, generateSalt, encryptSecret, toBase64 } = await import("@/lib/crypto");
                const salt = await generateSalt();
                const masterKey = await deriveMasterKey(password.trim(), salt);
                const result = await encryptSecret(ephemeralKeyBase64, await toBase64(masterKey));
                hash = `pwd:${await toBase64(salt)}:${result.nonce}:${result.cipher}`;
            }

            const url = `${window.location.origin}/share/${secretId}#${hash}`;
            setGeneratedUrl(url);
            toast.success("Secure link generated!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to share entry.");
        } finally {
            setLoading(false);
        }
    };

    const handleShareWithUser = async () => {
        if (!entry) {
            toast.error("Entry not ready.");
            return;
        }
        if (!privateKey || !userData?.publicKey) {
            toast.error("Unlock your vault first.");
            return;
        }
        if (!recipientEmail.trim()) {
            toast.error("Enter the recipient's email.");
            return;
        }
        setSharing(true);
        try {
            const authUser = await db.getAuth();
            // 1. Resolve recipient's public key.
            const searchRes = await api.users.search.$post(
                { json: { email: recipientEmail.trim() } },
                { headers: bearer(authUser?.refresh_token) },
            );
            const recipient = searchRes.ok ? await searchRes.json() : null;
            if (!recipient) {
                toast.error("No Vaultix user with that email.");
                setSharing(false);
                return;
            }

            // 2. Recover the entry key, then re-seal it to the recipient's key.
            //    (Content stays on the entry — this is a live grant, not a copy.)
            const { decryptVaultKeyWithPrivateKey, encryptVaultKeyForUser } = await import("@/lib/crypto");
            const entryKey = await decryptVaultKeyWithPrivateKey(
                entry.ownerEncryptedKey,
                userData.publicKey,
                privateKey,
            );
            const encryptedKey = await encryptVaultKeyForUser(entryKey, recipient.publicKey);

            // 3. Persist the grant (server only wires the links; never sees keys).
            const res = await api.passwords.share.$post(
                {
                    json: {
                        recipientEmail: recipient.email,
                        entryId: entry.id,
                        encryptedKey,
                    },
                },
                { headers: bearer(authUser?.refresh_token) },
            );
            if (!res.ok) {
                const err = (await res.json().catch(() => ({}))) as { error?: unknown };
                throw new Error(typeof err.error === "string" ? err.error : "Failed to share");
            }
            toast.success(`Shared with ${recipient.email}`);
            setRecipientEmail("");
            onOpenChange(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to share");
        } finally {
            setSharing(false);
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
                        Share directly with another Vaultix user, or generate a one-time link.
                    </DialogDescription>
                </DialogHeader>

                {generatedUrl ? (
                    <div className="space-y-4 py-4 text-center px-4">
                        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                            <div className="mx-auto w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center mb-2">
                                <LinkIcon className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="text-sm font-semibold text-primary">Secure Link Ready</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <Input value={generatedUrl} readOnly className="font-mono text-xs" />
                            <Button size="icon" onClick={copyToClipboard} className="shrink-0">
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                        <Button className="w-full" onClick={reset}>Done</Button>
                    </div>
                ) : (
                    <Tabs defaultValue="user" className="px-4 pb-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="user">Share with user</TabsTrigger>
                            <TabsTrigger value="link">One-time link</TabsTrigger>
                        </TabsList>

                        <TabsContent value="user" className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="recipient-email" className="text-xs">Recipient email</Label>
                                <Input
                                    id="recipient-email"
                                    type="email"
                                    placeholder="teammate@example.com"
                                    value={recipientEmail}
                                    onChange={(e) => setRecipientEmail(e.target.value)}
                                    disabled={sharing}
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    Re-encrypted for their key. Only they can read it. A snapshot — later edits aren&apos;t pushed.
                                </p>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sharing}>Cancel</Button>
                                <Button onClick={handleShareWithUser} disabled={sharing || !entry}>
                                    {sharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                    Share
                                </Button>
                            </DialogFooter>
                        </TabsContent>

                        <TabsContent value="link" className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Expiration</Label>
                                    <Select value={expiration} onValueChange={setExpiration} disabled={loading}>
                                        <SelectTrigger className="h-9"><SelectValue placeholder="Expires in" /></SelectTrigger>
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
                                    <Label className="text-xs flex items-center gap-1"><Eye className="w-3 h-3" /> Max Views</Label>
                                    <Select value={maxViews} onValueChange={setMaxViews} disabled={loading}>
                                        <SelectTrigger className="h-9"><SelectValue placeholder="Views" /></SelectTrigger>
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
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
                                <Button onClick={handleCreateLink} disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                                    Generate Link
                                </Button>
                            </DialogFooter>
                        </TabsContent>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
