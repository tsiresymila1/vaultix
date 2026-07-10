"use client";

import { PageLoader } from "@/components/shared/page-loader";
import dynamic from "next/dynamic";

const LoginPageContent = dynamic(() => import("./login-content"), {
    ssr: false,
    loading: () => <PageLoader />
});

export default function LoginPage() {
    return <LoginPageContent />;
}
