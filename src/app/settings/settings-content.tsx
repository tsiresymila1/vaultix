"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Shield, Bell, Moon, Sun, Lock, Terminal, Database, ArrowRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function SettingsPageContent() {
    const [darkMode, setDarkMode] = useState(true);
    const [autoLock, setAutoLock] = useState(true);
    const [notifications, setNotifications] = useState(true);

    return (
        <div className="space-y-8 max-w-5xl">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Preferences
                </h1>
                <p className="text-muted-foreground text-sm">
                    Configure your workspace security and appearance settings
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* General Settings */}
                <Card className="rounded-lg border-border bg-card shadow-sm overflow-hidden">
                    <CardHeader className="p-6 border-b border-border bg-secondary/10">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Settings className="h-4 w-4 text-primary" />
                            General Appearance
                        </CardTitle>
                        <CardDescription className="text-xs">Customize how Vaultix looks and feels on this device</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-md bg-secondary/30 border border-border">
                            <div className="flex items-center gap-4">
                                <div className="w-9 h-9 rounded-md bg-background flex items-center justify-center text-primary border border-border shadow-sm">
                                    {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold">Dark Mode</p>
                                    <p className="text-[11px] text-muted-foreground">Toggle between high-contrast and light themes</p>
                                </div>
                            </div>
                            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-md bg-secondary/30 border border-border">
                            <div className="flex items-center gap-4">
                                <div className="w-9 h-9 rounded-md bg-background flex items-center justify-center text-orange-500 border border-border shadow-sm">
                                    <Bell className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold">Notifications</p>
                                    <p className="text-[11px] text-muted-foreground">Get alerted on vault sharing or access attempts</p>
                                </div>
                            </div>
                            <Switch checked={notifications} onCheckedChange={setNotifications} />
                        </div>
                    </CardContent>
                </Card>

                {/* Security Settings */}
                <Card className="rounded-lg border-border bg-card shadow-sm overflow-hidden">
                    <CardHeader className="p-6 border-b border-border bg-secondary/10">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Lock className="h-4 w-4 text-emerald-500" />
                            Security Policy
                        </CardTitle>
                        <CardDescription className="text-xs">Configure how your data is protected during your session</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-md bg-secondary/30 border border-border">
                            <div className="flex items-center gap-4">
                                <div className="w-9 h-9 rounded-md bg-background flex items-center justify-center text-emerald-500 border border-border shadow-sm">
                                    <Shield className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold">Auto-Lock Session</p>
                                    <p className="text-[11px] text-muted-foreground">Automatically lock secrets after 15 minutes of inactivity</p>
                                </div>
                            </div>
                            <Switch checked={autoLock} onCheckedChange={setAutoLock} />
                        </div>

                        <div className="p-4 rounded-md bg-destructive/[0.02] border border-destructive/20 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="w-9 h-9 rounded-md bg-background flex items-center justify-center text-destructive border border-destructive/20 shadow-sm">
                                    <Terminal className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-destructive">Advanced: Purge Local Cache</p>
                                    <p className="text-[11px] text-muted-foreground">Remove all locally stored cryptographic keys from this device</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="rounded-md border-destructive/30 text-destructive font-bold uppercase tracking-widest text-[10px] h-8 hover:bg-destructive hover:text-white transition-all px-4">
                                Purge Now
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Platform Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="rounded-lg border-border bg-card shadow-sm p-6 flex flex-col justify-between group border-transparent hover:border-border transition-all">
                        <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center text-primary mb-4 border border-border">
                            <Database className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Infrastructure</p>
                            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                                Connected to Supabase Cloud. End-to-end encryption active via Libsodium WASM.
                            </p>
                        </div>
                        <Button variant="link" className="p-0 h-auto self-start mt-4 gap-1 text-primary hover:no-underline text-xs font-bold uppercase tracking-widest group/btn">
                            System Status <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                    </Card>
                    <Card className="rounded-lg border-border bg-card shadow-sm p-6 flex flex-col justify-between group border-transparent hover:border-border transition-all">
                        <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center text-primary mb-4 border border-border">
                            <Terminal className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">CLI Access</p>
                            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                                Download the Vaultix CLI to manage secrets directly from your terminal.
                            </p>
                        </div>
                        <Button variant="link" className="p-0 h-auto self-start mt-4 gap-1 text-primary hover:no-underline text-xs font-bold uppercase tracking-widest group/btn">
                            Download CLI <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
}

