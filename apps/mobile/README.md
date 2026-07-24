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
- **@instantdb/react-native** — passwordless magic-code auth
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
                        →  GET /api/extension/passwords (entries + sealed_key)
                        →  unseal entry key → decrypt (on device)
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

Wired. After unlock, [lib/autofill.ts](lib/autofill.ts) decrypts every entry and
publishes `{domain, username, password}` to a **shared secure store** via the local
native module [modules/vaultix-autofill](modules/vaultix-autofill) (iOS App Group
`UserDefaults`, Android `EncryptedSharedPreferences`). The OS autofill providers
read that store:

- **iOS** — AutoFill Credential Provider Extension: [autofill/ios/CredentialProviderViewController.swift](autofill/ios/CredentialProviderViewController.swift)
- **Android** — `AutofillService`: [autofill/android/VaultixAutofillService.kt](autofill/android/VaultixAutofillService.kt)

The config plugin [plugins/withVaultixAutofill.js](plugins/withVaultixAutofill.js)
wires it on `expo prebuild`:

- **Android (automatic)** — registers the `AutofillService` in the manifest, copies
  the Kotlin service + `res/xml`, adds `androidx.security` dep. After install: enable
  Vaultix under *Settings → Passwords & accounts → Autofill service*.
- **iOS** — adds the App Group entitlement to the main app. **One manual Xcode step
  remains**: add an *AutoFill Credential Provider Extension* target
  (`File → New → Target`), set its sources to `autofill/ios/*`, its Info.plist to
  `autofill/ios/Info.plist`, and its entitlements to `autofill/ios/VaultixAutofill.entitlements`
  (App Group `group.ts.mila.vaultix`). Reliable pbxproj target creation isn't scripted
  here. After install: enable Vaultix under *Settings → Passwords → AutoFill Passwords*.

**Security note (scaffold trade):** the app caches decrypted credentials in the
OS-encrypted shared store so the extension can offer them without re-unlocking.
Upgrade path: have the extension unseal on demand from the wrapped material instead.
Reference implementation: Bitwarden mobile (open source).
