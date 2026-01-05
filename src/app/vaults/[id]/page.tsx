"use client";

import dynamic from "next/dynamic";
import { use } from "react";

import { PageLoader } from "@/components/shared/page-loader";

const VaultDetailContent = dynamic(() => import("./vault-detail-content"), {
    ssr: false,
    loading: () => <PageLoader />
});

export default function VaultDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    return <VaultDetailContent params={resolvedParams} />;
}
