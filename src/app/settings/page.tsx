"use client";

import AppShell from "@/components/layout/app-shell";
import dynamic from "next/dynamic";

import { PageLoader } from "@/components/shared/page-loader";

const SettingsPageContent = dynamic(() => import("./settings-content"), {
    ssr: false,
    loading: () => <PageLoader />
});

export default function SettingsPage() {
    return (
        <AppShell>
            <SettingsPageContent />
        </AppShell>
    );
}
