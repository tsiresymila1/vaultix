"use client";

import { useState } from "react";
import { Shield, ArrowLeft, Trash2, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function DataDeletionPage() {
    const [email, setEmail] = useState("");
    const [confirmText, setConfirmText] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (confirmText !== "DELETE") {
            toast.error("Please type DELETE to confirm.");
            return;
        }

        setLoading(true);
        // In a real app, this would trigger an administrative deletion request or an automated cleanup.
        // For this implementation, we log the request.
        try {
            const { error } = await supabase.from('deletion_requests').insert({
                email,
                requested_at: new Date().toISOString()
            });
            
            if (error) throw error;
            
            setSubmitted(true);
            toast.success("Deletion request received.");
        } catch (err) {
            console.error(err);
            toast.error("Failed to submit request. Please try again or contact support.");
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6">
                <Card className="max-w-md w-full border-primary/20 bg-primary/5">
                    <CardHeader className="text-center">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Shield className="w-8 h-8 text-green-500" />
                        </div>
                        <CardTitle className="text-2xl">Request Received</CardTitle>
                        <CardDescription className="text-muted-foreground mt-2">
                            Your request to delete all data associated with <strong>{email}</strong> has been received. 
                            Our team will process it within 48 hours.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Link href="/" className="w-full">
                            <Button variant="outline" className="w-full">Return Home</Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground py-12 px-6">
            <div className="max-w-2xl mx-auto space-y-8">
                <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>

                <div className="flex items-center gap-2 mb-8">
                    <Trash2 className="w-8 h-8 text-destructive" />
                    <h1 className="text-3xl font-bold tracking-tight">Data Deletion Request</h1>
                </div>

                <div className="grid gap-6">
                    <Card className="border-destructive/20">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-destructive" />
                                Warning: This action is permanent
                            </CardTitle>
                            <CardDescription>
                                Deleting your account will remove all your encrypted secrets, vaults, and sharing history. 
                                Since we do not have your master password, this data cannot be recovered once deleted.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Account Email</label>
                                    <Input 
                                        type="email" 
                                        placeholder="your@email.com" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Type &quot;DELETE&quot; to confirm</label>
                                    <Input 
                                        type="text" 
                                        placeholder="DELETE" 
                                        value={confirmText}
                                        onChange={(e) => setConfirmText(e.target.value)}
                                        required
                                        className="h-10 font-bold tracking-widest"
                                    />
                                </div>
                                <Button 
                                    type="submit" 
                                    variant="destructive" 
                                    className="w-full h-11"
                                    disabled={loading || confirmText !== "DELETE"}
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                    Request Perpetual Deletion
                                </Button>
                            </form>
                        </CardContent>
                        <CardFooter className="bg-muted/50 text-[10px] text-muted-foreground p-4">
                            Vaultix complies with GDPR and CCPA regulations. All data is purged from our production databases and backup rotations within 30 days of request approval.
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
