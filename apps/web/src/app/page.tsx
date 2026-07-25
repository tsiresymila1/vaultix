"use client";

import { Button } from "@/components/ui/button";
import { motion } from "@/components/motion";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleDot,
  Copy,
  FileKey2,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  MoreHorizontal,
  Plus,
  Share2,
  ShieldCheck,
  Terminal,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";

const installCommands = {
  sh: "curl -fsSL https://raw.githubusercontent.com/tsiresymila1/vaultix/main/cli/install.sh | sh",
  ps1: "iwr -useb https://raw.githubusercontent.com/tsiresymila1/vaultix/main/cli/install.ps1 | iex",
} as const;

const productDetails = [
  {
    number: "01",
    icon: FileKey2,
    title: "Secrets that follow the project",
    description:
      "Organize environment variables by vault and stage. Inject them at runtime without leaving a plaintext .env file behind.",
    meta: "DEV / STAGE / PROD",
  },
  {
    number: "02",
    icon: KeyRound,
    title: "Passwords that stay with the team",
    description:
      "Store credentials, one-time codes, and notes in the same encrypted workspace. Share access without sharing the master password.",
    meta: "WEB / MOBILE / AUTOFILL",
  },
  {
    number: "03",
    icon: Users,
    title: "Access you can explain",
    description:
      "Owners, moderators, and members get explicit permissions. Remove a teammate once and their encrypted access is revoked.",
    meta: "OWNER / MODERATOR / MEMBER",
  },
] as const;

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground [letter-spacing:0]">
      <SiteHeader signedIn={Boolean(user)} />

      <main>
        <section className="relative min-h-[calc(100svh-8rem)] overflow-hidden border-b border-border">
          <div className="mx-auto max-w-7xl px-5 pt-14 sm:px-8 sm:pt-16 lg:px-10 lg:pt-20">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="relative z-10 max-w-2xl"
            >
              <motion.p variants={fadeInUp} className="mb-4 text-xs font-semibold uppercase text-[#62e6a7]">
                Secrets, passwords, team access
              </motion.p>
              <motion.h1 variants={fadeInUp} className="text-6xl font-semibold leading-none sm:text-7xl lg:text-[92px]">
                Vaultix
              </motion.h1>
              <motion.p variants={fadeInUp} className="mt-5 max-w-xl text-xl leading-snug text-[#c7d0cc] sm:text-2xl">
                The encrypted workspace between your team and everything it ships.
              </motion.p>
              <motion.p variants={fadeInUp} className="mt-4 max-w-xl text-sm leading-6 text-[#9aa49f] sm:text-base">
                Keep runtime secrets and shared credentials together. Your keys are created on your device; Vaultix only stores encrypted data.
              </motion.p>
              <motion.div variants={fadeInUp} className="mt-7 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="h-11 bg-[#62e6a7] px-5 text-[#07110c] hover:bg-[#7aebb6]">
                  <Link href={user ? "/vaults" : "/register"}>
                    {user ? "Open workspace" : "Create a workspace"}
                    <ArrowRight />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-11 border-white/15 bg-transparent px-5 text-[#f1f5f3] hover:bg-white/5 hover:text-white"
                >
                  <Link href="/docs">Read the docs</Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>

          <ProductPreview />
        </section>

        <ProofStrip />
        <ProductSection />
        <SecuritySection />
        <CliSection />
      </main>

      <SiteFooter />
    </div>
  );
}

function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-background/90 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex h-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10"
      >
        <Link href="/" className="flex items-center gap-2.5" aria-label="Vaultix home">
          <Image src="/preview.png" alt="" width={28} height={28} priority className="h-7 w-7 object-contain" />
          <span className="text-lg font-semibold">Vaultix</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-[#9ba6a1] md:flex" aria-label="Main navigation">
          <Link href="#product" className="transition-colors hover:text-white">Product</Link>
          <Link href="#security" className="transition-colors hover:text-white">Security</Link>
          <Link href="#cli" className="transition-colors hover:text-white">CLI</Link>
          <Link href="/share" className="flex items-center gap-1.5 transition-colors hover:text-white">
            Share a secret
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {signedIn ? (
            <Button asChild size="sm" className="bg-[#62e6a7] text-[#07110c] hover:bg-[#7aebb6]">
              <Link href="/vaults">Workspace</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden text-[#b5bfba] hover:bg-white/5 hover:text-white sm:inline-flex">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-[#62e6a7] text-[#07110c] hover:bg-[#7aebb6]">
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </header>
  );
}

function ProductPreview() {
  const secrets = [
    { name: "DATABASE_URL", scope: "Production", updated: "2m ago", tone: "text-[#62e6a7]" },
    { name: "STRIPE_SECRET_KEY", scope: "Production", updated: "1d ago", tone: "text-[#7eb6ff]" },
    { name: "RESEND_API_KEY", scope: "Development", updated: "3d ago", tone: "text-[#f6c86b]" },
  ];

  return (
    <div className="absolute bottom-[-118px] left-5 right-5 h-[360px] sm:bottom-[-102px] sm:left-8 sm:right-8 sm:h-[390px] lg:left-1/2 lg:right-auto lg:h-[430px] lg:w-[min(1180px,calc(100vw-80px))] lg:-translate-x-1/2">
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="h-full overflow-hidden rounded-lg border border-white/15 bg-[#101619] shadow-[0_30px_90px_rgba(0,0,0,0.35)]"
      >
      <div className="flex h-11 items-center justify-between border-b border-white/10 bg-[#131a1d] px-4">
        <div className="flex items-center gap-2 text-xs text-[#8e9a95]">
          <ShieldCheck className="h-4 w-4 text-[#62e6a7]" />
          <span className="hidden sm:inline">acme /</span>
          <span className="text-[#dce3df]">payments-api</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 text-xs text-[#7d8984] sm:flex">
            <CircleDot className="h-3 w-3 text-[#62e6a7]" /> synced now
          </span>
          <button className="flex h-8 w-8 items-center justify-center text-[#7d8984]" aria-label="More options">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100%-44px)]">
        <aside className="hidden w-48 shrink-0 border-r border-white/10 p-3 md:block">
          <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase text-[#66726d]">Workspace</p>
          <PreviewNav icon={FileKey2} label="Vaults" active />
          <PreviewNav icon={KeyRound} label="Passwords" />
          <PreviewNav icon={Users} label="Members" />
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="px-2 pb-2 text-[10px] font-semibold uppercase text-[#66726d]">Environments</p>
            {[
              ["Production", "#62e6a7"],
              ["Staging", "#7eb6ff"],
              ["Development", "#f6c86b"],
            ].map(([label, color]) => (
              <div key={label} className="flex h-8 items-center gap-2 px-2 text-xs text-[#94a09b]">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-[#edf3f0]">payments-api</p>
              <p className="mt-0.5 text-xs text-[#75817c]">12 encrypted secrets · 4 members</p>
            </div>
            <button className="flex h-8 items-center gap-1.5 rounded-md bg-[#62e6a7] px-3 text-xs font-semibold text-[#07110c]">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add secret</span>
            </button>
          </div>

          <div className="mt-5 flex h-9 items-center gap-2 border-b border-white/10 text-xs">
            <span className="flex h-9 items-center border-b border-[#62e6a7] px-1 text-[#e6ece9]">Secrets</span>
            <span className="px-3 text-[#74807b]">Access</span>
            <span className="px-3 text-[#74807b]">Activity</span>
          </div>

          <div className="mt-1">
            {secrets.map((secret, index) => (
              <motion.div
                key={secret.name}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.48 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="grid h-[58px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-white/[0.07] sm:grid-cols-[minmax(0,1fr)_120px_70px]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.05]">
                    <LockKeyhole className={cn("h-3.5 w-3.5", secret.tone)} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-[#dce4e0]">{secret.name}</p>
                    <p className="mt-1 font-mono text-[10px] text-[#55615c]">••••••••••••••••••••</p>
                  </div>
                </div>
                <span className="hidden text-[11px] text-[#7f8b86] sm:block">{secret.scope}</span>
                <span className="text-right text-[11px] text-[#5e6964]">{secret.updated}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <aside className="hidden w-64 shrink-0 border-l border-white/10 p-5 xl:block">
          <p className="text-xs font-semibold text-[#dbe2de]">Run with Vaultix</p>
          <p className="mt-1 text-xs leading-5 text-[#74807b]">Inject this vault into a local command without writing to disk.</p>
          <div className="mt-4 rounded-md border border-white/10 bg-[#090d0f] p-3 font-mono text-[11px] leading-5 text-[#a9b4af]">
            <span className="text-[#62e6a7]">$</span> vaultix run --<br />npm run dev
          </div>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-[#62e6a7]">
            <Check className="h-3.5 w-3.5" />
            12 secrets injected
          </div>
        </aside>
      </div>
      </motion.div>
    </div>
  );
}

function PreviewNav({ icon: Icon, label, active = false }: { icon: typeof FileKey2; label: string; active?: boolean }) {
  return (
    <div className={cn("flex h-9 items-center gap-2.5 rounded-md px-2 text-xs", active ? "bg-white/[0.06] text-[#edf3f0]" : "text-[#7d8984]")}>
      <Icon className={cn("h-3.5 w-3.5", active ? "text-[#62e6a7]" : "")} />
      {label}
    </div>
  );
}

function ProofStrip() {
  const proof = [
    ["Encryption", "XChaCha20-Poly1305"],
    ["Key exchange", "Public-key cryptography"],
    ["Plaintext storage", "Never"],
    ["CLI", "macOS · Linux · Windows"],
  ];

  return (
    <section aria-label="Security facts" className="border-b border-border bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-2 px-5 sm:px-8 lg:grid-cols-4 lg:px-10">
        {proof.map(([label, value], index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: false, margin: "-24px", amount: 0.2 }}
            transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className={cn("border-border py-7", index % 2 === 0 ? "pr-4" : "border-l pl-4", index > 1 ? "border-t lg:border-t-0" : "", index > 0 ? "lg:border-l lg:pl-6" : "lg:pr-6")}
          >
            <p className="text-[11px] uppercase text-[#69756f]">{label}</p>
            <p className="mt-2 text-sm font-medium text-[#d7dfdb]">{value}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function ProductSection() {
  return (
    <section id="product" className="border-b border-border bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <ScrollReveal direction="left">
            <p className="text-xs font-semibold uppercase text-[#7eb6ff]">One encrypted workspace</p>
            <h2 className="mt-4 max-w-md text-4xl font-semibold leading-tight sm:text-5xl">
              Built around how a team actually works.
            </h2>
            <p className="mt-6 max-w-md text-base leading-7 text-[#89958f]">
              Vaultix is not another dashboard that asks you to move work into it. It sits between your team, the terminal, and the browser.
            </p>
          </ScrollReveal>

          <div className="border-t border-border">
            {productDetails.map((detail, index) => (
              <ScrollReveal
                key={detail.number}
                delay={index * 0.06}
                direction={index % 2 === 0 ? "right" : "left"}
                className="grid gap-5 border-b border-border py-7 sm:grid-cols-[40px_1fr_auto] sm:gap-6 sm:py-9"
              >
                <span className="font-mono text-xs text-[#56625d]">{detail.number}</span>
                <div>
                  <div className="flex items-center gap-3">
                    <detail.icon className="h-5 w-5 text-[#62e6a7]" />
                    <h3 className="text-xl font-semibold">{detail.title}</h3>
                  </div>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-[#87938e]">{detail.description}</p>
                </div>
                <span className="hidden self-start pt-1 font-mono text-[10px] text-[#5e6a65] xl:block">{detail.meta}</span>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  return (
    <section id="security" className="bg-[#edf2ef] py-20 text-[#111714] sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-end">
          <ScrollReveal direction="left">
            <p className="text-xs font-semibold uppercase text-[#247a56]">Security model</p>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight sm:text-6xl">
              The server can store it. It cannot read it.
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.08} direction="right" className="lg:pb-2">
            <p className="max-w-xl text-base leading-7 text-[#51605a]">
              Encryption and decryption happen on your device. Every vault gets its own key, then that key is sealed separately for each authorized member.
            </p>
          </ScrollReveal>
        </div>

        <div className="mt-14 grid border-y border-[#111714]/15 md:grid-cols-3">
          <SecurityStep icon={Fingerprint} number="01" title="Keys begin locally" description="Your identity keys are generated in the client and protected by your credentials." />
          <SecurityStep icon={LockKeyhole} number="02" title="Data leaves encrypted" description="Secrets are encrypted before they cross the network or reach persistent storage." delay={0.08} bordered />
          <SecurityStep icon={Share2} number="03" title="Access is individually sealed" description="Sharing grants a recipient an encrypted key, never a copy of the plaintext secret." delay={0.16} />
        </div>

        <ScrollReveal className="mt-8 flex flex-col justify-between gap-4 text-sm text-[#53615b] sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#247a56]" />
            Zero-knowledge password vault
          </div>
          <Link href="/docs" className="flex items-center gap-1.5 font-medium text-[#17231e] hover:text-[#247a56]">
            Read the security documentation <ArrowRight className="h-4 w-4" />
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}

function SecurityStep({ icon: Icon, number, title, description, bordered = false, delay = 0 }: { icon: typeof Fingerprint; number: string; title: string; description: string; bordered?: boolean; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.975 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: false, margin: "-64px", amount: 0.2 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn("py-8 md:px-8 md:py-10", bordered ? "border-y border-[#111714]/15 md:border-x md:border-y-0" : "")}
    >
      <div className="flex items-center justify-between">
        <Icon className="h-6 w-6 text-[#247a56]" />
        <span className="font-mono text-xs text-[#7b8882]">{number}</span>
      </div>
      <h3 className="mt-10 text-lg font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#64716b]">{description}</p>
    </motion.div>
  );
}

function CliSection() {
  return (
    <section id="cli" className="border-b border-border bg-background py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-center lg:gap-20 lg:px-10">
        <ScrollReveal direction="left">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#f6c86b]/25 bg-[#f6c86b]/10">
            <Terminal className="h-5 w-5 text-[#f6c86b]" />
          </div>
          <h2 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl">Secrets arrive with the command.</h2>
          <p className="mt-5 max-w-md text-base leading-7 text-[#87938e]">
            Authenticate once, choose a vault, and run any process with its secrets injected into memory.
          </p>
          <div className="mt-7 flex items-center gap-5 text-sm">
            <Link href="/docs" className="flex items-center gap-1.5 text-[#dfe6e2] hover:text-[#62e6a7]">
              CLI reference <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-[#59645f]">No daemon required</span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1} direction="right">
          <InstallCommand />
        </ScrollReveal>
      </div>
    </section>
  );
}

function InstallCommand() {
  const [os, setOs] = useState<keyof typeof installCommands>("sh");

  return (
    <div className="overflow-hidden rounded-lg border border-white/15 bg-[#0f1517]">
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-3 py-2 sm:px-4">
        <div className="flex rounded-md bg-white/[0.05] p-0.5" aria-label="Operating system">
          <button onClick={() => setOs("sh")} className={cn("h-8 rounded-md px-3 text-xs", os === "sh" ? "bg-[#263035] text-white" : "text-[#7f8b86] hover:text-white")}>macOS / Linux</button>
          <button onClick={() => setOs("ps1")} className={cn("h-8 rounded-md px-3 text-xs", os === "ps1" ? "bg-[#263035] text-white" : "text-[#7f8b86] hover:text-white")}>Windows</button>
        </div>
        <CopyButton text={installCommands[os]} />
      </div>
      <div className="min-h-60 overflow-x-auto px-5 py-6 font-mono text-xs leading-6 sm:px-7 sm:text-sm">
        <p className="whitespace-nowrap text-[#c5cfca]">
          <span className="mr-2 text-[#62e6a7]">{os === "sh" ? "$" : "PS >"}</span>
          {os === "sh" ? "curl -fsSL https://vaultix.dev/install.sh | sh" : "iwr -useb https://vaultix.dev/install.ps1 | iex"}
        </p>
        <div className="mt-7 border-l border-white/10 pl-4 text-[#68746f]">
          <p>Resolving latest release...</p>
          <p>Installing vaultix to your PATH...</p>
          <p className="mt-3 text-[#62e6a7]">Vaultix CLI installed</p>
        </div>
        <p className="mt-6 whitespace-nowrap text-[#c5cfca]"><span className="mr-2 text-[#62e6a7]">$</span>vaultix run -- npm run dev</p>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button onClick={copy} className="flex h-8 w-8 items-center justify-center rounded-md text-[#7f8b86] transition-colors hover:bg-white/[0.06] hover:text-white" aria-label="Copy install command">
      {copied ? <Check className="h-4 w-4 text-[#62e6a7]" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
}) {
  const offset = {
    up: { x: 0, y: 24 },
    left: { x: -26, y: 0 },
    right: { x: 26, y: 0 },
  }[direction];

  return (
    <motion.div
      initial={{ opacity: 0, x: offset.x, y: offset.y, scale: 0.985 }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: false, margin: "-72px", amount: 0.18 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SiteFooter() {
  return (
    <footer className="bg-background">
      <ScrollReveal className="mx-auto flex max-w-7xl flex-col gap-10 px-5 py-12 sm:px-8 md:flex-row md:items-end md:justify-between lg:px-10">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/preview.png" alt="" width={26} height={26} className="h-6 w-6 object-contain" />
            <span className="font-semibold">Vaultix</span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-[#707c76]">Encrypted secrets and passwords for teams that ship software.</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#7d8984]">
          <Link href="/docs" className="hover:text-white">Docs</Link>
          <Link href="/privacy-policy" className="hover:text-white">Privacy</Link>
          <Link href="/data-deletion" className="hover:text-white">Data deletion</Link>
          <span>© {new Date().getFullYear()} Vaultix</span>
        </div>
      </ScrollReveal>
    </footer>
  );
}
