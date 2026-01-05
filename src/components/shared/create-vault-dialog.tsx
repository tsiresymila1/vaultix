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
import { Plus, Shield, Loader2 } from "lucide-react";

interface CreateVaultDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (name: string) => Promise<void>;
}

export function CreateVaultDialog({
    open,
    onOpenChange,
    onCreate,
}: CreateVaultDialogProps) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            await onCreate(name);
            setName("");
            onOpenChange(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[400px] rounded-lg border-border bg-card p-0 overflow-hidden shadow-lg">
                <DialogHeader className="p-6 border-b border-border bg-secondary/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center border border-border">
                            <Shield className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-left space-y-0.5">
                            <DialogTitle className="text-sm font-bold">Create New Vault</DialogTitle>
                            <DialogDescription className="text-xs">
                                Choose a descriptive name for your secrets container
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-0.5">Vault Name</label>
                        <Input
                            placeholder="e.g. Production API Keys"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-9 rounded-md bg-secondary/20 border-border text-sm font-semibold focus:ring-1 focus:ring-primary/50"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="rounded-md h-9 px-4 text-xs font-bold uppercase tracking-widest"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-md h-9 px-6 font-semibold shadow-sm"
                            disabled={loading || !name.trim()}
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Creating</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>Create Vault</span>
                                </div>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

