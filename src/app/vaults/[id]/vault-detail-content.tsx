"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
    Plus,
    Eye,
    EyeOff,
    Copy,
    Trash2,
    Settings,
    Users,
    ChevronLeft,
    Lock,
    Key,
    Activity,
    Search,
    RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import {
    decryptVaultKeyWithPrivateKey,
    encryptSecret,
    decryptSecret
} from "@/lib/crypto";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/app-shell";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AddSecretDialog } from "@/components/shared/add-secret-dialog";
import { VaultMembersDialog } from "@/components/shared/vault-members-dialog";
import { VaultSettingsDialog } from "@/components/shared/vault-settings-dialog";
import { cn } from "@/lib/utils";

interface Environment {
    id: string;
    name: string;
}

interface Secret {
    id: string;
    key: string;
    encrypted_payload: string;
    nonce: string;
    environment_id: string;
    created_at: string;
}

interface MemberData {
    encrypted_vault_key: string;
    users: {
        public_key: string;
    } | null;
}

export default function VaultDetailContent({ params }: { params: { id: string } }) {
    const { id } = params;
    const { user, privateKey } = useAuth();
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [secrets, setSecrets] = useState<Secret[]>([]);
    const [vaultName, setVaultName] = useState("");
    const [vaultKey, setVaultKeyState] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeEnv, setActiveEnv] = useState<string | null>(null);
    const [showValues, setShowValues] = useState<Record<string, boolean>>({});
    const [decryptedSecrets, setDecryptedSecrets] = useState<Record<string, string>>({});
    const [addSecretOpen, setAddSecretOpen] = useState(false);
    const [membersOpen, setMembersOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [deleteSecretId, setDeleteSecretId] = useState<string | null>(null);
    const [deleteVaultOpen, setDeleteVaultOpen] = useState(false);
    const [deletingSecret, setDeletingSecret] = useState(false);
    const [deletingVault, setDeletingVault] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const router = useRouter();

    const loadVaultData = useCallback(async () => {
        try {
            setLoading(true);

            // 1. Get vault details
            const { data: vaultInfo } = await supabase
                .from("vaults")
                .select("name")
                .eq("id", id)
                .single();
            if (vaultInfo) setVaultName(vaultInfo.name);

            // 2. Get environments
            const { data: envs } = await supabase
                .from("environments")
                .select("*")
                .eq("vault_id", id)
                .order("name", { ascending: true });

            const sortedEnvs = envs || [];
            setEnvironments(sortedEnvs);
            if (sortedEnvs.length > 0 && !activeEnv) {
                setActiveEnv(sortedEnvs[0].id);
            }

            // 3. Get vault key (decrypted)
            const { data, error: memberError } = await supabase
                .from("vault_members")
                .select("encrypted_vault_key, users(public_key)")
                .eq("vault_id", id)
                .eq("user_id", user?.id)
                .single();

            const memberData = data as unknown as MemberData;

            if (memberError || !memberData || !memberData.users) {
                throw memberError || new Error("User public key not found");
            }

            const userPublicKey = memberData.users.public_key;
            const decryptedVK = await decryptVaultKeyWithPrivateKey(
                memberData.encrypted_vault_key,
                userPublicKey,
                privateKey!
            );
            setVaultKeyState(decryptedVK);

            // 4. Get secrets
            const { data: secData } = await supabase
                .from("secrets")
                .select("*")
                .eq("vault_id", id)
                .order("created_at", { ascending: false });
            setSecrets(secData || []);

        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load vault data";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }, [id, user?.id, privateKey, activeEnv]);

    useEffect(() => {
        if (!user || !privateKey) {
            router.push("/login");
            return;
        }
        loadVaultData();
    }, [user, privateKey, loadVaultData, router]);

    const handleAddSecret = async (key: string, value: string) => {
        if (!activeEnv) return;

        try {
            if (!vaultKey) throw new Error("Vault key not loaded");

            const { cipher, nonce } = await encryptSecret(value, vaultKey);

            const { data, error } = await supabase
                .from("secrets")
                .insert({
                    vault_id: id,
                    environment_id: activeEnv,
                    key,
                    encrypted_payload: cipher,
                    nonce,
                })
                .select()
                .single();

            if (error) throw error;

            setSecrets([data, ...secrets]);
            toast.success("Secret added successfully");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to add secret";
            toast.error(message);
            throw error;
        }
    };

    const handleDeleteSecret = async () => {
        if (!deleteSecretId) return;

        setDeletingSecret(true);
        try {
            const { error } = await supabase
                .from("secrets")
                .delete()
                .eq("id", deleteSecretId);

            if (error) throw error;

            setSecrets(secrets.filter(s => s.id !== deleteSecretId));
            toast.success("Secret deleted");
            setDeleteSecretId(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to delete secret";
            toast.error(message);
        } finally {
            setDeletingSecret(false);
        }
    };

    const toggleSecretValue = async (secret: Secret) => {
        if (showValues[secret.id]) {
            setShowValues({ ...showValues, [secret.id]: false });
            return;
        }

        try {
            if (!vaultKey) throw new Error("Vault key not loaded");
            const decrypted = await decryptSecret(secret.encrypted_payload, secret.nonce, vaultKey);
            setDecryptedSecrets({ ...decryptedSecrets, [secret.id]: decrypted });
            setShowValues({ ...showValues, [secret.id]: true });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to decrypt secret";
            toast.error(message);
        }
    };

    const handleUpdateVaultName = async (newName: string) => {
        try {
            const { error } = await supabase
                .from("vaults")
                .update({ name: newName })
                .eq("id", id);
            if (error) throw error;
            setVaultName(newName);
            toast.success("Vault name updated");
        } catch (error) {
            toast.error("Failed to update vault name");
            throw error;
        }
    };

    const handleDeleteVault = async () => {
        setDeletingVault(true);
        try {
            const { error } = await supabase
                .from("vaults")
                .delete()
                .eq("id", id);
            if (error) throw error;
            toast.success("Vault deleted");
            router.push("/vaults");
        } catch {
            toast.error("Failed to delete vault");
        } finally {
            setDeletingVault(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    const filteredSecrets = secrets.filter(s =>
        s.environment_id === activeEnv &&
        s.key.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AppShell>
            <div className="space-y-8">
                {/* Simplified Header */}
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push("/vaults")}
                                className="rounded-md h-9 w-9 text-muted-foreground hover:bg-secondary"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <h1 className="text-xl font-bold text-foreground">{vaultName || "Loading..."}</h1>
                                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5 font-mono">ID: {id.slice(0, 8)}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setMembersOpen(true)}
                                className="rounded-md h-9 gap-2"
                            >
                                <Users className="h-4 w-4" />
                                <span>Members</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSettingsOpen(true)}
                                className="rounded-md h-9 gap-2"
                            >
                                <Settings className="h-4 w-4" />
                                <span>Settings</span>
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="rounded-lg border-border bg-card shadow-sm">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-md bg-secondary text-primary flex items-center justify-center">
                                    <Key className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Secrets</p>
                                    <p className="text-xl font-bold leading-none">{secrets.length}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-lg border-border bg-card shadow-sm">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-md bg-secondary text-primary flex items-center justify-center">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Encrypted</p>
                                    <p className="text-xl font-bold leading-none">Standard</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-lg border-border bg-card shadow-sm">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-md bg-secondary text-primary flex items-center justify-center">
                                    <Activity className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Status</p>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        <p className="text-sm font-bold text-primary">Connected</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="space-y-6">
                    <Tabs value={activeEnv || ""} onValueChange={setActiveEnv} className="w-full">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                            <TabsList className="bg-secondary rounded-md h-10 p-1">
                                {environments.map((env) => (
                                    <TabsTrigger
                                        key={env.id}
                                        value={env.id}
                                        className="rounded-sm px-4 h-full data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all text-xs font-semibold"
                                    >
                                        {env.name}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            <div className="flex items-center gap-2">
                                <div className="relative group/search flex-1 min-w-[200px]">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Filter keys..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="h-9 w-full bg-secondary/50 border-border rounded-md pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all border"
                                    />
                                </div>
                                <Button
                                    onClick={() => setAddSecretOpen(true)}
                                    size="sm"
                                    className="h-9 gap-2 rounded-md font-semibold"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Secret
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={loadVaultData}
                                    disabled={loading}
                                    className="h-9 w-9 rounded-md text-muted-foreground"
                                >
                                    <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                                </Button>
                            </div>
                        </div>

                        <Card className="rounded-lg border-border overflow-hidden bg-card">
                            <div className="p-0 overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                                            <TableHead className="text-[10px] font-bold text-muted-foreground py-3 pl-6 uppercase tracking-widest">Key</TableHead>
                                            <TableHead className="text-[10px] font-bold text-muted-foreground py-3 uppercase tracking-widest">Value</TableHead>
                                            <TableHead className="text-[10px] font-bold text-muted-foreground py-3 pr-6 text-right uppercase tracking-widest">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSecrets.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="h-40 text-center">
                                                    <div className="flex flex-col items-center gap-2 py-4">
                                                        <Key className="h-8 w-8 text-muted-foreground/30" />
                                                        <p className="text-sm font-semibold text-muted-foreground">No secrets in this environment</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredSecrets.map((secret) => (
                                                <TableRow key={secret.id} className="group border-border hover:bg-secondary/20">
                                                    <TableCell className="font-mono text-xs font-semibold py-4 pl-6">{secret.key}</TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="flex items-center gap-2">
                                                            <code className={cn(
                                                                "px-2 py-1 rounded text-[11px] transition-all",
                                                                showValues[secret.id]
                                                                    ? "bg-primary/10 text-primary font-bold"
                                                                    : "bg-secondary text-muted-foreground/50 select-none font-mono"
                                                            )}>
                                                                {showValues[secret.id]
                                                                    ? (decryptedSecrets[secret.id] || "Loading...")
                                                                    : "••••••••••••••••••••"}
                                                            </code>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 rounded-md hover:bg-secondary"
                                                                onClick={() => toggleSecretValue(secret)}
                                                            >
                                                                {showValues[secret.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6 py-4">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {showValues[secret.id] && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-md text-primary hover:bg-primary/10"
                                                                    onClick={() => copyToClipboard(decryptedSecrets[secret.id])}
                                                                >
                                                                    <Copy className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                onClick={() => setDeleteSecretId(secret.id)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    </Tabs>
                </div>
            </div>

            <AddSecretDialog
                open={addSecretOpen}
                onOpenChange={setAddSecretOpen}
                onAdd={handleAddSecret}
                environmentName={environments.find(e => e.id === activeEnv)?.name || ""}
            />

            <ConfirmDialog
                open={!!deleteSecretId}
                onOpenChange={(open) => !open && setDeleteSecretId(null)}
                onConfirm={handleDeleteSecret}
                title="Delete Secret"
                description="This secret will be permanently removed. This action cannot be undone."
                loading={deletingSecret}
            />

            <ConfirmDialog
                open={deleteVaultOpen}
                onOpenChange={setDeleteVaultOpen}
                onConfirm={handleDeleteVault}
                title="Delete Vault"
                description={`Permanently delete "${vaultName}" and all its contents?`}
                loading={deletingVault}
            />

            <VaultMembersDialog
                open={membersOpen}
                onOpenChange={setMembersOpen}
                vaultId={id}
                vaultName={vaultName}
            />

            <VaultSettingsDialog
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                vaultName={vaultName}
                onUpdateName={handleUpdateVaultName}
                onDeleteVault={() => setDeleteVaultOpen(true)}
            />
        </AppShell>
    );
}

