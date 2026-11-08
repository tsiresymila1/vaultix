# @vaultix/mobile

Vaultix mobile app (Expo + Expo Router + NativeWind). A 1Password-style password
manager: magic-code login, master-password unlock, browse + reveal + copy your
passwords. Shares the web design system (Poppins font, Vaultix green primary,
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

## Native Material UI

All mobile screens use Expo UI controls: Material / Jetpack Compose on Android,
SwiftUI on iOS. This includes authentication and password forms, buttons,
segmented filters, list rows, loading indicators, scrolling, pull-to-refresh,
and dialogs. Android navigation uses Material `NavigationBar`; iOS uses Expo
Router's native tabs. React Native remains the screen layout and typography
layer, hosted through `RNHostView` where Compose/SwiftUI embeds screen content.
The shared auth, encryption, favorites and autofill behavior is unchanged.

Rebuild the native app after installing `@expo/ui`; restarting Metro alone cannot
add the native module. Verify on device: login with email/OTP, switch all tabs,
refresh empty/populated lists, search/filter/favorite, create/edit a password,
generate a password and toggle visibility, cancel unlock, enter a wrong password,
retry, then unlock successfully and open another entry without a second prompt.
Check project environments and reveal/copy, sign out, system gesture and three-button
navigation, keyboard show/hide, large fonts and TalkBack/VoiceOver.
Measure release APK size when comparing releases.

## Auth / crypto flow

```
magic code (InstantDB)  →  mint Vaultix JWT (/api/auth/token/mint)
                        →  GET /api/extension/me  (pw_* material)
                        →  InstantDB live query (encrypted entries + sealed keys)
                        →  open an entry → master-password dialog
                        →  Argon2id → decrypt vault private key (session memory)
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

## Unlocking and Android downloads

Email + verification code completes sign-in. Opening a password entry (or its
create/edit route) opens a custom Material dialog for the password-vault master
password. The decrypted key is reused in memory for this app session; only the
auth token and encrypted key material persist. Upgrading from the old persisted
unlocked session requires signing in again. Signing out clears the autofill cache.
Project secrets use the separate identity key, as on the web; their detail screen
lists environments and allows revealing/copying individual variables.

The release now provides one signed APK per ABI, plus `SHA256SUMS`. Most current
Android phones use `android-arm64-v8a.apk`; older 32-bit devices use
`android-armeabi-v7a.apk`, and x86/x86_64 files are for matching devices/emulators.
Native libraries use compressed packaging. This reduces each download compared
with the former universal 113 MB APK without dropping architecture support.
Exact output sizes must be checked after building the new release.
