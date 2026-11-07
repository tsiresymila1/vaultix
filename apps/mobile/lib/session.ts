import * as SecureStore from "expo-secure-store";

// Persist authentication and encrypted key material only. Decrypted keys live in memory.
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
  pwEncryptedPrivateKey?: string;
  pwPrivateKeyNonce?: string;
  pwSalt?: string;
}

export async function saveSession(sess: Session) {
  const { pwPrivateKey: _privateKey, ...encrypted } = sess;
  await SecureStore.setItemAsync("vx_auth", JSON.stringify(encrypted));
  await SecureStore.deleteItemAsync(KEYS.pwPrivateKey);
}

export async function loadSession(): Promise<Session | null> {
  const raw = await SecureStore.getItemAsync("vx_auth");
  if (!raw) { await clearSession(); return null; }
  const value = JSON.parse(raw);
  if (typeof value.token !== "string" || typeof value.email !== "string") return null;
  return { ...value, pwPrivateKey: "" };
}

export async function clearSession() {
  await Promise.all([...Object.values(KEYS), "vx_auth"].map(k => SecureStore.deleteItemAsync(k)));
}
