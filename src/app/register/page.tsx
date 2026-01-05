"use client";

import dynamic from "next/dynamic";

const RegisterPageContent = dynamic(() => import("./register-content"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    )
});

export default function RegisterPage() {
    return <RegisterPageContent />;
}
