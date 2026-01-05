"use client";

import AppShell from "@/components/layout/app-shell";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CreateVaultDialog } from "@/components/shared/create-vault-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { encryptVaultKeyForUser, generateVaultKey } from "@/lib/crypto";
import { supabase } from "@/lib/supabase";
import { Globe, Plus, Shield, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Vault {
    id: string;
    name: string;
    created_at: string;
}

export default function VaultsPage() {
    const { user } = useAuth();
    const [vaults, setVaults] = useState<Vault[]>([]);
    const [loading, setLoading] = useState(true);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [deleteVaultId, setDeleteVaultId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const router = useRouter();

    const fetchVaults = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("vaults")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setVaults(data || []);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to fetch vaults";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!user) {
            router.push("/login");
            return;
        }
        fetchVaults();
    }, [user, router, fetchVaults]);

    const handleCreateVault = async (name: string) => {
        try {
            const vaultKey = await generateVaultKey();
            const { data: vault, error: vaultError } = await supabase
                .from("vaults")
                .insert({ name, owner_id: user?.id })
                .select()
                .single();

            if (vaultError) throw vaultError;

            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("public_key")
                .eq("id", user?.id)
                .single();

            if (userError) throw userError;

            const encryptedVaultKey = await encryptVaultKeyForUser(vaultKey, userData.public_key);

            const { error: memberError } = await supabase
                .from("vault_members")
                .insert({
                    vault_id: vault.id,
                    user_id: user?.id,
                    role: "owner",
                    encrypted_vault_key: encryptedVaultKey,
                });

            if (memberError) throw memberError;

            await supabase.from("environments").insert([
                { vault_id: vault.id, name: "Development" },
                { vault_id: vault.id, name: "Staging" },
                { vault_id: vault.id, name: "Production" },
            ]);

            toast.success("Vault created successfully!");
            fetchVaults();
        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : "Failed to create vault";
            toast.error(message);
            throw error;
        }
    };

    const handleDeleteVault = async () => {
        if (!deleteVaultId) return;
        setDeleting(true);
        try {
            const { error } = await supabase
                .from("vaults")
                .delete()
                .eq("id", deleteVaultId);

            if (error) throw error;
            toast.success("Vault deleted successfully");
            setVaults(vaults.filter(v => v.id !== deleteVaultId));
            setDeleteVaultId(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to delete vault";
            toast.error(message);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <AppShell>
            <div className="space-y-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Vaults</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {"Secure containers for your team's environments and secrets"}.
                        </p>
                    </div>
                    <Button
                        onClick={() => setCreateDialogOpen(true)}
                        className="rounded-md h-10 px-6 font-semibold text-muted"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Vault
                    </Button>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-48 rounded-lg border border-border bg-card animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {vaults.map((vault) => (
                            <Card
                                key={vault.id}
                                className="group relative border-border bg-card hover:border-primary/50 transition-all duration-200 rounded-lg cursor-pointer flex flex-col"
                                onClick={() => router.push(`/vaults/${vault.id}`)}
                            >
                                <CardHeader className="p-6 flex-1">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <Shield className="h-5 w-5" />
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-md hover:bg-destructive/10 hover:text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteVaultId(vault.id);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                                            {vault.name}
                                        </CardTitle>
                                        <p className="text-xs text-muted-foreground">
                                            Created {new Date(vault.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </CardHeader>
                                <CardContent className="px-6 pb-6 pt-0">
                                    <div className="flex gap-2">
                                        {["DEV", "PROD"].map((env) => (
                                            <span
                                                key={env}
                                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary text-muted-foreground uppercase"
                                            >
                                                {env}
                                            </span>
                                        ))}
                                    </div>
                                </CardContent>
                                <div className="px-6 py-3 border-t border-border bg-secondary/10 flex items-center justify-between rounded-b-lg">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Access</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Owner</span>
                                </div>
                            </Card>
                        ))}
                        {vaults.length === 0 && (
                            <div className="col-span-full py-20 text-center rounded-lg border-2 border-dashed border-border bg-secondary/10">
                                <div className="w-12 h-12 bg-secondary rounded-md flex items-center justify-center mx-auto mb-4">
                                    <Globe className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground">No vaults yet</h3>
                                <p className="text-sm text-muted-foreground mt-1 mb-6">Create a vault to start storing secrets.</p>
                                <Button
                                    onClick={() => setCreateDialogOpen(true)}
                                    variant="outline"
                                    className="rounded-md"
                                >
                                    Get Started
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <CreateVaultDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onCreate={handleCreateVault}
            />

            <ConfirmDialog
                open={!!deleteVaultId}
                onOpenChange={(open) => !open && setDeleteVaultId(null)}
                onConfirm={handleDeleteVault}
                title="Delete Vault"
                description="Are you sure you want to delete this vault? This action cannot be undone."
                loading={deleting}
            />
        </AppShell>
    );
}

