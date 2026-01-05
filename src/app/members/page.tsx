"use client";

import dynamic from "next/dynamic";
import AppShell from "@/components/layout/app-shell";

import { PageLoader } from "@/components/shared/page-loader";

const MembersPageContent = dynamic(() => import("./members-content"), {
    ssr: false,
    loading: () => <PageLoader />
});

export default function MembersPage() {
    return (
        <AppShell>
            <MembersPageContent />
        </AppShell>
    );
}
