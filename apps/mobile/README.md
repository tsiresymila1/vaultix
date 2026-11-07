# @vaultix/mobile

Vaultix mobile app (Expo + Expo Router + NativeWind). A 1Password-style password
manager: magic-code login, master-password unlock, browse + reveal + copy your
passwords. Shares the web design system (Outfit font, Supabase-green primary,
Shield logo) and the same typed Hono RPC backend (`@vaultix/api-client`).

## Stack

- **Expo (SDK 57)** + **Expo Router** (file-based nav, typed routes)
- **NativeWind v4** — Tailwind theme mirrored from web (`tailwind.config.js`)
- **Moti** — fluid fade / stagger motion
- **react-native-libsodium** — native crypto (matches the web envelope model)
- **@instantdb/react-native** — passwordless auth + live vault/password queries
- **expo-secure-store** — Keychain / Keystore session

## Run

```bash
pnpm install                      # from the repo root (workspace)
cd apps/mobile

# env
export EXPO_PUBLIC_INSTANT_APP_ID=<your-instant-app-id>
export EXPO_PUBLIC_VAULTIX_URL=http://<your-lan-ip>:3000   # or the deployed URL

# native crypto needs a dev build (not Expo Go):
npx expo prebuild
npx expo run:ios      # or: npx expo run:android
```

> `react-native-libsodium` is a native module, so use a **dev build** (`expo run:*`)
> — it won't work in Expo Go.

## Auth / crypto flow

```
magic code (InstantDB)  →  mint Vaultix JWT (/api/auth/token/mint)
                        →  GET /api/extension/me  (pw_* material)
                        →  master password → Argon2id → decrypt vault private key
                        →  InstantDB live query (encrypted entries + sealed keys)
                        →  unseal entry key → decrypt (on device)
```

## Native identity

Android application ID and iOS bundle ID: `ts.mila.vaultix`.
The local Android autofill module and service use `ts.mila.vaultix.autofill`;
Expo autolinking points to the matching Kotlin class.

## Android APK release

The `Release Vaultix` GitHub Actions workflow runs for every `v*` tag. It builds
the CLI binaries and a signed Android APK in parallel, stores them as workflow
artifacts, verifies the APK signature, then publishes the APK and its SHA-256 checksum to GitHub Releases.
CLI binaries publish independently to the same release: a CLI packaging failure
does not block the Android release. The APK is a standalone release build
with its JS bundle included; Metro is not required. You can also run the workflow
manually with an existing version tag.

Configure these GitHub repository variables:

- `EXPO_PUBLIC_INSTANT_APP_ID`
- `EXPO_PUBLIC_VAULTIX_URL`

Configure these GitHub repository secrets:

- `ANDROID_KEYSTORE_BASE64` — base64-encoded release keystore
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Create a keystore once, then encode it for the secret:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore vaultix-release.keystore \
  -alias vaultix -keyalg RSA -keysize 2048 -validity 10000
base64 < vaultix-release.keystore | tr -d '\n'
```

Build an APK locally with the debug signing fallback:

```bash
pnpm mobile:apk
```

After the repository variables and secrets are configured, publish with:

```bash
pnpm release v1.2.3
```

## Structure

```
app/                     Expo Router
  _layout.tsx            fonts (Outfit) + AuthProvider + theme
  (auth)/login.tsx       email → code → master-password unlock
  (app)/(tabs)/          Passwords list + Settings
  (app)/password/[id]    entry detail (reveal / copy)
lib/                     api · instant · crypto · session · auth · passwords
components/              Button · Input · Card · Logo · motion
```

## Native autofill (system-wide login injection)

After unlock, the authenticated app layout synchronizes credentials, including an
empty list after the last deletion. Pending decryptions are cancelled on logout,
unmount, or replacement by a newer snapshot. Failed synchronizations are logged
without credentials.

- **Android:** encrypted shared preferences, exact website hostname matching.
  In Settings → System autofill, tap Enable to select Vaultix; the status refreshes
  on return. For a native app, explicitly set the entry website to
  `androidapp://com.example.app` (its exact Android package). Website entries are
  never automatically associated with unrelated native apps or subdomains.
- **iOS:** shared Keychain with `AfterFirstUnlockThisDeviceOnly`, exact hostname
  matching, and system credential identity registration. The prebuild plugin
  creates and embeds the credential-provider extension and configures shared
  Keychain/App Group entitlements. Run `pnpm mobile:prebuild`, then build with
  Xcode using your Apple development team and provisioning profiles for **both**
  `ts.mila.vaultix` and `ts.mila.vaultix.autofill`. Enable the App Group
  `group.ts.mila.vaultix` on both identifiers in the Apple developer account.
  Enable Vaultix in iOS AutoFill settings; the app checks the identity-store state.

Credentials remain available to system autofill after closing the app until
sign-out. The encrypted local cache is deliberate; per-fill biometric approval
and capturing new logins from other apps are not implemented.

## Verification

```bash
node --test apps/mobile/tests/*.test.cjs   # Node 24+
pnpm --filter @vaultix/mobile typecheck
pnpm mobile:android
```

On a device: enable Vaultix, unlock, add a login for the exact test website,
check the username/password suggestion there, verify it is absent on another
hostname, remove the login and check it disappears. Repeat with an explicit
Android package association. Start a sync then sign out and verify no suggestions
remain. Test empty vaults, shared-entry revocation, and returning from system settings.
For iOS, repeat in Safari and verify the embedded extension appears in AutoFill.

## Mobile interface

The native app follows the approved compact Material Expressive prototype in
`design/vaultix-mobile-proposal.html`: light surfaces, platform sans-serif type,
three destinations (Identifiants, Coffres, Réglages), account sign-in/code/unlock,
and device-local favorites stored with SecureStore per account. Favorites do not
sync between devices. Vaults retain the real project/environment model.

Entry icons use local key glyphs so a third-party favicon service never receives
private vault domains. Autofill activation remains under Réglages. Existing
password creation, editing, decryption, copying, deletion and shared-entry access
continue to use the real backend.
