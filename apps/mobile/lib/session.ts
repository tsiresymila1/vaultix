import * as SecureStore from "expo-secure-store";

// Persisted unlocked session (iOS Keychain / Android Keystore). Holds the token
// + the decrypted password-vault private key so the app reopens unlocked.
// (For a future autofill extension, move these to a shared App Group /
// EncryptedSharedPreferences so the extension can read them.)

const KEYS = {
  token: "vx_token",
  email: "vx_email",
  pwPublicKey: "vx_pw_pubk",
  pwPrivateKey: "vx_pw_pk",
} as const;

export interface Session {
  token: string;
  email: string;
  pwPublicKey: string;
  pwPrivateKey: string;
}

export async function saveSession(sess: Session) {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.token, sess.token),
    SecureStore.setItemAsync(KEYS.email, sess.email),
    SecureStore.setItemAsync(KEYS.pwPublicKey, sess.pwPublicKey),
    SecureStore.setItemAsync(KEYS.pwPrivateKey, sess.pwPrivateKey),
  ]);
}

export async function loadSession(): Promise<Session | null> {
  const [token, email, pwPublicKey, pwPrivateKey] = await Promise.all([
    SecureStore.getItemAsync(KEYS.token),
    SecureStore.getItemAsync(KEYS.email),
    SecureStore.getItemAsync(KEYS.pwPublicKey),
    SecureStore.getItemAsync(KEYS.pwPrivateKey),
  ]);
  if (!token || !email || !pwPublicKey || !pwPrivateKey) return null;
  return { token, email, pwPublicKey, pwPrivateKey };
}

export async function clearSession() {
  await Promise.all(Object.values(KEYS).map((k) => SecureStore.deleteItemAsync(k)));
}
