"use client";

import dynamic from "next/dynamic";
import AppShell from "@/components/layout/app-shell";

const ProfilePageContent = dynamic(() => import("./profile-content"), {
    ssr: false,
    loading: () => <div className="h-screen bg-background" />
});

export default function ProfilePage() {
    return (
        <AppShell>
            <ProfilePageContent />
        </AppShell>
    );
}
