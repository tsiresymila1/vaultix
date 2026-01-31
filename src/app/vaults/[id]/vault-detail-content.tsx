"use client";

import AppShell from "@/components/layout/app-shell";
import { AddSecretDialog } from "@/components/shared/add-secret-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ImportEnvDialog } from "@/components/shared/import-env-dialog";
import { ShareSecretDialog } from "@/components/shared/share-secret-dialog";
import { UnlockVaultDialog } from "@/components/shared/unlock-vault-dialog";
import { VaultMembersDialog } from "@/components/shared/vault-members-dialog";
import { VaultSettingsDialog } from "@/components/shared/vault-settings-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/auth-context";
import {
    decryptSecret,
    decryptVaultKeyWithPrivateKey,
    encryptSecret
} from "@/lib/crypto";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
    Activity,
    ChevronLeft,
    Copy,
    Eye,
    EyeOff,
    Key,
    Lock,
    Plus,
    RefreshCw,
    Search,
    Settings,
    Share2,
    Shield,
    Trash2,
    Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Environment, MemberData, Secret, Vault } from "@/types";

interface VaultDetailContentProps {
    params: { id: string };
    initialVault: Vault;
    initialEnvironments: Environment[];
    initialSecrets: Secret[];
    initialMemberData: MemberData | null;
}

export default function VaultDetailContent({
    params,
    initialVault,
    initialEnvironments,
    initialSecrets,
    initialMemberData
}: VaultDetailContentProps) {
    const { id } = params;
    const { user, privateKey, vaultKeys, setVaultKey } = useAuth();
    const [environments, setEnvironments] = useState<Environment[]>(initialEnvironments);
    const [secrets, setSecrets] = useState<Secret[]>(initialSecrets);
    const [vaultName, setVaultName] = useState(initialVault.name);
    const vaultKey = vaultKeys[id] || null;
    const [loading, setLoading] = useState(false);
    const [activeEnv, setActiveEnv] = useState<string | null>(initialEnvironments[0]?.id || null);
    const [showValues, setShowValues] = useState<Record<string, boolean>>({});
    const [decryptedSecrets, setDecryptedSecrets] = useState<Record<string, string>>({});
    const [addSecretOpen, setAddSecretOpen] = useState(false);
    const [importEnvOpen, setImportEnvOpen] = useState(false);
    const [membersOpen, setMembersOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [deleteSecretId, setDeleteSecretId] = useState<string | null>(null);
    const [deleteVaultOpen, setDeleteVaultOpen] = useState(false);
    const [deletingSecret, setDeletingSecret] = useState(false);
    const [deletingVault, setDeletingVault] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [secretsToShare, setSecretsToShare] = useState<Secret[] | null>(null);
    const [selectedSecrets, setSelectedSecrets] = useState<Set<string>>(new Set());
    const [editingSecretId, setEditingSecretId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [editKey, setEditKey] = useState("");
    const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

    const router = useRouter();

    const fetchVaultData = useCallback(async () => {
        try {
            setLoading(true);
            const { data: vaultInfo } = await supabase.from("vaults").select("name").eq("id", id).single();
            if (vaultInfo) setVaultName(vaultInfo.name);

            const { data: envs } = await supabase.from("environments").select("*").eq("vault_id", id).order("name", { ascending: true });
            setEnvironments(envs || []);

            const { data: secData } = await supabase.from("secrets").select("*").eq("vault_id", id).order("created_at", { ascending: false });
            setSecrets(secData || []);
        } catch (error) {
            console.error("Failed to refresh vault data", error);
            toast.error("Failed to refresh vault data");
        } finally {
            setLoading(false);
        }
    }, [id]);

    const [derivingKey, setDerivingKey] = useState(false);

    useEffect(() => {
        if (!user || !privateKey || !initialMemberData || vaultKey) return;

        if (initialMemberData) setUserRole(initialMemberData.role);

        const decryptVK = async () => {
            try {
                setDerivingKey(true);
                const userPublicKey = initialMemberData.users?.public_key;
                if (!userPublicKey) throw new Error("User public key not found");

                const decryptedVK = await decryptVaultKeyWithPrivateKey(
                    initialMemberData.encrypted_vault_key,
                    userPublicKey,
                    privateKey
                );
                setVaultKey(id, decryptedVK);
            } catch (error) {
                console.error("Decryption error:", error);
                toast.error("Failed to decrypt vault key. Check your master key.");
            } finally {
                setDerivingKey(false);
            }
        };

        decryptVK();
    }, [user, privateKey, initialMemberData, vaultKey, id, setVaultKey]);

    const handleAddSecret = async (key: string, value: string) => {
        if (!activeEnv) return;

        try {
            if (!vaultKey) {
                setUnlockDialogOpen(true);
                throw new Error("Vault session is locked. Please unlock it first.");
            }

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

    const handleImportEnv = async (entries: Array<{ key: string; value: string }>) => {
        if (!activeEnv) return;

        try {
            if (!vaultKey) {
                setUnlockDialogOpen(true);
                throw new Error("Vault session is locked. Please unlock it first.");
            }

            // Insert sequentially to keep it simple and avoid rate limits.
            const inserted: Secret[] = [];
            for (const entry of entries) {
                const key = entry.key.trim();
                const value = entry.value;
                if (!key) continue;

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
                inserted.push(data);
            }

            if (inserted.length > 0) {
                setSecrets([...inserted.reverse(), ...secrets]);
                toast.success(`Imported ${inserted.length} secret(s)`);
            } else {
                toast.message("No secrets imported");
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to import .env";
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

    const toggleSelectSecret = (id: string) => {
        const newSelected = new Set(selectedSecrets);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedSecrets(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedSecrets.size === filteredSecrets.length) {
            setSelectedSecrets(new Set());
        } else {
            setSelectedSecrets(new Set(filteredSecrets.map(s => s.id)));
        }
    };

    const handleBulkDelete = async () => {
        setLoading(true);
        try {
            const idsToDelete = Array.from(selectedSecrets);
            const { error } = await supabase
                .from("secrets")
                .delete()
                .in("id", idsToDelete);

            if (error) throw error;

            setSecrets(secrets.filter(s => !selectedSecrets.has(s.id)));
            setSelectedSecrets(new Set());
            toast.success(`Deleted ${idsToDelete.length} secret(s)`);
            setBulkDeleteConfirmOpen(false);
        } catch (error) {
            toast.error("Failed to delete secrets");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSecret = async (secretId: string) => {
        if (!vaultKey) return;
        try {
            setLoading(true);
            const { cipher, nonce } = await encryptSecret(editValue, vaultKey);
            const { error } = await supabase
                .from("secrets")
                .update({
                    key: editKey,
                    encrypted_payload: cipher,
                    nonce
                })
                .eq("id", secretId);

            if (error) throw error;

            setSecrets(secrets.map(s => s.id === secretId ? { ...s, key: editKey, encrypted_payload: cipher, nonce } : s));
            setDecryptedSecrets({ ...decryptedSecrets, [secretId]: editValue });
            setEditingSecretId(null);
            toast.success("Secret updated");
        } catch (error) {
            toast.error("Failed to update secret");
        } finally {
            setLoading(false);
        }
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
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-bold text-foreground">{vaultName || "Loading..."}</h1>
                                    <div className={cn(
                                        "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-widest",
                                        vaultKey
                                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                            : "bg-orange-500/10 border-orange-500/20 text-orange-500"
                                    )}>
                                        {vaultKey ? <Shield className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                                        {vaultKey ? "Unlocked" : "Locked"}
                                    </div>
                                </div>
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

                            {(initialMemberData?.role === 'owner' || initialMemberData?.role === 'moderator') && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSettingsOpen(true)}
                                    className="rounded-md h-9 gap-2"
                                >
                                    <Settings className="h-4 w-4" />
                                    <span>Settings</span>
                                </Button>
                            )}
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
                                    onClick={() => vaultKey ? setAddSecretOpen(true) : setUnlockDialogOpen(true)}
                                    size="sm"
                                    disabled={derivingKey}
                                    className="h-9 gap-2 rounded-md font-semibold"
                                >
                                    {derivingKey ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : (vaultKey ? <Plus className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />)}
                                    {derivingKey ? "Decrypting..." : (vaultKey ? "Add Secret" : "Unlock to Add")}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => vaultKey ? setImportEnvOpen(true) : setUnlockDialogOpen(true)}
                                    disabled={derivingKey}
                                    className="h-9 gap-2 rounded-md font-semibold"
                                >
                                    {vaultKey ? "Import .env" : "Unlock to Import"}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={fetchVaultData}
                                    disabled={loading}
                                    className="h-9 w-9 rounded-md text-muted-foreground"
                                >
                                    <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                                </Button>
                            </div>
                        </div>

                        {selectedSecrets.size > 0 && (
                            <div className="flex items-center justify-between mb-4 p-3 bg-secondary/50 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full">
                                        {selectedSecrets.size} Selected
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/10"
                                        onClick={() => {
                                            const selected = secrets.filter(s => selectedSecrets.has(s.id));
                                            setSecretsToShare(selected);
                                            setShareDialogOpen(true);
                                        }}
                                    >
                                        <Share2 className="h-3.5 w-3.5 mr-2" />
                                        Share Bulk
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs font-bold uppercase tracking-widest text-destructive hover:bg-destructive/10"
                                        onClick={() => setBulkDeleteConfirmOpen(true)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                                        Delete Bulk
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs font-bold uppercase tracking-widest"
                                        onClick={() => setSelectedSecrets(new Set())}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}

                        <Card className="rounded-lg border-border overflow-hidden bg-card">
                            <div className="p-0 overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                                            <TableHead className="w-[50px] py-3 pl-6">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-border bg-secondary"
                                                    checked={selectedSecrets.size > 0 && selectedSecrets.size === filteredSecrets.length}
                                                    onChange={toggleSelectAll}
                                                />
                                            </TableHead>
                                            <TableHead className="text-[10px] font-bold text-muted-foreground py-3 uppercase tracking-widest">Key</TableHead>
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
                                                <TableRow key={secret.id} className={cn(
                                                    "group border-border hover:bg-secondary/20 transition-colors",
                                                    selectedSecrets.has(secret.id) && "bg-secondary/40 hover:bg-secondary/40"
                                                )}>
                                                    <TableCell className="py-4 pl-6">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-border bg-secondary"
                                                            checked={selectedSecrets.has(secret.id)}
                                                            onChange={() => toggleSelectSecret(secret.id)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs font-semibold py-4">
                                                        {editingSecretId === secret.id ? (
                                                            <input
                                                                value={editKey}
                                                                onChange={(e) => setEditKey(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                                                                className="bg-secondary border border-border rounded px-2 py-1 w-full text-xs font-mono"
                                                            />
                                                        ) : (
                                                            secret.key
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="flex items-center gap-2">
                                                            {editingSecretId === secret.id ? (
                                                                <input
                                                                    value={editValue}
                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                    className="bg-secondary border border-border rounded px-2 py-1 w-full text-xs font-mono"
                                                                />
                                                            ) : (
                                                                <>
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
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6 py-4">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {editingSecretId === secret.id ? (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10"
                                                                        onClick={() => handleUpdateSecret(secret.id)}
                                                                        disabled={loading}
                                                                    >
                                                                        Save
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 text-[10px] font-bold uppercase tracking-widest"
                                                                        onClick={() => setEditingSecretId(null)}
                                                                        disabled={loading}
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {showValues[secret.id] && (
                                                                        <>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 rounded-md text-primary hover:bg-primary/10"
                                                                                onClick={() => copyToClipboard(decryptedSecrets[secret.id])}
                                                                            >
                                                                                <Copy className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 rounded-md text-emerald-500 hover:bg-emerald-500/10"
                                                                                onClick={() => {
                                                                                    setEditKey(secret.key);
                                                                                    setEditValue(decryptedSecrets[secret.id]);
                                                                                    setEditingSecretId(secret.id);
                                                                                }}
                                                                            >
                                                                                <Settings className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                        </>
                                                                    )}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                                                                        onClick={() => {
                                                                            setSecretsToShare([secret]);
                                                                            setShareDialogOpen(true);
                                                                        }}
                                                                    >
                                                                        <Share2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                        onClick={() => setDeleteSecretId(secret.id)}
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </>
                                                            )}
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

            <ImportEnvDialog
                open={importEnvOpen}
                onOpenChange={setImportEnvOpen}
                onImport={handleImportEnv}
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

            <ConfirmDialog
                open={bulkDeleteConfirmOpen}
                onOpenChange={setBulkDeleteConfirmOpen}
                onConfirm={handleBulkDelete}
                title="Bulk Delete"
                description={`Are you sure you want to delete ${selectedSecrets.size} secrets? This action cannot be undone.`}
                loading={loading}
            />

            <VaultMembersDialog
                open={membersOpen}
                onOpenChange={setMembersOpen}
                vaultId={id}
                vaultName={vaultName}
                vaultKey={vaultKey}
            />

            <VaultSettingsDialog
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                vaultName={vaultName}
                onUpdateName={handleUpdateVaultName}
                onDeleteVault={() => setDeleteVaultOpen(true)}
                userRole={userRole}
            />

            <UnlockVaultDialog
                open={unlockDialogOpen}
                onOpenChange={setUnlockDialogOpen}
            />

            <ShareSecretDialog
                open={shareDialogOpen}
                onOpenChange={setShareDialogOpen}
                secrets={secretsToShare}
                vaultKey={vaultKey}
                preDecryptedValue={secretsToShare && secretsToShare.length === 1 ? decryptedSecrets[secretsToShare[0].id] : undefined}
            />
        </AppShell>
    );
}