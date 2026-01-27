"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { ArrowRight, Book, Check, Copy, Link as LinkIcon, Lock, Share2, Shield, Smartphone, Terminal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function HomePage() {
  const { user } = useAuth();
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="px-6 h-16 flex items-center justify-between border-b border-border/40 sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <Shield className="w-6 h-6 text-primary" />
          <span>Vaultix</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link href="/share" className="hover:text-foreground transition-colors flex items-center gap-1.5 text-primary/80">
            <Share2 className="w-4 h-4" /> Share Secret
          </Link>
          <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
          <Link href="/#features" className="hover:text-foreground transition-colors">Features</Link>
          <Link href="/#security" className="hover:text-foreground transition-colors">Security</Link>
          <Link href="/#cli" className="hover:text-foreground transition-colors">CLI</Link>
        </nav>
        {user ? (
          <div className="flex items-center gap-4">
            <Link href="/vaults">
              <Button variant="default" size="sm" className="hidden sm:inline-flex">Vaults</Button>
            </Link>
          </div>) : (
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started <ArrowRight className="ml-2 w-4 h-4" /></Button>
            </Link>
          </div>)}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 px-6 md:py-32 flex flex-col items-center text-center max-w-5xl mx-auto space-y-8">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
            v1.0 Public Beta is now live
          </div>
          <h1 className="text-4xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
            Secure Secrets Manager <br /> for Modern Teams
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Vaultix provides end-to-end encrypted secret management for your infrastructure.
            Securely share environment variables, API keys, and certificates with your team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <Link href="/register">
              <Button size="lg" className="h-12 px-8 text-base w-full sm:w-auto">Start for free</Button>
            </Link>
            <Link href="/docs">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base w-full sm:w-auto gap-2">
                <Book className="w-5 h-5" /> Explore Documentation
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-20 px-6 bg-muted/30 border-y border-border/40">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Lock className="w-6 h-6" />}
                title="End-to-End Encryption"
                description="Your secrets are encrypted client-side using Libsodium (Argon2id + XChaCha20-Poly1305). Only you hold the keys."
              />
              <FeatureCard
                icon={<Terminal className="w-6 h-6" />}
                title="Developer CLI"
                description="Inject secrets directly into your development environment or CI/CD pipelines with our robust CLI tool."
              />
              <FeatureCard
                icon={<Share2 className="w-6 h-6" />}
                title="Vault Sharing"
                description="Share entire vaults with team members using public-key cryptography. No shared passwords, ever."
              />
              <FeatureCard
                icon={<LinkIcon className="w-6 h-6" />}
                title="Vaultix Share"
                description="Share ephemeral secrets via secure public links. Set expiration times and view limits for ultimate control over your data."
              />
              <FeatureCard
                icon={<Smartphone className="w-6 h-6" />}
                title="Live 2FA Authenticator"
                description="Built-in TOTP support with a circular progress timer and QR code generation. Sync your codes across devices effortlessly."
              />
            </div>
          </div>
        </section>
        {/* CLI Section */}
        <section id="cli" className="py-24 px-6 max-w-5xl mx-auto">
          <div className="flex flex-col items-center text-center space-y-6 mb-12">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Developer-First CLI</h2>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Install our standalone CLI to manage secrets directly from your terminal.
              Works on macOS, Linux, and Windows.
            </p>
          </div>

          <div className="bg-zinc-950 rounded-2xl p-2 shadow-2xl border border-white/10 overflow-hidden">
            <InstallTerminal />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/40 text-center md:text-left bg-muted/20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">

          <div className="flex flex-col items-right gap-2">
            <div className="flex items-center gap-2 font-semibold text-muted-foreground">
              <Shield className="w-5 h-5" />
              <span>Vaultix</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Vaultix. All rights reserved.
            </div>
          </div>
          <div className="gap-4 space-y-4">
            
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <span className="w-1 h-1 rounded-full bg-border" />
              <Link href="/data-deletion" className="hover:text-primary transition-colors">Data Deletion</Link>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}

function InstallTerminal() {
  const [os, setOs] = useState<'sh' | 'ps1'>('sh');

  const commands = {
    sh: "curl -fsSL https://raw.githubusercontent.com/tsiresymila1/vaultix/main/cli/install.sh | sh",
    ps1: "iwr -useb https://raw.githubusercontent.com/tsiresymila1/vaultix/main/cli/install.ps1 | iex"
  };

  return (
    <div className="group">
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex gap-2 mr-2">
            <div className="w-3 h-3 rounded-full bg-red-500/20 group-hover:bg-red-500/40 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/20 group-hover:bg-yellow-500/40 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-green-500/20 group-hover:bg-green-500/40 transition-colors" />
          </div>
          <div className="flex bg-zinc-800/50 rounded-lg p-0.5">
            <button
              onClick={() => setOs('sh')}
              className={cn(
                "px-3 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md transition-all",
                os === 'sh' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              macOS / Linux
            </button>
            <button
              onClick={() => setOs('ps1')}
              className={cn(
                "px-3 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md transition-all",
                os === 'ps1' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Windows
            </button>
          </div>
        </div>
        <CopyButton text={commands[os]} />
      </div>
      <div className="p-6 font-mono text-sm sm:text-base leading-relaxed overflow-x-auto">
        {os === 'sh' ? (
          <div className="whitespace-nowrap">
            <span className="text-green-400">$</span> <span className="text-zinc-300">curl -fsSL</span> <span className="text-blue-400">https://.../install.sh</span> <span className="text-zinc-500">|</span> <span className="text-zinc-300">sh</span>
            <div className="mt-4 text-zinc-500 opacity-50 select-none">
              # Detecting OS and Architecture...<br />
              # Downloading Vaultix CLI for macos-arm64...<br />
              # Installing to /usr/local/bin...<br />
              <span className="text-green-500/70">✔ Vaultix CLI installed successfully!</span>
            </div>
          </div>
        ) : (
          <div className="whitespace-nowrap">
            <span className="text-blue-400">PS &gt;</span> <span className="text-zinc-300">iwr -useb</span> <span className="text-blue-400">https://.../install.ps1</span> <span className="text-zinc-500">|</span> <span className="text-zinc-300">iex</span>
            <div className="mt-4 text-zinc-500 opacity-50 select-none">
              # Detecting latest release...<br />
              # Downloading Vaultix CLI (x64)...<br />
              # Updating User PATH...<br />
              <span className="text-green-500/70">✔ Vaultix CLI installed successfully!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-xl border border-border/50 bg-background/50 hover:bg-background transition-colors hover:border-primary/20">
      <div className="inline-flex p-3 rounded-lg bg-primary/10 text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed text-sm">
        {description}
      </p>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-zinc-500 hover:text-white"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}



