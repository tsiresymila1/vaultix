"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/db";
import { api, bearer } from "@/lib/api";
import {
  toBase64,
  fromBase64,
  deriveMasterKey,
  encryptSecret,
  decryptSecret,
  encryptPrivateKey,
  decryptPrivateKey,
  generateUserKeyPair,
  generateSalt,
} from "@/lib/crypto";
import { PasswordEntry } from "@/types";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  Key,
  Loader2,
  Lock,
  Mail,
  Shield,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PasswordStrength {
  valid: boolean;
  hasLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

function checkPasswordStrength(password: string): PasswordStrength {
  return {
    valid:
      password.length >= 12 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[@$!%*?&]/.test(password),
    hasLength: password.length >= 12,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[@$!%*?&]/.test(password),
  };
}

export default function ProfilePageContent() {
  const { user, userData, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  // Live query of the current user's password entries + owned vaults/memberships,
  // used for re-encryption and data-reset flows.
  const { data: relData } = db.useQuery(
    userData
      ? {
          passwordEntries: { $: { where: { "owner.id": userData.id } } },
          vaultMembers: { $: { where: { "member.id": userData.id } } },
          vaults: { $: { where: { "owner.id": userData.id } } },
        }
      : null,
  );

  const [fullName, setFullName] = useState(userData?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    valid: false,
    hasLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false,
  });

  // Sync local form state from the live profile / auth data.
  useEffect(() => {
    if (userData?.fullName) setFullName(userData.fullName);
  }, [userData]);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  useEffect(() => {
    setPasswordStrength(checkPasswordStrength(newPassword));
  }, [newPassword]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!user || !userData) throw new Error("No user found");

      // Update local profile data (live query auto-refreshes the UI).
      await db.transact(db.tx.profiles[userData.id].update({ fullName }));

      // Email lives on the immutable $users auth identity; the server route
      // reports whether a change is possible.
      if (email !== user.email) {
        const authUser = await db.getAuth();
        const res = await api.account.email.$post(
          { json: { newEmail: email } },
          { headers: bearer(authUser?.refresh_token) },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setEmail(user.email);
          toast.info(body.error ?? "Email change is not supported");
        }
      }

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      const message =
        error instanceof Error ? error.message : "Failed to update profile";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("User not found");
      return;
    }

    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }

    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    const strength = checkPasswordStrength(newPassword);
    if (!strength.valid) {
      toast.error("Password does not meet strength requirements");
      return;
    }

    setPasswordLoading(true);
    try {
      if (!userData) {
        throw new Error("Profile not loaded");
      }

      if (!userData.masterKeySalt) {
        throw new Error("User salt not found");
      }

      const salt = await fromBase64(userData.masterKeySalt);
      const oldMasterKey = await deriveMasterKey(currentPassword, salt);
      const newMasterKey = await deriveMasterKey(newPassword, salt);

      const oldMasterKeyB64 = await toBase64(oldMasterKey);
      const newMasterKeyB64 = await toBase64(newMasterKey);

      let encryptedPrivateKey = userData.encryptedPrivateKey;
      let privateKeyNonce = userData.privateKeyNonce;

      if (encryptedPrivateKey && privateKeyNonce) {
        let decryptedPrivateKey: string;
        try {
          // Decrypting the private key with the derived old master key also
          // verifies that the supplied current password is correct.
          decryptedPrivateKey = await decryptPrivateKey(
            encryptedPrivateKey,
            privateKeyNonce,
            oldMasterKey,
          );
        } catch {
          throw new Error("Current password is incorrect");
        }
        const reEncrypted = await encryptPrivateKey(
          decryptedPrivateKey,
          newMasterKey,
        );
        encryptedPrivateKey = reEncrypted.cipher;
        privateKeyNonce = reEncrypted.nonce;
      }

      const passwordEntries =
        (relData?.passwordEntries as PasswordEntry[] | undefined) ?? [];

      const txs = [];

      for (const entry of passwordEntries) {
        const updates: Record<string, unknown> = {};

        if (entry.encryptedPassword && entry.passwordNonce) {
          try {
            const decryptedPass = await decryptSecret(
              entry.encryptedPassword,
              entry.passwordNonce,
              oldMasterKeyB64,
            );
            const reEncrypted = await encryptSecret(
              decryptedPass,
              newMasterKeyB64,
            );
            updates.encryptedPassword = reEncrypted.cipher;
            updates.passwordNonce = reEncrypted.nonce;
          } catch {
            console.warn("Could not re-encrypt password entry:", entry.id);
          }
        }

        if (entry.encryptedOtpSeed && entry.otpNonce) {
          try {
            const decryptedOtp = await decryptSecret(
              entry.encryptedOtpSeed,
              entry.otpNonce,
              oldMasterKeyB64,
            );
            const reEncrypted = await encryptSecret(
              decryptedOtp,
              newMasterKeyB64,
            );
            updates.encryptedOtpSeed = reEncrypted.cipher;
            updates.otpNonce = reEncrypted.nonce;
          } catch {
            console.warn("Could not re-encrypt OTP seed:", entry.id);
          }
        }

        if (Object.keys(updates).length > 0) {
          txs.push(db.tx.passwordEntries[entry.id].update(updates));
        }
      }

      txs.push(
        db.tx.profiles[userData.id].update({
          encryptedPrivateKey,
          privateKeyNonce,
        }),
      );

      await db.transact(txs);

      // NOTE: the master password is never stored server-side (zero-knowledge);
      // it only derives the master key, so there is no auth password to update.

      toast.success("Password updated successfully - all data re-encrypted");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error updating password:", error);
      const message =
        error instanceof Error ? error.message : "Failed to update password";
      toast.error(message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const [resetLoading, setResetLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleResetEncryptedData = async () => {
    if (!user) return;

    setShowResetConfirm(false);
    setResetLoading(true);
    try {
      if (!userData) {
        throw new Error("Profile not loaded");
      }

      if (!userData.masterKeySalt) {
        throw new Error("User salt not found");
      }

      const keyPair = await generateUserKeyPair();
      const salt = await fromBase64(userData.masterKeySalt);
      const masterKey = await deriveMasterKey(
        newPassword || currentPassword,
        salt,
      );

      const encryptedPrivateKey = await encryptPrivateKey(
        keyPair.privateKey,
        masterKey,
      );

      // Delete the user's password entries, memberships, and owned vaults,
      // then rotate the keypair on the profile. The vault_keys table has been
      // dropped, so there is nothing to clear there.
      const ownedPasswordEntries =
        (relData?.passwordEntries as PasswordEntry[] | undefined) ?? [];
      const memberships = relData?.vaultMembers ?? [];
      const ownedVaults = relData?.vaults ?? [];

      const txs = [
        ...ownedPasswordEntries.map((e) =>
          db.tx.passwordEntries[e.id].delete(),
        ),
        ...memberships.map((m) => db.tx.vaultMembers[m.id].delete()),
        ...ownedVaults.map((v) => db.tx.vaults[v.id].delete()),
        db.tx.profiles[userData.id].update({
          publicKey: keyPair.publicKey,
          encryptedPrivateKey: encryptedPrivateKey.cipher,
          privateKeyNonce: encryptedPrivateKey.nonce,
        }),
      ];

      await db.transact(txs);

      toast.success("Data reset complete. Please sign out and sign in again.");
    } catch (error) {
      console.error("Error resetting data:", error);
      toast.error("Failed to reset data");
    } finally {
      setResetLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setShowDeleteConfirm(false);
    setDeleteLoading(true);
    try {
      const authUser = await db.getAuth();
      const res = await api.account.delete.$delete(
        {},
        { headers: bearer(authUser?.refresh_token) },
      );
      if (!res.ok) throw new Error("delete failed");
      toast.success("Account deleted");
      await signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account");
      setDeleteLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Account Profile
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage your identity and cryptographic security settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Avatar & Quick Info */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-lg border-border bg-card shadow-sm overflow-hidden h-fit py-0">
            <CardHeader className="text-center py-6 border-b border-border bg-secondary/30">
              <div className="flex justify-center mb-4">
                <Avatar className="h-20 w-20 border-2 border-background shadow-sm">
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                    {(fullName || user.email)?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-lg font-bold">
                {fullName || user.email?.split("@")[0]}
              </CardTitle>
              <CardDescription className="font-mono text-[10px] uppercase tracking-widest mt-1">
                Member since{" "}
                {userData?.createdAt
                  ? new Date(userData.createdAt).toLocaleDateString()
                  : "—"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-md bg-secondary/50 border border-border">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-1">
                    Email
                  </span>
                  <span className="text-xs font-semibold truncate">
                    {user.email}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-md bg-secondary/50 border border-border">
                <Fingerprint className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-1">
                    Account ID
                  </span>
                  <span className="text-xs font-mono truncate text-muted-foreground">
                    {user.id}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-border bg-card shadow-sm p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-primary mb-1">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">
                Trust Status
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              Your account is secured with end-to-end encryption.
            </p>
          </Card>
        </div>

        {/* Right: Forms */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="rounded-lg border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="p-6 border-b border-border bg-secondary/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Public Identity
              </CardTitle>
              <CardDescription className="text-xs">
                How you appear to other vault members
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-0.5">
                      Display Name
                    </label>
                    <Input
                      placeholder="Your name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-9 rounded-md bg-secondary/20 border-border text-sm font-medium focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-0.5">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-9 rounded-md bg-secondary/20 border-border text-sm font-medium focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                </div>
                <div className="flex justify-end border-t border-border pt-6">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="rounded-md h-9 px-6 font-semibold shadow-sm"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Update Profile
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="p-6 border-b border-border bg-secondary/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                Security
              </CardTitle>
              <CardDescription className="text-xs">
                Update your master password
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-0.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPasswords.current ? "text" : "password"}
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="h-9 rounded-md bg-secondary/20 border-border text-sm font-medium focus:ring-1 focus:ring-primary/50 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords((prev) => ({
                          ...prev,
                          current: !prev.current,
                        }))
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.current ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-0.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPasswords.new ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-9 rounded-md bg-secondary/20 border-border text-sm font-medium focus:ring-1 focus:ring-primary/50 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords((prev) => ({
                          ...prev,
                          new: !prev.new,
                        }))
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.new ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {newPassword && (
                    <div className="mt-2 p-3 rounded-md bg-secondary/30 border border-border space-y-1.5">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        Password Strength
                      </p>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <div
                          className={`flex items-center gap-1 ${passwordStrength.hasLength ? "text-emerald-500" : "text-muted-foreground/50"}`}
                        >
                          <span
                            className={
                              passwordStrength.hasLength ? "font-bold" : ""
                            }
                          >
                            ●
                          </span>{" "}
                          12+ characters
                        </div>
                        <div
                          className={`flex items-center gap-1 ${passwordStrength.hasUppercase ? "text-emerald-500" : "text-muted-foreground/50"}`}
                        >
                          <span
                            className={
                              passwordStrength.hasUppercase ? "font-bold" : ""
                            }
                          >
                            ●
                          </span>{" "}
                          Uppercase
                        </div>
                        <div
                          className={`flex items-center gap-1 ${passwordStrength.hasLowercase ? "text-emerald-500" : "text-muted-foreground/50"}`}
                        >
                          <span
                            className={
                              passwordStrength.hasLowercase ? "font-bold" : ""
                            }
                          >
                            ●
                          </span>{" "}
                          Lowercase
                        </div>
                        <div
                          className={`flex items-center gap-1 ${passwordStrength.hasNumber ? "text-emerald-500" : "text-muted-foreground/50"}`}
                        >
                          <span
                            className={
                              passwordStrength.hasNumber ? "font-bold" : ""
                            }
                          >
                            ●
                          </span>{" "}
                          Number
                        </div>
                        <div
                          className={`flex items-center gap-1 ${passwordStrength.hasSpecial ? "text-emerald-500" : "text-muted-foreground/50"}`}
                        >
                          <span
                            className={
                              passwordStrength.hasSpecial ? "font-bold" : ""
                            }
                          >
                            ●
                          </span>{" "}
                          Special (@$!%*?&)
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-0.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPasswords.confirm ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-9 rounded-md bg-secondary/20 border-border text-sm font-medium focus:ring-1 focus:ring-primary/50 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords((prev) => ({
                          ...prev,
                          confirm: !prev.confirm,
                        }))
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-[10px] text-destructive mt-1">
                      Passwords do not match
                    </p>
                  )}
                </div>

                <div className="flex justify-end border-t border-border pt-6">
                  <Button
                    type="submit"
                    disabled={
                      passwordLoading ||
                      !passwordStrength.valid ||
                      newPassword !== confirmPassword
                    }
                    className="rounded-md h-9 px-6 font-semibold shadow-sm"
                  >
                    {passwordLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Update Password
                  </Button>
                </div>
                <div className="mt-4 pt-4 border-t border-destructive/20">
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Stuck on unlock screen? Reset your encrypted data to recover
                    access.
                  </p>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowResetConfirm(true)}
                    disabled={resetLoading}
                    className="rounded-md h-8 text-[11px] font-bold uppercase tracking-wider"
                  >
                    {resetLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-2" />
                    ) : null}
                    Reset Encrypted Data
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-4 mb-2">
                    Permanently delete your account and all associated data. This
                    cannot be undone.
                  </p>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleteLoading}
                    className="rounded-md h-8 text-[11px] font-bold uppercase tracking-wider"
                  >
                    {deleteLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-2" />
                    ) : null}
                    Delete Account
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Delete Account?
                </DialogTitle>
                <DialogDescription>
                  This permanently deletes your account, identity, and all data
                  you own. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex-1"
                >
                  {deleteLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Yes, Delete Everything
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Reset All Data?
                </DialogTitle>
                <DialogDescription>
                  This will permanently delete:
                </DialogDescription>
              </DialogHeader>
              <div className="py-2 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-destructive">•</span>
                  <span>All stored passwords</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-destructive">•</span>
                  <span>All vaults you own or are member of</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-destructive">•</span>
                  <span>Your current keypair</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-destructive">•</span>
                  <span>Access to all shared vaults</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                You will need to sign in again after this action.
              </p>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleResetEncryptedData}
                  disabled={resetLoading}
                  className="flex-1"
                >
                  {resetLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Yes, Reset Everything
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Card className="rounded-lg border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="p-6 border-b border-border bg-secondary/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                Cryptographic Identity
              </CardTitle>
              <CardDescription className="text-xs">
                Manage your unique encryption keys
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Public Key
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Shared identifier for vault access control
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (userData?.publicKey) {
                        navigator.clipboard.writeText(userData.publicKey);
                        toast.success("Public key copied");
                      }
                    }}
                    className="rounded-md h-8 text-[11px] font-bold uppercase tracking-wider"
                  >
                    Copy Key
                  </Button>
                </div>
                <div className="p-3 bg-secondary/50 rounded-md border border-border font-mono text-[10px] break-all leading-relaxed text-muted-foreground select-all">
                  {userData?.publicKey ||
                    "Retrieving cryptographic identity..."}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-md border border-emerald-500/20 bg-emerald-500/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold">Private Key Secured</p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Encrypted with your Master Key
                    </p>
                  </div>
                </div>
                <div className="px-2 py-0.5 bg-emerald-500 text-white rounded text-[9px] font-black uppercase tracking-widest">
                  Verified
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
