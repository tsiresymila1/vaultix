"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Share2, Terminal, ArrowRight, Github } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="px-6 h-16 flex items-center justify-between border-b border-border/40 sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <Shield className="w-6 h-6 text-primary" />
          <span>Vaultix</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
          <Link href="#security" className="hover:text-foreground transition-colors">Security</Link>
          <Link href="#cli" className="hover:text-foreground transition-colors">CLI</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Get Started <ArrowRight className="ml-2 w-4 h-4" /></Button>
          </Link>
        </div>
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
            <Link href="https://github.com/tsiresymila/vaultix" target="_blank">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base w-full sm:w-auto gap-2">
                <Github className="w-5 h-5" /> View on GitHub
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
                title="Secure Sharing"
                description="Share vaults with team members using public-key cryptography. No shared passwords, ever."
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/40 text-center md:text-left bg-muted/20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 font-semibold text-muted-foreground">
            <Shield className="w-5 h-5" />
            <span>Vaultix</span>
          </div>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Vaultix. All rights reserved.
          </div>
        </div>
      </footer>
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
