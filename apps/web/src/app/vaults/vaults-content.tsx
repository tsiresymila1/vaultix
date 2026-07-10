"use client";

import AppShell from "@/components/layout/app-shell";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CreateVaultDialog } from "@/components/shared/create-vault-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { api, bearer } from "@/lib/api";
import { encryptVaultKeyForUser, generateVaultKey } from "@/lib/crypto";
import { db } from "@/lib/db";
import { Globe, Plus, Shield, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Stagger, MotionCard, AnimatePresence } from "@/components/motion";

export default function VaultsPageContent() {
  const { user, userData, setVaultKey } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteVaultId, setDeleteVaultId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const { data, isLoading } = db.useQuery({
    vaults: { owner: {}, $: { order: { createdAt: "desc" } } },
  });
  const vaults = data?.vaults ?? [];

  const handleCreateVault = async (name: string) => {
    try {
      // The profile normally comes from the live query, but it can still be
      // loading right after unlock — fall back to a one-shot fetch so creation
      // never fails on a race.
      let profile = userData;
      if (!profile && user) {
        const { data: p } = await db.queryOnce({
          profiles: { $: { where: { "$user.id": user.id } } },
        });
        profile = (p.profiles?.[0] as typeof userData) ?? null;
      }
      if (!profile) {
        throw new Error("Profile not ready yet — try again in a moment.");
      }

      // Crypto stays client-side: the server never sees the raw vault key.
      const vaultKey = await generateVaultKey();
      const encryptedVaultKey = await encryptVaultKeyForUser(
        vaultKey,
        profile.publicKey,
      );

      const authUser = await db.getAuth();
      const res = await api.vaults.$post(
        { json: { name, encryptedVaultKey } },
        { headers: bearer(authUser?.refresh_token) },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(
          typeof body.error === "string" ? body.error : "Failed to create vault",
        );
      }
      const { vaultId } = await res.json();

      setVaultKey(vaultId, vaultKey);

      toast.success("Vault created successfully!");
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Failed to create vault";
      toast.error(message);
      throw error;
    }
  };

  const handleDeleteVault = async () => {
    if (!deleteVaultId) return;
    setDeleting(true);
    try {
      const authUser = await db.getAuth();
      const res = await api.vaults.$delete(
        { json: { vaultId: deleteVaultId } },
        { headers: bearer(authUser?.refresh_token) },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(
          typeof body.error === "string" ? body.error : "Failed to delete vault",
        );
      }
      toast.success("Vault deleted successfully");
      setDeleteVaultId(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete vault";
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Vaults
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {"Secure containers for your team's environments and secrets"}.
            </p>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            disabled={!userData}
            className="rounded-md h-10 px-6 font-semibold text-muted"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Vault
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 rounded-lg border border-border bg-card animate-pulse"
              />
            ))}
          </div>
        ) : (
          <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
            {vaults.map((vault) => (
              <MotionCard key={vault.id} layout className="flex">
              <Card
                className="group relative w-full border-border bg-card hover:border-primary/50 transition-colors duration-200 rounded-lg cursor-pointer flex flex-col"
                onClick={() => router.push(`/vaults/${vault.id}`)}
              >
                <CardHeader className="pb-6 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Shield className="h-5 w-5" />
                    </div>
                    {vault.owner?.id === userData?.id && (
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
                    )}
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                      {vault.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(vault.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-0">
                  <div className="flex gap-2">
                    {["DEV", "STAGE", "PROD"].map((env) => (
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
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Access
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      vault.owner?.id === userData?.id
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                  >
                    {vault.owner?.id === userData?.id ? "Owner" : "Member"}
                  </span>
                </div>
              </Card>
              </MotionCard>
            ))}
            </AnimatePresence>
            {vaults.length === 0 && (
              <div className="col-span-full py-20 text-center rounded-lg border-2 border-dashed border-border bg-secondary/10">
                <div className="w-12 h-12 bg-secondary rounded-md flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  No vaults yet
                </h3>
                <p className="text-sm text-muted-foreground mt-1 mb-6">
                  Create a vault to start storing secrets.
                </p>
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  disabled={!userData}
                  variant="outline"
                  className="rounded-md"
                >
                  Get Started
                </Button>
              </div>
            )}
          </Stagger>
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
