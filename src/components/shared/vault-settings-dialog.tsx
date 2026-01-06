"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Trash2, AlertTriangle } from "lucide-react";

interface VaultSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vaultName: string;
    onUpdateName: (newName: string) => Promise<void>;
    onDeleteVault: () => void;
    userRole: string | null;
}

export function VaultSettingsDialog({
    open,
    onOpenChange,
    vaultName,
    onUpdateName,
    onDeleteVault,
    userRole,
}: VaultSettingsDialogProps) {
    const [name, setName] = useState(vaultName);
    const [loading, setLoading] = useState(false);

    const handleUpdate = async () => {
        if (!name.trim() || name === vaultName) return;
        setLoading(true);
        try {
            await onUpdateName(name);
            onOpenChange(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[450px] rounded-lg border-border bg-card p-0 overflow-hidden shadow-lg">
                <DialogHeader className="p-6 border-b border-border bg-secondary/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center border border-border">
                            <Settings className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-left space-y-0.5">
                            <DialogTitle className="text-sm font-bold">Vault Settings</DialogTitle>
                            <DialogDescription className="text-xs">Configure vault properties and access policies</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-8">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-0.5">Vault Name</label>
                            <div className="flex gap-2">
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="h-9 rounded-md bg-secondary/20 border-border text-sm font-semibold focus:ring-1 focus:ring-primary/50"
                                />
                                <Button
                                    onClick={handleUpdate}
                                    disabled={loading || name === vaultName}
                                    className="rounded-md h-9 px-4 font-semibold text-xs shadow-sm"
                                >
                                    Update
                                </Button>
                            </div>
                        </div>
                    </div>

                    {userRole === 'owner' && (
                        <div className="pt-6 border-t border-border space-y-4">
                            <div className="flex items-center gap-2 text-destructive">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Danger Zone</span>
                            </div>
                            <div className="p-4 rounded-md bg-destructive/[0.02] border border-destructive/20 flex items-center justify-between group">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-destructive">Delete Vault</p>
                                    <p className="text-[10px] text-muted-foreground leading-tight">Permanently remove this vault and all secrets</p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="rounded-md border-destructive/30 text-destructive hover:bg-destructive hover:text-white transition-all h-8 px-4 font-bold text-[10px] uppercase tracking-widest"
                                    onClick={() => {
                                        onOpenChange(false);
                                        onDeleteVault();
                                    }}
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    Delete
                                </Button>
                            </div>
                        </div>
                    )}
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

