"use client";

import { PageLoader } from "@/components/shared/page-loader";
import dynamic from "next/dynamic";

const RegisterPageContent = dynamic(() => import("./register-content"), {
    ssr: false,
    loading: () => <PageLoader />
});

export default function RegisterPage() {
    return <RegisterPageContent />;
}
