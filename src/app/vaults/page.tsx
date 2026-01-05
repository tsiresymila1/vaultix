"use client";

import dynamic from "next/dynamic";


import { PageLoader } from "@/components/shared/page-loader";

const VaultsPageContent = dynamic(() => import("./vaults-content"), {
    ssr: false,
    loading: () => <PageLoader />
});

export default function VaultsPage() {
    return <VaultsPageContent />;
}
