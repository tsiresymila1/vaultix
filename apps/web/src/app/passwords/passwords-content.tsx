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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import {
  PasswordVaultProvider,
  usePasswordVault,
} from "@/context/password-vault";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { Stagger, RevealItem, AnimatePresence } from "@/components/motion";
import {
  Copy,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  Lock,
  MoreVertical,
  Plus,
  Search,
  Shield,
  Trash2,
  Unlock,
  Users,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PasswordEntry } from "@/types";

export default function PasswordsPageContent() {
  return (
    <PasswordVaultProvider>
      <PasswordsVaultGate />
    </PasswordVaultProvider>
  );
}

// Master-password gate: set up a master password on first use, unlock it every
// session, then render the real password manager once the PW private key is in
// memory.
function PasswordsVaultGate() {
  const { needsSetup, unlocked } = usePasswordVault();

  if (needsSetup) return <MasterPasswordSetup />;
  if (!unlocked) return <MasterPasswordUnlock />;
  return <PasswordsManager />;
}

function MasterPasswordSetup() {
  const { setup } = usePasswordVault();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Use at least 8 characters for your master password.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await setup(password);
      toast.success("Password vault created.");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to create password vault.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center min-h-[calc(100vh-12rem)]">
      <Card className="w-full max-w-md border-border bg-card shadow-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">
            Create a master password for your password vault
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            This password encrypts your credentials end-to-end. We never see it,
            and it cannot be recovered — store it safely.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="master-password">Master password</Label>
              <Input
                id="master-password"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="master-password-confirm">Confirm password</Label>
              <Input
                id="master-password-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your master password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <Lock className="mr-2 h-4 w-4" />
              {loading ? "Creating..." : "Create password vault"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function MasterPasswordUnlock() {
  const { unlock } = usePasswordVault();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    try {
      await unlock(password);
    } catch {
      toast.error("Incorrect master password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center min-h-[calc(100vh-12rem)]">
      <Card className="w-full max-w-md border-border bg-card shadow-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Unlock your password vault</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your master password to decrypt your credentials.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unlock-password">Master password</Label>
              <Input
                id="unlock-password"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your master password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <Unlock className="mr-2 h-4 w-4" />
              {loading ? "Unlocking..." : "Unlock"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function PasswordsManager() {
  const { userData } = useAuth();
  const { pwPrivateKey, pwPublicKey } = usePasswordVault();
  const { data } = db.useQuery(
    userData
      ? {
          passwordEntries: {
            $: {
              where: { "owner.id": userData.id },
              order: { createdAt: "desc" },
            },
          },
        }
      : null,
  );
  const passwords = useMemo(
    () => (data?.passwordEntries as PasswordEntry[] | undefined) ?? [],
    [data?.passwordEntries],
  );

  // Passwords shared with me by other users.
  const { data: sharesData } = db.useQuery(
    userData
      ? {
          passwordShares: {
            $: { where: { "recipient.id": userData.id }, order: { createdAt: "desc" } },
            entry: {},
            sharedBy: { $user: {} },
          },
        }
      : null,
  );
  // A `has: one` nested link may arrive as an object or single-element array.
  const receivedShares = (sharesData?.passwordShares ?? []).map((s) => {
    const sharedBy = Array.isArray(s.sharedBy) ? s.sharedBy[0] : s.sharedBy;
    const by = sharedBy?.$user;
    return {
      ...s,
      entry: Array.isArray(s.entry) ? s.entry[0] : s.entry,
      sharedByEmail: (Array.isArray(by) ? by[0] : by)?.email ?? null,
    };
  });

  const copySharedPassword = async (share: {
    encryptedKey: string;
    entry?: { encryptedPassword: string; passwordNonce: string } | null;
  }) => {
    if (!pwPrivateKey || !pwPublicKey) {
      toast.error("Unlock your vault first.");
      return;
    }
    if (!share.entry) {
      toast.error("This share is no longer available.");
      return;
    }
    try {
      const { decryptVaultKeyWithPrivateKey, decryptSecret } = await import("@/lib/crypto");
      // Envelope: unseal the entry key, then decrypt the live entry content.
      const entryKey = await decryptVaultKeyWithPrivateKey(
        share.encryptedKey,
        pwPublicKey,
        pwPrivateKey,
      );
      const pass = await decryptSecret(
        share.entry.encryptedPassword,
        share.entry.passwordNonce,
        entryKey,
      );
      await navigator.clipboard.writeText(pass);
      toast.success("Shared password copied");
    } catch {
      toast.error("Could not decrypt shared password.");
    }
  };

  // Recipient reveal: shared entries are read-only. Toggling open decrypts the
  // live entry content (owner is not us, so no edit path is offered).
  const [revealedShares, setRevealedShares] = useState<Record<string, boolean>>(
    {},
  );
  const [sharedDecrypted, setSharedDecrypted] = useState<
    Record<string, string>
  >({});
  const [sharedPassVisible, setSharedPassVisible] = useState<
    Record<string, boolean>
  >({});

  const revealSharedPassword = async (share: {
    id: string;
    encryptedKey: string;
    entry?: { encryptedPassword: string; passwordNonce: string } | null;
  }) => {
    const willOpen = !revealedShares[share.id];
    setRevealedShares((prev) => ({ ...prev, [share.id]: willOpen }));
    if (!willOpen || sharedDecrypted[share.id]) return;
    if (!pwPrivateKey || !pwPublicKey) {
      toast.error("Unlock your vault first.");
      return;
    }
    if (!share.entry) {
      toast.error("This share is no longer available.");
      return;
    }
    try {
      const { decryptVaultKeyWithPrivateKey, decryptSecret } = await import("@/lib/crypto");
      const entryKey = await decryptVaultKeyWithPrivateKey(
        share.encryptedKey,
        pwPublicKey,
        pwPrivateKey,
      );
      const pass = await decryptSecret(
        share.entry.encryptedPassword,
        share.entry.passwordNonce,
        entryKey,
      );
      setSharedDecrypted((prev) => ({ ...prev, [share.id]: pass }));
    } catch {
      toast.error("Could not decrypt shared entry.");
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && passwords.length > 0) {
      setSelectedId(passwords[0].id);
    }
  }, [passwords, selectedId]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareContent, setShareContent] = useState("");
  const [shareEntry, setShareEntry] = useState<{
    id: string;
    ownerEncryptedKey: string;
  } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<PasswordEntry | undefined>(
    undefined,
  );
  const [revealedPasswords, setRevealedPasswords] = useState<
    Record<string, boolean>
  >({});
  const [decryptedValues, setDecryptedValues] = useState<
    Record<string, { pass: string; otp?: string }>
  >({});

  const selectedPassword = passwords.find((p) => p.id === selectedId);

  useEffect(() => {
    if (!selectedId || !pwPrivateKey || !pwPublicKey) return;
    const entry = passwords.find((p) => p.id === selectedId);
    if (!entry) return;

    const decrypt = async () => {
      try {
        const { decryptVaultKeyWithPrivateKey, decryptSecret } = await import("@/lib/crypto");
        // Envelope: unseal the entry key with our private key, then decrypt.
        const entryKey = await decryptVaultKeyWithPrivateKey(
          entry.ownerEncryptedKey,
          pwPublicKey,
          pwPrivateKey,
        );

        const pass = await decryptSecret(
          entry.encryptedPassword,
          entry.passwordNonce,
          entryKey,
        );
        let otp: string | undefined;
        if (entry.encryptedOtpSeed && entry.otpNonce) {
          otp = await decryptSecret(
            entry.encryptedOtpSeed,
            entry.otpNonce,
            entryKey,
          );
        }

        setDecryptedValues((prev) => ({ ...prev, [entry.id]: { pass, otp } }));
      } catch (error) {
        console.error("Decryption failed:", error);
        let message = "Failed to decrypt password entry.";
        if (error instanceof Error) message = error.message;
        else if (
          typeof error === "object" &&
          error !== null &&
          "message" in (error as Record<string, unknown>)
        )
          message = String((error as Record<string, unknown>).message);
        toast.error(message);
      }
    };

    if (!decryptedValues[selectedId]) {
      decrypt();
    }
  }, [selectedId, pwPrivateKey, pwPublicKey, passwords, decryptedValues]);

  const filteredPasswords = passwords.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.websiteUrl?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const toggleReveal = (id: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleShareEntry = () => {
    if (!selectedPassword || !decryptedValues[selectedPassword.id]) {
      toast.error("Please wait for the entry to decrypt first.");
      return;
    }

    const vals = decryptedValues[selectedPassword.id];
    const content = `Title: ${selectedPassword.title}\nURL: ${selectedPassword.websiteUrl || ""}\nUsername: ${selectedPassword.username || ""}\nPassword: ${vals.pass}${vals.otp ? `\nOTP Seed: ${vals.otp}` : ""}`;

    setShareContent(content);
    setShareEntry({
      id: selectedPassword.id,
      ownerEncryptedKey: selectedPassword.ownerEncryptedKey,
    });
    setIsShareDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!idToDelete) return;
    setDeleting(true);
    try {
      await db.transact(db.tx.passwordEntries[idToDelete].delete());
      toast.success("Entry deleted successfully");
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Password Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {"Securely store and manage your organization's credentials."}
          </p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="rounded-md"
        >
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
              <Stagger className="divide-y ">
                <AnimatePresence mode="popLayout" initial={false}>
                {filteredPasswords.map((p) => (
                  <RevealItem
                    key={p.id}
                    layout
                    onClick={() => setSelectedId(p.id)}
                    className={cn(
                      "flex items-center gap-3 p-4 border-l-2 cursor-pointer transition-colors hover:bg-secondary/30",
                      selectedId === p.id
                        ? "bg-secondary/50 border-l-primary"
                        : "border-transparent",
                    )}
                  >
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      {p.websiteUrl ? (
                        <Image
                          src={`https://www.google.com/s2/favicons?domain=${p.websiteUrl}&sz=64`}
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
                      <h3 className="text-sm font-semibold truncate">
                        {p.title}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.username || "No username"}
                      </p>
                    </div>
                  </RevealItem>
                ))}
                </AnimatePresence>
              </Stagger>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Shield className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No passwords found
                </p>
              </div>
            )}

            {receivedShares.length > 0 && (
              <div className="border-t">
                <div className="px-4 py-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  <Users className="w-3 h-3" /> Shared with me
                </div>
                <div className="divide-y">
                  {receivedShares.map((s) => (
                    <div key={s.id}>
                      <div className="flex items-center gap-3 p-4">
                        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Key className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold truncate">
                            {s.entry?.title ?? "Shared entry"}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {s.entry?.username || "No username"} · from{" "}
                            {s.sharedByEmail ?? "someone"}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          title={revealedShares[s.id] ? "Hide details" : "Reveal details"}
                          onClick={() => revealSharedPassword(s)}
                        >
                          {revealedShares[s.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          title="Copy password"
                          onClick={() => copySharedPassword(s)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>

                      {revealedShares[s.id] && (
                        <div className="px-4 pb-4 space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                              Username
                            </label>
                            <Input
                              readOnly
                              value={s.entry?.username || ""}
                              className="bg-secondary/30 h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                              URL / Website
                            </label>
                            <Input
                              readOnly
                              value={s.entry?.websiteUrl || ""}
                              className="bg-secondary/30 h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                              Password
                            </label>
                            <div className="flex items-center gap-2">
                              <Input
                                readOnly
                                type={sharedPassVisible[s.id] ? "text" : "password"}
                                value={sharedDecrypted[s.id] ?? "••••••••••••"}
                                className="bg-secondary/30 font-mono h-9 text-sm"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 shrink-0"
                                onClick={() =>
                                  setSharedPassVisible((prev) => ({
                                    ...prev,
                                    [s.id]: !prev[s.id],
                                  }))
                                }
                              >
                                {sharedPassVisible[s.id] ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
                      {selectedPassword.websiteUrl ? (
                        <Image
                          src={`https://www.google.com/s2/favicons?domain=${selectedPassword.websiteUrl}&sz=128`}
                          alt={selectedPassword.title}
                          fill
                          className="object-contain p-3"
                        />
                      ) : (
                        <Key className="w-8 h-8 text-primary" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-2xl">
                        {selectedPassword.title}
                      </CardTitle>
                      {selectedPassword.websiteUrl && (
                        <a
                          href={
                            selectedPassword.websiteUrl.startsWith("http")
                              ? selectedPassword.websiteUrl
                              : `https://${selectedPassword.websiteUrl}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                        >
                          {selectedPassword.websiteUrl}
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
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setIdToDelete(selectedPassword.id);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
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
                      <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                        Username
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={selectedPassword.username || ""}
                          className="bg-secondary/30 h-10"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            handleCopy(
                              selectedPassword.username || "",
                              "Username",
                            )
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                        Password
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type={
                            revealedPasswords[selectedPassword.id]
                              ? "text"
                              : "password"
                          }
                          readOnly
                          value={
                            decryptedValues[selectedPassword.id]?.pass ||
                            "••••••••••••"
                          }
                          className="bg-secondary/30 font-mono h-10"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleReveal(selectedPassword.id)}
                        >
                          {revealedPasswords[selectedPassword.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            handleCopy(
                              decryptedValues[selectedPassword.id]?.pass || "",
                              "Password",
                            )
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="h-1 flex-1 bg-green-500 rounded-full" />
                        <div className="h-1 flex-1 bg-green-500 rounded-full" />
                        <div className="h-1 flex-1 bg-green-500 rounded-full" />
                        <div className="h-1 flex-1 bg-green-500 rounded-full" />
                        <span className="text-[10px] font-bold text-green-500 ml-2">
                          Strong
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                        URL / Website
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={selectedPassword.websiteUrl || ""}
                          className="bg-secondary/30 h-10"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            handleCopy(
                              selectedPassword.websiteUrl || "",
                              "URL",
                            )
                          }
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-full">
                  {/* OTP Section (Optional) */}
                  {selectedPassword.encryptedOtpSeed &&
                    decryptedValues[selectedPassword.id]?.otp && (
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
                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                      Notes
                    </label>
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
        onCreated={() => {}}
      />

      <CreatePasswordDialog
        open={isEditDialogOpen}
        onOpenChange={(val) => {
          setIsEditDialogOpen(val);
          if (!val) setEntryToEdit(undefined);
        }}
        editEntry={entryToEdit}
        decryptedData={
          entryToEdit ? decryptedValues[entryToEdit.id] : undefined
        }
        onCreated={() => {}}
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
        entry={shareEntry}
      />
    </div>
  );
}
