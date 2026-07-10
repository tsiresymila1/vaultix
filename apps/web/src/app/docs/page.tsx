"use client";

import { Shield, Terminal, Lock, Share2, Clipboard, Check, Github, Book, Code, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function DocsPage() {
    const [copied, setCopied] = useState<string | null>(null);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Header */}
            <header className="px-6 h-16 flex items-center justify-between border-b border-border/40 sticky top-0 bg-background/80 backdrop-blur-md z-50">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
                    <Shield className="w-6 h-6 text-primary" />
                    <span>Vaultix Docs</span>
                </Link>
                <div className="flex items-center gap-4">
                    <Link href="https://github.com/tsiresymila1/vaultix" target="_blank">
                        <Button variant="ghost" size="sm" className="gap-2">
                            <Github className="w-4 h-4" /> GitHub
                        </Button>
                    </Link>
                    <Link href="/vaults">
                        <Button size="sm">Open Vault</Button>
                    </Link>
                </div>
            </header>

            <div className="flex-1 flex max-w-7xl mx-auto w-full">
                {/* Sidebar Navigation */}
                <aside className="hidden lg:block w-64 border-r border-border/40 p-8 space-y-8 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2">Overview</h4>
                        <nav className="flex flex-col gap-1">
                            <DocNavLink href="#introduction" icon={<Book className="w-4 h-4" />} label="Introduction" />
                            <DocNavLink href="#features" icon={<Zap className="w-4 h-4" />} label="Key Features" />
                        </nav>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2">Getting Started</h4>
                        <nav className="flex flex-col gap-1">
                            <DocNavLink href="#installation" icon={<Terminal className="w-4 h-4" />} label="CLI Installation" />
                            <DocNavLink href="#usage" icon={<Code className="w-4 h-4" />} label="Basic Usage" />
                        </nav>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2">Core Concepts</h4>
                        <nav className="flex flex-col gap-1">
                            <DocNavLink href="#security" icon={<Lock className="w-4 h-4" />} label="Security Model" />
                            <DocNavLink href="#sharing" icon={<Share2 className="w-4 h-4" />} label="Sharing Model" />
                        </nav>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-6 md:p-12 lg:p-16 max-w-4xl scroll-smooth">
                    <section id="introduction" className="space-y-6 mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Documentation</h1>
                        <p className="text-xl text-muted-foreground leading-relaxed">
                            Vaultix is a fully zero-knowledge, client-side encrypted secret manager designed for modern development teams. 
                            Securely manage environment variables, API keys, and certificates without ever exposing them to the server.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4 pt-4">
                            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-2">
                                <Shield className="w-8 h-8 text-primary mb-2" />
                                <h3 className="font-bold text-lg">Zero-Knowledge</h3>
                                <p className="text-sm text-muted-foreground">We never see your secrets. Encryption happens entirely on your machine.</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-secondary/5 border border-border/40 space-y-2">
                                <Terminal className="w-8 h-8 text-foreground mb-2" />
                                <h3 className="font-bold text-lg">CLI Driven</h3>
                                <p className="text-sm text-muted-foreground">Inject secrets directly into your processes. No more .env files on disk.</p>
                            </div>
                        </div>
                    </section>

                    <section id="features" className="space-y-8 mb-20 pt-8 border-t border-border/40">
                        <h2 className="text-3xl font-bold tracking-tight">🚀 Key Features</h2>
                        <ul className="grid gap-4">
                            <FeatureItem 
                                title="End-to-End Encryption" 
                                description="Secrets are encrypted client-side using Libsodium (Argon2id + XChaCha20-Poly1305). Only you hold the decryption keys." 
                            />
                            <FeatureItem 
                                title="Developer-First CLI" 
                                description="Standalone tool to inject secrets into your dev environment or CI/CD pipelines at runtime." 
                            />
                            <FeatureItem 
                                title="Secure Team Sharing" 
                                description="Collaborate on vaults using public-key cryptography. Individual vault keys are re-encrypted for each member." 
                            />
                            <FeatureItem 
                                title="Zero-Knowledge Architecture" 
                                description="The server acts strictly as an encrypted storage engine. We cannot access your data." 
                            />
                        </ul>
                    </section>

                    <section id="installation" className="space-y-8 mb-20 pt-8 border-t border-border/40">
                        <h2 className="text-3xl font-bold tracking-tight">📦 CLI Installation</h2>
                        
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs">1</span>
                                    macOS / Linux
                                </h3>
                                <CodeBlock 
                                    id="install-sh"
                                    code="curl -fsSL https://raw.githubusercontent.com/tsiresymila1/vaultix/main/cli/install.sh | sh" 
                                    onCopy={copyToClipboard}
                                    copied={copied === "install-sh"}
                                />
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs">2</span>
                                    Windows (PowerShell)
                                </h3>
                                <CodeBlock 
                                    id="install-ps1"
                                    code="iwr -useb https://raw.githubusercontent.com/tsiresymila1/vaultix/main/cli/install.ps1 | iex" 
                                    onCopy={copyToClipboard}
                                    copied={copied === "install-ps1"}
                                />
                            </div>
                        </div>
                    </section>

                    <section id="usage" className="space-y-8 mb-20 pt-8 border-t border-border/40">
                        <h2 className="text-3xl font-bold tracking-tight">🛠 Basic Usage</h2>
                        
                        <div className="space-y-10">
                            <UsageStep 
                                title="1. Authenticate"
                                description="Log in to link your local CLI with your Vaultix account."
                                code="vaultix login"
                            />
                            <UsageStep 
                                title="2. Initialize Project"
                                description="Navigate to your project folder and link it to a vault."
                                code="vaultix init"
                            />
                            <UsageStep 
                                title="3. Run with Secrets"
                                description="Inject secrets directly into your application command. Variables are only available in memory."
                                code="vaultix run -- npm start"
                            />
                            <UsageStep 
                                title="4. Export .env (Optional)"
                                description="If you need a traditional .env file for legacy tools."
                                code="vaultix export --env Production > .env"
                            />
                        </div>
                    </section>

                    <section id="security" className="space-y-8 mb-20 pt-8 border-t border-border/40">
                        <h2 className="text-3xl font-bold tracking-tight">🔐 Security Model</h2>
                        <div className="p-8 rounded-2xl border border-border bg-card relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold">Deep Dive into Zero-Knowledge</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    Vaultix uses a multi-layered cryptographic approach to ensure total data sovereignty:
                                </p>
                                <ul className="space-y-6 mt-6">
                                    <SecurityDetail 
                                        label="KDF (Argon2id)" 
                                        content="Your master password is never sent. It's hashed locally with 64MB of memory to derive your Master Key." 
                                    />
                                    <SecurityDetail 
                                        label="Identity (X25519)" 
                                        content="Every user has a Curve25519 keypair. Private keys are stored in Vaultix, but are encrypted with your Master Key." 
                                    />
                                    <SecurityDetail 
                                        label="Vault Keys" 
                                        content="Vaults have unique symmetric keys (XChaCha20). When shared, this key is encrypted with the recipient's public key." 
                                    />
                                </ul>
                            </div>
                        </div>
                    </section>
                </main>
            </div>

            {/* Footer */}
            <footer className="p-8 border-t border-border/40 bg-muted/20 mt-auto">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Vaultix Security Documentation</p>
                    <div className="flex gap-6">
                        <Link href="/" className="text-sm hover:text-primary transition-colors">Return Home</Link>
                        <Link href="/privacy-policy" className="text-sm hover:text-primary transition-colors">Privacy</Link>
                        <Link href="https://github.com/tsiresymila1/vaultix" className="text-sm hover:text-primary transition-colors">Source Code</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function DocNavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    return (
        <a 
            href={href} 
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-all"
        >
            {icon}
            {label}
        </a>
    );
}

function FeatureItem({ title, description }: { title: string; description: string }) {
    return (
        <li className="flex gap-4 p-4 rounded-xl hover:bg-secondary/30 transition-colors">
            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            <div className="space-y-1">
                <p className="font-bold leading-none">{title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
        </li>
    );
}

function CodeBlock({ code, id, onCopy, copied }: { code: string; id: string; onCopy: (c: string, id: string) => void; copied: boolean }) {
    return (
        <div className="relative group">
            <pre className="bg-zinc-950 p-6 rounded-2xl border border-white/5 overflow-x-auto font-mono text-sm text-zinc-300 leading-relaxed">
                {code}
            </pre>
            <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                onClick={() => onCopy(code, id)}
            >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Clipboard className="w-4 h-4" />}
            </Button>
        </div>
    );
}

function UsageStep({ title, description, code }: { title: string; description: string; code: string }) {
    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="text-muted-foreground">{description}</p>
            </div>
            <pre className="bg-zinc-950 p-5 rounded-xl border border-white/5 font-mono text-sm text-zinc-400">
                <span className="text-zinc-600 mr-2">$</span>{code}
            </pre>
        </div>
    );
}

function SecurityDetail({ label, content }: { label: string; content: string }) {
    return (
        <li className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">{label}</p>
            <p className="text-sm text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-4">{content}</p>
        </li>
    );
}
