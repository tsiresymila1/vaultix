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
  AlertTriangle,
  CheckCircle2,
  Fingerprint,
  Key,
  Loader2,
  Mail,
  Shield,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function ProfilePageContent() {
  const { user, userData, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState(userData?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");

  // Sync local form state from the live profile / auth data.
  useEffect(() => {
    if (userData?.fullName) setFullName(userData.fullName);
  }, [userData]);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

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

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
              Your identity keypair secures your vaults and shared passwords.
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
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Danger Zone
              </CardTitle>
              <CardDescription className="text-xs">
                Irreversible account actions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-[10px] text-muted-foreground mb-2">
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
