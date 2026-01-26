"use client";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CreatePasswordDialog } from "@/components/shared/create-password-dialog";
import { OTPAuthenticator } from "@/components/shared/otp-authenticator";
import { SharePasswordDialog } from "@/components/shared/share-password-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
    Copy,
    Edit,
    ExternalLink,
    Eye,
    EyeOff,
    Key,
    MoreVertical,
    Plus,
    Search,
    Shield,
    Trash2
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PasswordEntry } from "@/types";

interface PasswordsPageContentProps {
    initialPasswords: PasswordEntry[];
}

export default function PasswordsPageContent({ initialPasswords }: PasswordsPageContentProps) {
    const { masterKey } = useAuth();
    const [passwords, setPasswords] = useState<PasswordEntry[]>(initialPasswords);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(initialPasswords[0]?.id || null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [shareContent, setShareContent] = useState("");
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<PasswordEntry | undefined>(undefined);
    const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
    const [decryptedValues, setDecryptedValues] = useState<Record<string, { pass: string, otp?: string }>>({});

    const selectedPassword = passwords.find(p => p.id === selectedId);

    useEffect(() => {
        if (!selectedId || !masterKey) return;
        const entry = passwords.find(p => p.id === selectedId);
        if (!entry) return;

        const decrypt = async () => {
            try {
                const { toBase64, decryptSecret } = await import("@/lib/crypto");
                const b64MK = await toBase64(masterKey);

                const pass = await decryptSecret(entry.encrypted_password, entry.password_nonce, b64MK);
                let otp: string | undefined;
                if (entry.encrypted_otp_seed && entry.otp_nonce) {
                    otp = await decryptSecret(entry.encrypted_otp_seed, entry.otp_nonce, b64MK);
                }

                setDecryptedValues(prev => ({ ...prev, [entry.id]: { pass, otp } }));
            } catch (error) {
                console.error("Decryption failed:", error);
                let message = "Failed to decrypt password entry.";
                if (error instanceof Error) message = error.message;
                else if (typeof error === 'object' && error !== null && 'message' in (error as Record<string, unknown>)) message = String((error as Record<string, unknown>).message);
                toast.error(message);
            }
        };

        if (!decryptedValues[selectedId]) {
            decrypt();
        }
    }, [selectedId, masterKey, passwords, decryptedValues]);

    const filteredPasswords = passwords.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.website_url?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    const toggleReveal = (id: string) => {
        setRevealedPasswords(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleShareEntry = () => {
        if (!selectedPassword || !decryptedValues[selectedPassword.id]) {
            toast.error("Please wait for the entry to decrypt first.");
            return;
        }

        const vals = decryptedValues[selectedPassword.id];
        const content = `Title: ${selectedPassword.title}\nURL: ${selectedPassword.website_url || ""}\nUsername: ${selectedPassword.username || ""}\nPassword: ${vals.pass}${vals.otp ? `\nOTP Seed: ${vals.otp}` : ""}`;

        setShareContent(content);
        setIsShareDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!idToDelete) return;
        setDeleting(true);
        try {
            const { error } = await supabase.from("password_entries").delete().eq("id", idToDelete);
            if (error) throw error;
            toast.success("Entry deleted successfully");
            setPasswords(prev => prev.filter(p => p.id !== idToDelete));
            if (selectedId === idToDelete) setSelectedId(null);
            setIsDeleteDialogOpen(false);
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete entry");
        } finally {
            setDeleting(false);
        }
    };

    const handleEditOpen = () => {
        if (!selectedPassword) return;
        setEntryToEdit(selectedPassword);
        setIsEditDialogOpen(true);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-12rem)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Password Manager</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {"Securely store and manage your organization's credentials."}
                    </p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="rounded-md">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Password
                </Button>
            </div>

            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
                {/* List Side */}
                <Card className="col-span-12 lg:col-span-4 flex flex-col min-h-0 border-border bg-card/50">
                    <CardHeader className="px-4 py-3 border-b border-border/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search passwords..."
                                className="pl-9 bg-background/50 border-border/50 h-9 text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto overflow-x-hidden">
                        {filteredPasswords.length > 0 ? (
                            <div className="divide-y divide-border/50">
                                {filteredPasswords.map((p) => (
                                    <div
                                        key={p.id}
                                        onClick={() => setSelectedId(p.id)}
                                        className={cn(
                                            "flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-secondary/30",
                                            selectedId === p.id ? "bg-secondary/50 border-l-2 border-primary" : "border-l-2 border-transparent"
                                        )}
                                    >
                                        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                            {p.website_url ? (
                                                <Image
                                                    src={`https://www.google.com/s2/favicons?domain=${p.website_url}&sz=64`}
                                                    alt=""
                                                    width={20}
                                                    height={20}
                                                    className="w-5 h-5"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = "";
                                                        (e.target as HTMLImageElement).className = "hidden";
                                                    }}
                                                />
                                            ) : (
                                                <Key className="w-5 h-5 text-primary" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-semibold truncate">{p.title}</h3>
                                            <p className="text-xs text-muted-foreground truncate">{p.username || "No username"}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                <Shield className="h-8 w-8 text-muted-foreground/30 mb-2" />
                                <p className="text-sm text-muted-foreground">No passwords found</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Detail Side */}
                <Card className="col-span-12 lg:col-span-8 flex flex-col border-border bg-card shadow-sm">
                    {selectedPassword ? (
                        <div className="flex flex-col h-full">
                            <CardHeader className="border-b border-border/50 pb-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center border border-border relative overflow-hidden">
                                            {selectedPassword.website_url ? (
                                                <Image
                                                    src={`https://www.google.com/s2/favicons?domain=${selectedPassword.website_url}&sz=128`}
                                                    alt={selectedPassword.title}
                                                    fill
                                                    className="object-contain p-3"
                                                />
                                            ) : (
                                                <Key className="w-8 h-8 text-primary" />
                                            )}
                                        </div>
                                        <div>
                                            <CardTitle className="text-2xl">{selectedPassword.title}</CardTitle>
                                            {selectedPassword.website_url && (
                                                <a
                                                    href={selectedPassword.website_url.startsWith('http') ? selectedPassword.website_url : `https://${selectedPassword.website_url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                                                >
                                                    {selectedPassword.website_url}
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={handleEditOpen}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit Entry
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={handleShareEntry}>
                                                <Shield className="mr-2 h-4 w-4" />
                                                Share Secure Link (1 Hour)
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onClick={() => { setIdToDelete(selectedPassword.id); setIsDeleteDialogOpen(true); }}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete Entry
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-8 pt-6 overflow-y-auto">
                                <div className="grid sm:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Username</label>
                                            <div className="flex items-center gap-2">
                                                <Input readOnly value={selectedPassword.username || ""} className="bg-secondary/30 h-10" />
                                                <Button variant="outline" size="icon" onClick={() => handleCopy(selectedPassword.username || "", "Username")}>
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Password</label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type={revealedPasswords[selectedPassword.id] ? "text" : "password"}
                                                    readOnly
                                                    value={decryptedValues[selectedPassword.id]?.pass || "••••••••••••"}
                                                    className="bg-secondary/30 font-mono h-10"
                                                />
                                                <Button variant="outline" size="icon" onClick={() => toggleReveal(selectedPassword.id)}>
                                                    {revealedPasswords[selectedPassword.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                                <Button variant="outline" size="icon" onClick={() => handleCopy(decryptedValues[selectedPassword.id]?.pass || "", "Password")}>
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="flex items-center gap-1 mt-1">
                                                <div className="h-1 flex-1 bg-green-500 rounded-full" />
                                                <div className="h-1 flex-1 bg-green-500 rounded-full" />
                                                <div className="h-1 flex-1 bg-green-500 rounded-full" />
                                                <div className="h-1 flex-1 bg-green-500 rounded-full" />
                                                <span className="text-[10px] font-bold text-green-500 ml-2">Strong</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">


                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">URL / Website</label>
                                            <div className="flex items-center gap-2">
                                                <Input readOnly value={selectedPassword.website_url || ""} className="bg-secondary/30 h-10" />
                                                <Button variant="outline" size="icon" onClick={() => handleCopy(selectedPassword.website_url || "", "URL")}>
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                </div>
                                <div className="w-full">
                                    {/* OTP Section (Optional) */}
                                    {selectedPassword.encrypted_otp_seed && decryptedValues[selectedPassword.id]?.otp && (
                                        <OTPAuthenticator
                                            secret={decryptedValues[selectedPassword.id].otp || ""}
                                            issuer={selectedPassword.title}
                                            accountName={selectedPassword.username || "Account"}
                                            showQrCode={true}
                                            className="p-4 rounded-xl bg-primary/5 border border-primary/20 w-full"
                                        />
                                    )}
                                </div>

                                {selectedPassword.notes && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Notes</label>
                                        <div className="p-4 rounded-md bg-secondary/30 text-sm whitespace-pre-wrap border border-border/50">
                                            {selectedPassword.notes}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center flex-1 p-12 text-center text-muted-foreground">
                            <Key className="h-12 w-12 opacity-10 mb-4" />
                            <p>Select a password to view details</p>
                        </div>
                    )}
                </Card>
            </div>

            <CreatePasswordDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onCreated={async () => {
                    const { data } = await supabase.from("password_entries").select("*").order("created_at", { ascending: false });
                    if (data) setPasswords(data);
                }}
            />

            <CreatePasswordDialog
                open={isEditDialogOpen}
                onOpenChange={(val) => {
                    setIsEditDialogOpen(val);
                    if (!val) setEntryToEdit(undefined);
                }}
                editEntry={entryToEdit}
                decryptedData={entryToEdit ? decryptedValues[entryToEdit.id] : undefined}
                onCreated={async () => {
                    const { data } = await supabase.from("password_entries").select("*").order("created_at", { ascending: false });
                    if (data) setPasswords(data);
                }}
            />

            <ConfirmDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={handleDelete}
                title="Delete Password Entry"
                description="Are you sure you want to delete this password entry? This action cannot be undone."
                confirmText="Delete Entry"
                loading={deleting}
            />
            <SharePasswordDialog
                open={isShareDialogOpen}
                onOpenChange={setIsShareDialogOpen}
                content={shareContent}
            />
        </div>
    );
}
