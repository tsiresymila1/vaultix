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
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { VaultMember } from "@/types";
import { Loader2, MoreHorizontal, UserPlus, Users, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface VaultMembersDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vaultId: string;
    vaultName: string;
}

import { Input } from "@/components/ui/input";

export function VaultMembersDialog({
    open,
    onOpenChange,
    vaultId,
    vaultName,
}: VaultMembersDialogProps) {
    const [members, setMembers] = useState<VaultMember[]>([]);
    const [loading, setLoading] = useState(false);



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
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Enter member email..."
                            className="h-9 text-xs rounded-md bg-secondary/20 border-border focus:ring-1 focus:ring-primary/50"
                        />
                        <Button className="rounded-md h-9 px-4 font-semibold text-xs shadow-sm">
                            <UserPlus className="h-3.5 w-3.5 mr-2" />
                            Invite
                        </Button>
                    </div>

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
                                                "px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider",
                                                member.role === 'owner'
                                                    ? "bg-primary/10 text-primary border-primary/20"
                                                    : "bg-secondary text-muted-foreground border-border"
                                            )}>
                                                {member.role}
                                            </div>

                                            {member.role !== 'owner' && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-secondary">
                                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-md border-border p-1">
                                                        <DropdownMenuItem className="text-xs text-destructive focus:bg-destructive/10 focus:text-destructive py-1.5 gap-2" onClick={() => removeMember(member.user_id)}>
                                                            <X className="h-3.5 w-3.5" />
                                                            <span>Remove</span>
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

