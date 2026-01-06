# Vaultix — Zero-Knowledge Secret Manager

Vaultix is a fully zero-knowledge, client-side encrypted secret manager for modern teams. Securely share environment variables, API keys, and certificates with your team without ever exposing them to the server.

[**Visit Vaultix Secure**](https://vaultix-secure.vercel.app/)

## 🚀 Features

- **End-to-End Encryption**: Secrets are encrypted client-side using Libsodium (Argon2id + XChaCha20-Poly1305). Only you hold the keys.
- **Developer CLI**: Inject secrets directly into your development environment or CI/CD pipelines with our robust standalone CLI tool.
- **Secure Sharing**: Share vaults with team members using public-key cryptography. No shared passwords, ever.
- **Zero-Knowledge Architecture**: We cannot see your secrets, even if we wanted to.

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

This will open your browser to authenticate. Once logged in, your encrypted private key is downloaded and decrypted locally using your master password.

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

1.  **Master Password**: Your master password is never sent to the server. It is heavily hashed (Argon2id) locally to derived your **Master Key**.
2.  **User Identity (X25519)**: When you register, we generate a Curve25519 keypair. Your private key is encrypted with your Master Key and stored.
3.  **Vault Keys (XChaCha20-Poly1305)**: Each vault has a unique symmetric key. This key is encrypted for each member of the vault using their public key.
4.  **Secret Encryption**: Secrets are encrypted with the Vault Key.

This ensures that only authenticated members with the correct master password can ever decrypt the vault's contents.

## 🏗 Development Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/tsiresymila1/vaultix.git
   cd vaultix
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file with your Supabase credentials:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## 📄 License

MIT
