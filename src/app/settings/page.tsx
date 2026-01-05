"use client";

import AppShell from "@/components/layout/app-shell";
import dynamic from "next/dynamic";

const SettingsPageContent = dynamic(() => import("./settings-content"), {
    ssr: false,
    loading: () => <div className="h-screen bg-background" />
});

export default function SettingsPage() {
    return (
        <AppShell>
            <SettingsPageContent />
        </AppShell>
    );
}
