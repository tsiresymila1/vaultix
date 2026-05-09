"use client";

import { useAuth } from "@/context/auth-context";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, Lock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  deriveMasterKey,
  decryptPrivateKey,
  fromBase64,
  generateUserKeyPair,
  toBase64,
  encryptPrivateKey,
} from "@/lib/crypto";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function VaultUnlock() {
  const { user, userData, masterKey, setKeys, signOut } = useAuth();
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const handleOpenResetConfirm = () => setShowResetConfirm(true);
  const handleCloseResetConfirm = () => setShowResetConfirm(false);

  // Only show on protected routes where encryption is needed
  // Skip home page, login, register, share (public part)
  const isPublicPage =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/cli") ||
    pathname.startsWith("/share/");

  useEffect(() => {
    if (user && userData && !masterKey && !isPublicPage) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [user, userData, masterKey, isPublicPage]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;

    setLoading(true);
    try {
      const salt = await fromBase64(userData.master_key_salt);
      const derivedKey = await deriveMasterKey(password, salt);

      const privateKey = await decryptPrivateKey(
        userData.encrypted_private_key,
        userData.private_key_nonce,
        derivedKey,
      );

      setKeys(derivedKey, privateKey);
      setIsOpen(false);
      setPassword("");
      toast.success("Vault unlocked");
    } catch (err) {
      console.error(err);
      toast.error("Invalid master password");
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = async () => {
    if (!user || !userData) return;

    setShowResetConfirm(false);
    setResetLoading(true);
    try {
      // Delete all password entries
      await supabase.from("password_entries").delete().eq("user_id", user.id);

      // Delete all vault memberships (vault_members where user_id = user.id)
      await supabase.from("vault_members").delete().eq("user_id", user.id);

      // Delete all vaults owned by this user
      await supabase.from("vaults").delete().eq("owner_id", user.id);

      // Delete any vault keys for this user
      await supabase.from("vault_keys").delete().eq("user_id", user.id);

      // Generate new keypair
      const keyPair = await generateUserKeyPair();
      const salt = await fromBase64(userData.master_key_salt);
      const masterKey = await deriveMasterKey(password, salt);
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

      toast.success("Data reset! Sign out and sign in again.");
      setIsOpen(false);
      await signOut();
    } catch (err) {
      console.error(err);
      toast.error("Reset failed");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          // Prevent closing if we are on a protected page and not unlocked
          if (!open && !masterKey && !isPublicPage) return;
          setIsOpen(open);
        }}
      >
        <DialogContent
          className="sm:max-w-md bg-background/95 backdrop-blur-xl border-primary/20 shadow-2xl"
          showCloseButton={false}
        >
          <DialogHeader className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <DialogTitle className="text-2xl font-bold tracking-tight">
                Unlock Vault
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Enter your master password to restore your encryption session.
              </DialogDescription>
            </div>
          </DialogHeader>

          <form onSubmit={handleUnlock} className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Master Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 text-center text-lg tracking-[0.2em] font-mono focus-visible:ring-primary/50"
                autoFocus
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={loading || !password}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Shield className="w-5 h-5 mr-2" />
              )}
              {loading ? "Unlocking..." : "Unlock Vault"}
            </Button>
          </form>

          <DialogFooter className="flex flex-col gap-2 border-t border-border/50 pt-4">
            <div className="flex flex-col w-full gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => signOut()}
              >
                Switch Account
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={handleOpenResetConfirm}
                disabled={resetLoading || !password}
              >
                {resetLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : null}
                Reset Data
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Can't unlock? Reset data to recover access (deletes passwords)
              </p>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showResetConfirm}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseResetConfirm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Reset All Data?
            </DialogTitle>
            <DialogDescription>This will permanently delete:</DialogDescription>
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
              onClick={handleCloseResetConfirm}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetData}
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
    </>
  );
}
