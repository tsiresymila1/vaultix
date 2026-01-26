"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { sendVaultInvitation } from "@/lib/actions";
import { encryptVaultKeyForUser } from "@/lib/crypto";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { VaultMember } from "@/types";
import { ChevronDown, Loader2, MoreHorizontal, Shield, ShieldCheck, User, UserPlus, Users, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface VaultMembersDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vaultId: string;
    vaultName: string;
    vaultKey: string | null;
}

export function VaultMembersDialog({
    open,
    onOpenChange,
    vaultId,
    vaultName,
    vaultKey,
}: VaultMembersDialogProps) {
    const { user } = useAuth();
    const [members, setMembers] = useState<VaultMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<"moderator" | "member">("member");
    const [inviting, setInviting] = useState(false);

    // Current user's role in this vault
    const myRole = members.find(m => m.user_id === user?.id)?.role;

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("vault_members")
                .select(`
                    *,
                    users (
                        email,
                        public_key
                    )
                `)
                .eq("vault_id", vaultId);

            if (error) throw error;
            setMembers(data || []);
        } catch {
            toast.error("Failed to fetch members");
        } finally {
            setLoading(false);
        }
    }, [vaultId]);

    const handleInvite = async () => {
        if (!vaultKey) {
            toast.error("Vault must be unlocked to invite members");
            return;
        }
        if (!inviteEmail.trim()) {
            toast.error("Please enter an email address");
            return;
        }

        setInviting(true);
        try {
            // 1. Find the user
            const { data, error: userError } = await supabase
                .rpc("search_user_by_email", { search_email: inviteEmail.trim() })
                .single();

            const userData = data as { id: string; email: string; public_key: string } | null;

            if (userError || !userData) {
                toast.error("User not found via email");
                setInviting(false);
                return;
            }

            // Check if already a member
            if (members.some(m => m.user_id === userData.id)) {
                toast.error("User is already a member");
                setInviting(false);
                return;
            }

            // 2. Encrypt vault key for the new member
            const encryptedKey = await encryptVaultKeyForUser(vaultKey, userData.public_key);

            // 3. Add to vault_members
            const { data: newMember, error: insertError } = await supabase
                .from("vault_members")
                .insert({
                    vault_id: vaultId,
                    user_id: userData.id,
                    role: inviteRole,
                    encrypted_vault_key: encryptedKey,
                })
                .select(`
                    *,
                    users (
                        email,
                        public_key
                    )
                `)
                .single();

            if (insertError) throw insertError;
            if (newMember) {
                setMembers([...members, newMember]);
            }
            setInviteEmail("");

            // 4. Send email notification via Server Action
            try {
                await sendVaultInvitation({
                    vaultName,
                    inviteeEmail: userData.email,
                    role: inviteRole,
                    inviterEmail: user?.email,
                });
            } catch (emailErr) {
                console.error("Failed to send invitation email:", emailErr);
            }

            toast.success(`${inviteRole.charAt(0).toUpperCase() + inviteRole.slice(1)} invited successfully`);
        } catch (err: unknown) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : String(err) || "Failed to invite member");
        } finally {
            setInviting(false);
        }
    };

    const canRemove = (targetId: string, targetRole: string) => {
        if (!user) return false;

        // Anyone can remove themselves
        if (targetId === user.id) return true;

        // Owner can remove anyone
        if (myRole === 'owner') return true;

        // Moderator can remove members but not owners or other moderators
        if (myRole === 'moderator' && targetRole === 'member') return true;

        return false;
    };

    const removeMember = async (userId: string) => {
        try {
            const { error } = await supabase
                .from("vault_members")
                .delete()
                .eq("vault_id", vaultId)
                .eq("user_id", userId);

            if (error) throw error;
            setMembers(members.filter(m => m.user_id !== userId));
            toast.success("Member removed");
        } catch {
            toast.error("Failed to remove member");
        }
    };

    useEffect(() => {
        if (open) {
            fetchMembers();
        }
    }, [open, fetchMembers]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[450px] rounded-lg border-border bg-card p-0 overflow-hidden shadow-lg">
                <DialogHeader className="p-6 border-b border-border bg-secondary/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center border border-border">
                            <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-left space-y-0.5">
                            <DialogTitle className="text-sm font-bold">Vault Access</DialogTitle>
                            <DialogDescription className="text-xs line-clamp-1">
                                Managing members for <span className="font-semibold text-foreground">{vaultName}</span>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {(myRole == 'owner' || myRole == 'moderator') ? <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2">
                            <Input
                                placeholder="Enter member email..."
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                                className="h-9 text-xs rounded-md bg-secondary/20 border-border focus:ring-1 focus:ring-primary/50"
                            />

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9 rounded-md gap-2 border-border bg-secondary/10 px-3 text-[10px] font-bold uppercase tracking-wider">
                                        {inviteRole}
                                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-32 rounded-md border-border p-1">
                                    <DropdownMenuItem onClick={() => setInviteRole("moderator")} className="text-[10px] font-bold uppercase tracking-wider p-2">
                                        Moderator
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setInviteRole("member")} className="text-[10px] font-bold uppercase tracking-wider p-2">
                                        Member
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <Button
                            className="rounded-md h-9 px-4 font-semibold text-xs shadow-sm"
                            disabled={!vaultKey || inviting}
                            onClick={handleInvite}
                        >
                            {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <UserPlus className="h-3.5 w-3.5 mr-2" />}
                            Invite
                        </Button>
                    </div> : null}

                    <div className="space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-0.5">Current Members</p>
                        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                            {loading ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/30" />
                                </div>
                            ) : (
                                members.map((member) => (
                                    <div key={member.user_id} className="group flex items-center justify-between p-2 rounded-md hover:bg-secondary/30 transition-all">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Avatar className="h-8 w-8 border border-border shrink-0">
                                                <AvatarFallback className="bg-primary/5 text-primary font-bold text-[10px]">
                                                    {member.users?.email?.[0].toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[11px] font-bold text-foreground leading-tight truncate">{member.users?.email?.split('@')[0]}</span>
                                                <span className="text-[9px] text-muted-foreground truncate font-medium">{member.users?.email}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className={cn(
                                                "px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider flex items-center gap-1",
                                                member.role === 'owner'
                                                    ? "bg-primary/10 text-primary border-primary/20"
                                                    : member.role === 'moderator'
                                                        ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                                                        : "bg-secondary text-muted-foreground border-border"
                                            )}>
                                                {member.role === 'owner' && <ShieldCheck className="h-2.5 w-2.5" />}
                                                {member.role === 'moderator' && <Shield className="h-2.5 w-2.5" />}
                                                {member.role === 'member' && <User className="h-2.5 w-2.5" />}
                                                {member.role}
                                            </div>

                                            {canRemove(member.user_id, member.role) && !(member.role === "owner" && member.user_id === user?.id) && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-secondary">
                                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-md border-border p-1">
                                                        <DropdownMenuItem className="text-xs text-destructive focus:bg-destructive/10 focus:text-destructive py-1.5 gap-2" onClick={() => removeMember(member.user_id)}>
                                                            <X className="h-3.5 w-3.5" />
                                                            <span>{member.user_id === user?.id ? "Leave Vault" : "Remove"}</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-border bg-secondary/10 flex justify-end">
                    <Button variant="ghost" size="sm" className="rounded-md h-8 px-4 font-bold text-[10px] uppercase tracking-widest" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

