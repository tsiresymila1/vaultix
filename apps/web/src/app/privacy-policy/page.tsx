import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-background text-foreground py-12 px-6">
            <div className="max-w-3xl mx-auto space-y-8">
                <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>

                <div className="flex items-center gap-2 mb-8">
                    <Shield className="w-8 h-8 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
                </div>

                <div className="prose prose-zinc dark:prose-invert max-w-none space-y-6">
                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold border-b border-border pb-2">1. Overview</h2>
                        <p className="text-muted-foreground">
                            Vaultix is designed with a &quot;Zero-Knowledge&quot; architecture. This means your secrets, passwords, and notes are encrypted on your device <strong>before</strong> they are sent to our servers. We never have access to your master password or your unencrypted data.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold border-b border-border pb-2">2. Data Collection</h2>
                        <p className="text-muted-foreground">
                            We collect minimal data necessary to provide our service:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                            <li><strong>Account Information:</strong> Your email address and basic profile details for authentication.</li>
                            <li><strong>Encrypted Data:</strong> Your secrets and vault configuration, stored in an encrypted format.</li>
                            <li><strong>Usage Logs:</strong> Basic technical logs (IP address, browser type) to improve security and performance.</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold border-b border-border pb-2">3. Security Architecture</h2>
                        <p className="text-muted-foreground">
                            Our security model relies on the follow technologies:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                            <li><strong>Argon2id:</strong> For secure master key derivation.</li>
                            <li><strong>XChaCha20-Poly1305:</strong> For authenticated encryption of all stored secrets.</li>
                            <li><strong>Ed25519/Curve25519:</strong> For identity verification and secure sharing.</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold border-b border-border pb-2">4. Your Rights</h2>
                        <p className="text-muted-foreground">
                            You have the right to access, export, or delete your data at any time. Because your data is encrypted with a key only you hold, if you lose your master password, we cannot recover your data.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold border-b border-border pb-2">5. Data Deletion</h2>
                        <p className="text-muted-foreground">
                            If you wish to delete your account and all associated data, you can do so through your account settings or by visiting our <Link href="/data-deletion" className="text-primary hover:underline">Data Deletion Request</Link> page.
                        </p>
                    </section>

                    <section className="space-y-4 pt-8 text-sm text-muted-foreground border-t border-border">
                        <p>Last Updated: {new Date().toLocaleDateString()}</p>
                        <p>For questions, contact: tsiresymila@gmail.com</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
