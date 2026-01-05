"use client";

import dynamic from "next/dynamic";
import AppShell from "@/components/layout/app-shell";

const MembersPageContent = dynamic(() => import("./members-content"), {
    ssr: false,
    loading: () => <div className="h-screen bg-background" />
});

export default function MembersPage() {
    return (
        <AppShell>
            <MembersPageContent />
        </AppShell>
    );
}
