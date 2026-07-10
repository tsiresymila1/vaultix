# Vaultix — Secret & Password Manager

Vaultix is an encrypted secret and password manager for modern teams. Manage
environment variables and share them across your team (like Infisical), keep a
shared password vault (like 1Password), and inject secrets into your apps via
the CLI or autofill them with the browser extension.

[**Visit Vaultix Secure**](https://vaultix-secure.vercel.app/)

## 🚀 Features

- **Vaults**: Environment variables grouped by environment (Development / Staging / Production), shareable with role-based team members, injectable via the CLI.
- **Password Manager**: Store logins + TOTP, share individual entries with teammates, and autofill them with the Chrome extension.
- **Passwordless login**: Sign in with an email magic code — no passwords to remember.
- **Developer CLI**: Inject secrets directly into your dev environment or CI/CD pipelines.
- **Encryption**: Content is encrypted with per-vault / per-entry keys (Libsodium XChaCha20-Poly1305); those keys are shared to members with public-key cryptography (X25519) and protected at rest by a server app key. Transport is TLS.

## 📦 CLI Installation

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/tsiresymila1/vaultix/main/cli/install.sh | sh
```

### Windows (PowerShell)

```powershell
iwr -useb https://raw.githubusercontent.com/tsiresymila1/vaultix/main/cli/install.ps1 | iex
```

## 🛠 Usage

### 1. Initialize & Login

```bash
vaultix login
```

This opens your browser to sign in with an email magic code. Once authenticated, the CLI receives a token and your identity key, and can decrypt the vaults you have access to.

### 2. Connect a Project

Navigate to your project directory and run:

```bash
vaultix init
```

Select the vault you want to link to this project. This creates a `vaultix.json` configuration file.

### 3. List Vaults & Environments

View your available vaults:

```bash
vaultix list
```

View environments within a specific vault:

```bash
vaultix env list [vault-name-or-id]
```

### 4. Inject Secrets

Run your application with secrets injected directly into the environment:

```bash
# Run with default environment (Development)
vaultix run -- npm start

# Run with a specific environment
vaultix run --env Production -- npm run build

# Run using a specific vault (overrides project config)
vaultix run --vault "My Vault" --env Staging -- ./deploy.sh
```

Vaultix fetches the encrypted secrets, decrypts them in memory, and spawns your process with the variables injected. Secrets are **never** written to disk.

### 5. Export Secrets (Optional)

If you need a `.env` file for tools that don't support runtime injection:

```bash
vaultix export --env Development > .env
```

### 6. Logout

Remove your local credentials:

```bash
vaultix logout
```

## 🔐 Security Model

Vaultix uses **two different models** for its two features:

**Vaults (server-managed, like Infisical)** — optimized for CLI / CI injection:
1.  **Login**: passwordless email magic code (via InstantDB).
2.  **Identity keypair (X25519)**: the private key is wrapped with the server app key (`SECRETS_ENC_KEY`, AES-256-GCM) and handed to the client after login — no master password. The server can decrypt vault content.
3.  **Vault keys (XChaCha20-Poly1305)**: each vault has a symmetric key sealed to each member's public key.

**Password manager (zero-knowledge, like 1Password)**:
4.  **Master password**: a separate password you set the first time you open your password vault. It never leaves your device — it derives (Argon2id) the key that decrypts a **second keypair** dedicated to passwords.
5.  **Entry keys**: each password entry has its own key, sealed to your password public key (and to each recipient's when shared). Only someone with the master password can decrypt — **the server cannot**.

Role-based access control (owner / moderator / read-only member) is enforced server-side on every write.

## 🏗 Monorepo layout

Turborepo + pnpm workspace:

```
apps/
  web/         Next.js web app (@vaultix/web)
  cli/         standalone CLI (@vaultix/cli)
  extension/   Chrome extension (@vaultix/extension)
packages/
  api/         Hono backend — routers/controllers/services (@vaultix/api)
  api-client/  typed Hono RPC client (@vaultix/api-client)
  crypto/      shared libsodium crypto (@vaultix/crypto)
  schema/      InstantDB schema + perms + entity types (@vaultix/schema)
```

The backend lives in `@vaultix/api` (web mounts it at `/api/[[...route]]`); web,
extension, and CLI all call it through the typed `@vaultix/api-client` RPC client.

## 🏗 Development Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/tsiresymila1/vaultix.git
   cd vaultix
   ```

2. **Install dependencies** (pnpm workspace — one install for everything)

   ```bash
   pnpm install
   ```

3. **Create an InstantDB app** — the schema lives in `packages/schema`:

   ```bash
   npx instant-cli@latest login
   cd packages/schema
   npx instant-cli@latest push schema --app <APP_ID> --yes
   npx instant-cli@latest push perms  --app <APP_ID> --yes
   cd ../..
   ```

4. **Environment Setup**
   Copy `apps/web/.env.exemple` to `apps/web/.env` and fill it in:

   ```
   NEXT_PUBLIC_INSTANT_APP_ID=your-instant-app-id
   INSTANT_ADMIN_TOKEN=your-instant-admin-token
   AUTH_JWT_SECRET=$(openssl rand -hex 32)
   CRON_SECRET=$(openssl rand -hex 16)
   ```

5. **Run** (turbo builds shared packages first, then starts the app)

   ```bash
   pnpm dev            # everything
   pnpm dev:web        # web app only
   pnpm build          # build all
   pnpm test           # run tests
   ```

   Web app → http://localhost:3000

**Deploy (Vercel):** set the project **Root Directory** to `apps/web`.
**Extension:** `apps/extension` — set `VITE_VAULTIX_URL` then `pnpm --filter @vaultix/extension build`.

### Authentication model

Login is a **passwordless email magic code** (via InstantDB). Vaults decrypt
immediately with a server-managed identity key (no master password) — great for
CLI/CI. The **password manager** is zero-knowledge: the first time you open it you
set a **master password** that unlocks a separate, client-only keypair; the server
can never decrypt your passwords.

## 📄 License

MIT
