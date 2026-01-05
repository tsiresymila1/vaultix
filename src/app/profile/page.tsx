"use client";

import { PageLoader } from "@/components/shared/page-loader";
import dynamic from "next/dynamic";
import AppShell from "@/components/layout/app-shell";

const ProfilePageContent = dynamic(() => import("./profile-content"), {
    ssr: false,
    loading: () => <PageLoader />
});

export default function ProfilePage() {
    return (
        <AppShell>
            <ProfilePageContent />
        </AppShell>
    );
}
