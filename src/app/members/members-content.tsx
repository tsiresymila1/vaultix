"use client";

import { ConfirmDialog, type ConfirmDialogProps } from "@/components/shared/confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { UserData } from "@/types";
import { Ban, CheckCircle, MoreHorizontal, Shield, ShieldCheck, UserCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface MembersPageContentProps {
    initialMembers: UserData[];
}

export default function MembersPageContent({ initialMembers }: MembersPageContentProps) {
    const [members, setMembers] = useState<UserData[]>(initialMembers);
    const [loading, setLoading] = useState(false);

    // Action State
    const [actionUser, setActionUser] = useState<UserData | null>(null);
    const [actionType, setActionType] = useState<"role" | "status" | null>(null);
    const [targetValue, setTargetValue] = useState<string>("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        // Only fetch if we don't have members, though SSR should provide them
        if (members.length === 0) {
            fetchMembers();
        }
    }, [members.length]);

    const fetchMembers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("users")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setMembers(data || []);
        } catch (error) {
            console.error("Error fetching members:", error);
            toast.error("Failed to load members");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = (user: UserData, type: "role" | "status", value: string) => {
        setActionUser(user);
        setActionType(type);
        setTargetValue(value);
        setConfirmOpen(true);
    };

    const executeAction = async () => {
        if (!actionUser || !actionType || !targetValue) return;

        try {
            setActionLoading(true);
            const updateData = actionType === "role" ? { role: targetValue } : { status: targetValue };

            const { error } = await supabase
                .from("users")
                .update(updateData)
                .eq("id", actionUser.id);

            if (error) throw error;

            toast.success(`User ${actionType === "role" ? "role" : "status"} updated successfully`);
            fetchMembers(); // Refresh list
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error("Failed to update user");
        } finally {
            setActionLoading(false);
            setConfirmOpen(false);
            setActionUser(null);
            setActionType(null);
            setTargetValue("");
        }
    };

    const getDialogContent = () => {
        if (actionType === "role") {
            const roleName = targetValue.charAt(0).toUpperCase() + targetValue.slice(1);
            return {
                title: `Change Role to ${roleName}`,
                description: `Are you sure you want to promote/demote ${actionUser?.email} to ${roleName}?`,
                confirmText: "Update Role",
                variant: "default" as const
            };
        } else {
            const statusName = targetValue === "restricted" ? "Restrict Access" : targetValue === "banned" ? "Ban User" : "Activate User";
            return {
                title: statusName,
                description: `Are you sure you want to update the status of ${actionUser?.email} to ${targetValue}?`,
                confirmText: "Update Status",
                variant: targetValue === "active" ? "default" : "destructive" as const
            };
        }
    };

    const dialogContent = getDialogContent();

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-md bg-secondary text-primary flex items-center justify-center border border-border">
                        <Users className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Team Members
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Manage user roles and organization access
                        </p>
                    </div>
                </div>
            </div>

            <Card className="rounded-lg border-border bg-card shadow-sm overflow-hidden">
                <CardHeader className="p-6 border-b border-border bg-secondary/10">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            System Users
                            <Badge className="bg-primary/10 text-primary border-transparent text-[10px] font-bold">
                                {members.length}
                            </Badge>
                        </CardTitle>
                    </div>
                    <CardDescription className="text-xs">Directory of all users registered on this instance</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                                    <TableHead className="w-[300px] text-[10px] font-bold text-muted-foreground py-3 pl-6 uppercase tracking-widest">User</TableHead>
                                    <TableHead className="text-[10px] font-bold text-muted-foreground py-3 uppercase tracking-widest">Role</TableHead>
                                    <TableHead className="text-[10px] font-bold text-muted-foreground py-3 uppercase tracking-widest">Status</TableHead>
                                    <TableHead className="text-right text-[10px] font-bold text-muted-foreground py-3 pr-6 uppercase tracking-widest">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    [1, 2, 3].map((i) => (
                                        <TableRow key={i} className="border-border">
                                            <TableCell className="py-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                                                    <div className="space-y-1.5">
                                                        <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                                                        <div className="h-2 w-28 bg-muted animate-pulse rounded" />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                                            <TableCell><div className="h-3 w-32 bg-muted animate-pulse rounded" /></TableCell>
                                            <TableCell className="text-right pr-6"><div className="h-8 w-8 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    members.map((member) => (
                                        <TableRow key={member.id} className="group border-border hover:bg-secondary/20">
                                            <TableCell className="py-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8 border border-border">
                                                        <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">
                                                            {(member.full_name || member.email)?.[0].toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-xs font-bold text-foreground truncate">
                                                            {member.full_name || member.email.split('@')[0]}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground truncate font-medium">
                                                            {member.email}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <Badge variant="outline" className={`
                                                    text-[10px] font-bold uppercase tracking-wider border-transparent
                                                    ${member.role === 'admin' ? 'bg-purple-500/10 text-purple-500' :
                                                        member.role === 'moderator' ? 'bg-blue-500/10 text-blue-500' :
                                                            'bg-secondary text-muted-foreground'}
                                                `}>
                                                    {member.role || 'User'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${member.status === 'banned' ? 'bg-destructive' :
                                                        member.status === 'restricted' ? 'bg-orange-500' :
                                                            'bg-emerald-500'
                                                        }`} />
                                                    <span className={`text-[11px] font-bold uppercase tracking-wider ${member.status === 'banned' ? 'text-destructive' :
                                                        member.status === 'restricted' ? 'text-orange-500' :
                                                            'text-emerald-500'
                                                        }`}>
                                                        {member.status || 'Active'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 py-4">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-muted-foreground hover:bg-secondary">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 rounded-md border-border">
                                                        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-2 py-1.5">Role Management</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />

                                                        {member.role !== 'admin' && (
                                                            <DropdownMenuItem onClick={() => handleAction(member, 'role', 'admin')} className="text-xs gap-2 py-2">
                                                                <ShieldCheck className="h-3.5 w-3.5" />
                                                                <span>Make Admin</span>
                                                            </DropdownMenuItem>
                                                        )}
                                                        {member.role !== 'moderator' && (
                                                            <DropdownMenuItem onClick={() => handleAction(member, 'role', 'moderator')} className="text-xs gap-2 py-2">
                                                                <UserCheck className="h-3.5 w-3.5" />
                                                                <span>Set Moderator</span>
                                                            </DropdownMenuItem>
                                                        )}
                                                        {member.role !== 'user' && (
                                                            <DropdownMenuItem onClick={() => handleAction(member, 'role', 'user')} className="text-xs gap-2 py-2">
                                                                <Users className="h-3.5 w-3.5" />
                                                                <span>Downgrade to User</span>
                                                            </DropdownMenuItem>
                                                        )}

                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-2 py-1.5">Access Control</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />

                                                        {member.status !== 'active' && (
                                                            <DropdownMenuItem onClick={() => handleAction(member, 'status', 'active')} className="text-xs gap-2 py-2 text-emerald-500 focus:text-emerald-500 focus:bg-emerald-500/10">
                                                                <CheckCircle className="h-3.5 w-3.5" />
                                                                <span>Activate Access</span>
                                                            </DropdownMenuItem>
                                                        )}
                                                        {member.status !== 'restricted' && (
                                                            <DropdownMenuItem onClick={() => handleAction(member, 'status', 'restricted')} className="text-xs gap-2 py-2 text-orange-500 focus:text-orange-500 focus:bg-orange-500/10">
                                                                <Shield className="h-3.5 w-3.5" />
                                                                <span>Restrict Access</span>
                                                            </DropdownMenuItem>
                                                        )}
                                                        {member.status !== 'banned' && (
                                                            <DropdownMenuItem onClick={() => handleAction(member, 'status', 'banned')} className="text-xs gap-2 py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                                                                <Ban className="h-3.5 w-3.5" />
                                                                <span>Ban User</span>
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={dialogContent.title}
                description={dialogContent.description}
                confirmText={dialogContent.confirmText}
                variant={dialogContent.variant as ConfirmDialogProps['variant']}
                onConfirm={executeAction}
                loading={actionLoading}
            />
        </div>
    );
}

