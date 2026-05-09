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
import { supabase } from "@/lib/supabase";
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
import { UserData, PasswordEntry } from "@/types";
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
import { useCallback, useEffect, useState } from "react";
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

interface ProfilePageContentProps {
  initialUserData: UserData | null;
}

export default function ProfilePageContent({
  initialUserData,
}: ProfilePageContentProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(initialUserData);

  const [fullName, setFullName] = useState(initialUserData?.full_name || "");
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

  const fetchUserData = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      setUserData(data);
      setFullName(data.full_name || "");
      setEmail(user.email || "");
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, [user]);

  useEffect(() => {
    // Redundant fetch on mount skipped due to SSR initialUserData
    if (!initialUserData && user) {
      fetchUserData();
    }
  }, [user, fetchUserData, initialUserData]);

  useEffect(() => {
    setPasswordStrength(checkPasswordStrength(newPassword));
  }, [newPassword]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!user) throw new Error("No user found");

      // Update local profile data
      const { error: profileError } = await supabase
        .from("users")
        .update({ full_name: fullName })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update Auth email if changed (triggers confirmation)
      if (email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({ email });
        if (authError) throw authError;
        toast.info("Validation email sent to new address");
      }

      toast.success("Profile updated successfully");
      fetchUserData();
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
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email || "",
        password: currentPassword,
      });

      if (verifyError) {
        throw new Error("Current password is incorrect");
      }

      const { data: userData } = await supabase
        .from("users")
        .select("master_key_salt, encrypted_private_key, private_key_nonce")
        .eq("id", user.id)
        .single();

      if (!userData?.master_key_salt) {
        throw new Error("User salt not found");
      }

      const salt = await fromBase64(userData.master_key_salt);
      const oldMasterKey = await deriveMasterKey(currentPassword, salt);
      const newMasterKey = await deriveMasterKey(newPassword, salt);

      const oldMasterKeyB64 = await toBase64(oldMasterKey);
      const newMasterKeyB64 = await toBase64(newMasterKey);

      let encryptedPrivateKey = userData.encrypted_private_key;
      let privateKeyNonce = userData.private_key_nonce;

      if (encryptedPrivateKey && privateKeyNonce) {
        const decryptedPrivateKey = await decryptPrivateKey(
          encryptedPrivateKey,
          privateKeyNonce,
          oldMasterKey,
        );
        const reEncrypted = await encryptPrivateKey(
          decryptedPrivateKey,
          newMasterKey,
        );
        encryptedPrivateKey = reEncrypted.cipher;
        privateKeyNonce = reEncrypted.nonce;
      }

      const { data: passwordEntries } = await supabase
        .from("password_entries")
        .select("*")
        .eq("user_id", user.id);

      if (passwordEntries && passwordEntries.length > 0) {
        for (const entry of passwordEntries) {
          const updates: Record<string, unknown> = {};

          if (entry.encrypted_password && entry.password_nonce) {
            try {
              const decryptedPass = await decryptSecret(
                entry.encrypted_password,
                entry.password_nonce,
                oldMasterKeyB64,
              );
              const reEncrypted = await encryptSecret(
                decryptedPass,
                newMasterKeyB64,
              );
              updates.encrypted_password = reEncrypted.cipher;
              updates.password_nonce = reEncrypted.nonce;
            } catch (err) {
              console.warn("Could not re-encrypt password entry:", entry.id);
            }
          }

          if (entry.encrypted_otp_seed && entry.otp_nonce) {
            try {
              const decryptedOtp = await decryptSecret(
                entry.encrypted_otp_seed,
                entry.otp_nonce,
                oldMasterKeyB64,
              );
              const reEncrypted = await encryptSecret(
                decryptedOtp,
                newMasterKeyB64,
              );
              updates.encrypted_otp_seed = reEncrypted.cipher;
              updates.otp_nonce = reEncrypted.nonce;
            } catch (err) {
              console.warn("Could not re-encrypt OTP seed:", entry.id);
            }
          }

          if (Object.keys(updates).length > 0) {
            await supabase
              .from("password_entries")
              .update(updates)
              .eq("id", entry.id);
          }
        }
      }

      await supabase
        .from("users")
        .update({
          encrypted_private_key: encryptedPrivateKey,
          private_key_nonce: privateKeyNonce,
        })
        .eq("id", user.id);

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

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

  const handleResetEncryptedData = async () => {
    if (!user) return;

    setShowResetConfirm(false);
    setResetLoading(true);
    try {
      await supabase.from("password_entries").delete().eq("user_id", user.id);
      await supabase.from("vault_members").delete().eq("user_id", user.id);
      await supabase.from("vaults").delete().eq("owner_id", user.id);
      await supabase.from("vault_keys").delete().eq("user_id", user.id);

      const { data: userData } = await supabase
        .from("users")
        .select("master_key_salt")
        .eq("id", user.id)
        .single();

      if (!userData?.master_key_salt) {
        throw new Error("User salt not found");
      }

      const keyPair = await generateUserKeyPair();
      const salt = await fromBase64(userData.master_key_salt);
      const masterKey = await deriveMasterKey(
        newPassword || currentPassword,
        salt,
      );
      const masterKeyB64 = await toBase64(masterKey);

      const encryptedPrivateKey = await encryptPrivateKey(
        keyPair.privateKey,
        masterKey,
      );

      await supabase
        .from("users")
        .update({
          public_key: keyPair.publicKey,
          encrypted_private_key: encryptedPrivateKey.cipher,
          private_key_nonce: encryptedPrivateKey.nonce,
        })
        .eq("id", user.id);

      toast.success("Data reset complete. Please sign out and sign in again.");
    } catch (error) {
      console.error("Error resetting data:", error);
      toast.error("Failed to reset data");
    } finally {
      setResetLoading(false);
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
                Member since {new Date(user.created_at).toLocaleDateString()}
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
                </div>
              </form>
            </CardContent>
          </Card>

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
                      if (userData?.public_key) {
                        navigator.clipboard.writeText(userData.public_key);
                        toast.success("Public key copied");
                      }
                    }}
                    className="rounded-md h-8 text-[11px] font-bold uppercase tracking-wider"
                  >
                    Copy Key
                  </Button>
                </div>
                <div className="p-3 bg-secondary/50 rounded-md border border-border font-mono text-[10px] break-all leading-relaxed text-muted-foreground select-all">
                  {userData?.public_key ||
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
