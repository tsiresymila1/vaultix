# Vaultix — Zero-Knowledge Secret Manager

Vaultix is a fully zero-knowledge, client-side encrypted secret manager built with Next.js, Supabase, and libsodium.

## Key Features

- **Client-side Encryption**: Secrets are encrypted/decrypted only on your device.
- **1Password Model**: Vault keys are encrypted per user with their public keys.
- **CLI Runtime Injection**: Inject secrets directly into your app's environment without `.env` files.
- **Supabase Theme**: Sleek, dark-first UI inspired by Supabase.

## setup

1. **Supabase Setup**:

   - Create a Supabase project.
   - Run the SQL in `supabase_schema.sql` in the SQL Editor.
   - Set the following in `.env.local`:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
     ```

2. **Run App**:

   ```bash
   npm install
   npm run dev
   ```

3. **Install CLI**:
   ```bash
   sh install.sh
   # CLI reads Supabase URL/anon key from the repo root `.env` by default
   # (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)
   ```

## CLI Usage

```bash
# Initialize local CLI config
vaultix init

# Login
vaultix login <email>

# Run application with secrets
vaultix run <vault> --env Production -- node app.js

# Tip: you can also run from source
cd cli
npm run build
node dist/cli.js --help
```

## Import secrets from a `.env` into a Vault (Web UI)

Open a vault → select an environment → click **Import .env**.

- You can upload a `.env` file or paste its contents.
- Vaultix encrypts values client-side and stores them as normal secrets.

## Security Model

- **Master Password**: Used to derive a master key (Argon2id).
- **User Key Pair (X25519)**: Private key encrypted by master key and stored in DB.
- **Vault Key (XChaCha20-Poly1305)**: Symmetric key generated per vault, encrypted for each member using their public key.
- **Secrets**: Encrypted with the symmetric vault key.
