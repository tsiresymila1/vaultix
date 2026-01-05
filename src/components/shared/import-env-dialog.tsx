"use client";

import { useMemo, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { parseDotEnv } from "@/lib/env-file";
import { Upload, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportEnvDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    environmentName: string;
    onImport: (entries: Array<{ key: string; value: string }>) => Promise<void>;
}

export function ImportEnvDialog({
    open,
    onOpenChange,
    environmentName,
    onImport,
}: ImportEnvDialogProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            const contents = await file.text();
            setText(contents);
        }
    };

    const parsed = useMemo(() => parseDotEnv(text), [text]);
    const uniqueEntries = useMemo(() => {
        const seen = new Set<string>();
        return parsed.filter((e) => {
            const k = e.key;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
    }, [parsed]);

    const handlePickFile = () => fileInputRef.current?.click();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const contents = await file.text();
        setText(contents);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleImport = async () => {
        if (uniqueEntries.length === 0) return;

        setLoading(true);
        try {
            await onImport(uniqueEntries.map(({ key, value }) => ({ key, value })));
            setText("");
            onOpenChange(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[720px] rounded-lg border-border bg-card p-0 overflow-hidden shadow-lg">
                <DialogHeader className="p-6 border-b border-border bg-secondary/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center border border-border">
                            <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-0.5 text-left">
                            <DialogTitle className="text-sm font-bold">Import from .env</DialogTitle>
                            <DialogDescription className="text-xs">
                                Into environment{" "}
                                <span className="font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded border border-border text-foreground">
                                    {environmentName}
                                </span>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div
                    className={cn(
                        "p-6 space-y-4 transition-colors",
                        isDragging && "bg-primary/5"
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col gap-4">
                        <div className={cn(
                            "flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 transition-all gap-3",
                            isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-secondary/20"
                        )}>
                            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                                <Upload className={cn("h-6 w-6", isDragging ? "text-primary animate-bounce" : "text-muted-foreground")} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold">Drop your .env file here</p>
                                <p className="text-xs text-muted-foreground mt-1">or click to browse from your computer</p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-2 h-8 rounded-md gap-2"
                                onClick={handlePickFile}
                            >
                                Select File
                            </Button>
                        </div>

                        <div className="p-3 rounded-md bg-amber-500/5 border border-amber-500/10 text-center">
                            <p className="text-[10px] text-amber-500/80 font-medium">
                                <span className="font-bold">macOS Tip:</span> Press <kbd className="font-sans border px-1 rounded bg-muted/20 mx-0.5">Cmd</kbd> + <kbd className="font-sans border px-1 rounded bg-muted/20 mx-0.5">Shift</kbd> + <kbd className="font-sans border px-1 rounded bg-muted/20 mx-0.5">.</kbd> to toggle dotfiles in the file picker.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between ml-0.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                Or paste content
                            </label>
                            {uniqueEntries.length > 0 && (
                                <div className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                    {uniqueEntries.length} keys found
                                </div>
                            )}
                        </div>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={'DATABASE_URL="..."\nSTRIPE_API_KEY=...'}
                            className="min-h-[140px] w-full rounded-md border border-border bg-secondary/10 p-3 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                    </div>

                    {uniqueEntries.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[140px] overflow-auto border border-border rounded-md p-3 bg-secondary/10">
                            {uniqueEntries.map((e) => (
                                <div key={`${e.line}:${e.key}`} className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-secondary/30 transition-colors">
                                    <span className="font-mono text-[11px] font-semibold truncate flex-1">{e.key}</span>
                                    <span className="text-[9px] text-muted-foreground shrink-0 uppercase tracking-tighter">Line {e.line}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="rounded-md h-9 px-4 text-xs font-bold uppercase tracking-widest"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            className="rounded-md h-9 px-6 font-semibold shadow-sm"
                            disabled={loading || uniqueEntries.length === 0}
                            onClick={handleImport}
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Importing</span>
                                </div>
                            ) : (
                                "Import Secrets"
                            )}
                        </Button>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}
