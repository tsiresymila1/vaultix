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
import { Key, Eye, EyeOff, Loader2 } from "lucide-react";

interface AddSecretDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (key: string, value: string) => Promise<void>;
    environmentName: string;
}

export function AddSecretDialog({
    open,
    onOpenChange,
    onAdd,
    environmentName,
}: AddSecretDialogProps) {
    const [key, setKey] = useState("");
    const [value, setValue] = useState("");
    const [showValue, setShowValue] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!key.trim() || !value.trim()) return;

        setLoading(true);
        try {
            await onAdd(key, value);
            setKey("");
            setValue("");
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
                            <Key className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-0.5 text-left">
                            <DialogTitle className="text-sm font-bold">Add Secret</DialogTitle>
                            <DialogDescription className="text-xs">
                                To environment <span className="font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded border border-border text-foreground">{environmentName}</span>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-0.5">Key Name</label>
                            <Input
                                placeholder="STRIPE_API_KEY"
                                value={key}
                                onChange={(e) => setKey(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                                className="h-9 rounded-md bg-secondary/20 border-border text-sm font-mono focus:ring-1 focus:ring-primary/50"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-0.5">Value</label>
                            <div className="relative group">
                                <Input
                                    type={showValue ? "text" : "password"}
                                    placeholder="your-secret-value"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    className="h-9 rounded-md bg-secondary/20 border-border text-sm font-mono pr-10 focus:ring-1 focus:ring-primary/50"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md text-muted-foreground hover:bg-secondary"
                                    onClick={() => setShowValue(!showValue)}
                                >
                                    {showValue ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </Button>
                            </div>
                        </div>
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
                            disabled={loading || !key.trim() || !value.trim()}
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Encrypting</span>
                                </div>
                            ) : (
                                "Save Secret"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}



