import { requireOptionalNativeModule } from "expo-modules-core";

// Native bridge to the shared credential store that the OS autofill providers
// read (iOS App Group UserDefaults, Android EncryptedSharedPreferences).
// Optional: in Expo Go / before prebuild the native module is absent → no-ops.

export interface AutofillCredential {
  id: string;
  /** hostname to match against the current app/site (e.g. "github.com"). */
  domain: string;
  username: string;
  password: string;
}

const native = requireOptionalNativeModule<{
  save(json: string): void;
  clear(): void;
  isSupported(): boolean;
}>("VaultixAutofill");

/** Write the decrypted credential set to the OS-shared store for autofill. */
export function saveCredentials(credentials: AutofillCredential[]) {
  native?.save(JSON.stringify(credentials));
}

/** Wipe the shared credential store (call on sign out / lock). */
export function clearCredentials() {
  native?.clear();
}

export function isAutofillSupported(): boolean {
  return native?.isSupported() ?? false;
}
