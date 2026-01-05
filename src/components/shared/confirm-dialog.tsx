"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    variant?: "destructive" | "default";
    loading?: boolean;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    onConfirm,
    title,
    description,
    confirmText = "Delete",
    variant = "destructive",
    loading = false,
}: ConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[400px] rounded-lg border-border bg-card p-0 overflow-hidden shadow-lg">
                <DialogHeader className="p-6 border-b border-border bg-secondary/10">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-10 h-10 rounded-md flex items-center justify-center border",
                            variant === "destructive" ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-secondary border-border text-primary"
                        )}>
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="text-left space-y-0.5">
                            <DialogTitle className="text-sm font-bold">{title}</DialogTitle>
                            <DialogDescription className="text-xs leading-relaxed">
                                {description}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <div className="p-6 flex justify-end gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="rounded-md h-9 px-4 text-xs font-bold uppercase tracking-widest"
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant={variant}
                        onClick={onConfirm}
                        className="rounded-md h-9 px-6 font-semibold shadow-sm"
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Processing</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                {variant === "destructive" && <Trash2 className="h-3.5 w-3.5" />}
                                <span>{confirmText}</span>
                            </div>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

