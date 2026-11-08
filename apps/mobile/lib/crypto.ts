import sodium from "react-native-libsodium";

// Native libsodium — matches the web password-vault crypto exactly.
// Password vault is zero-knowledge: the master password derives a key (Argon2id)
// that decrypts the vault's private key. That private key unseals each entry's
// key; the entry key decrypts the content.

let ready = false;
async function s() {
  if (!ready) {
    await sodium.ready;
    ready = true;
  }
  return sodium;
}

/** Argon2id KDF: master password + salt → 32-byte master key. */
export async function deriveMasterKey(password: string, saltBase64: string): Promise<Uint8Array> {
  const lib = await s();
  return lib.crypto_pwhash(
    32,
    password,
    decode(lib, saltBase64),
    2,
    67108864,
    2,
  );
}

/** Decrypt the vault private key with the master key (crypto_secretbox). */
export async function decryptPrivateKey(
  cipherBase64: string,
  nonceBase64: string,
  masterKey: Uint8Array,
): Promise<string> {
  const lib = await s();
  const priv = lib.crypto_secretbox_open_easy(
    decode(lib, cipherBase64),
    decode(lib, nonceBase64),
    masterKey,
  );
  return lib.to_base64(priv);
}

/** Generate a random password (CSPRNG via libsodium). */
export async function generatePassword(length = 18): Promise<string> {
  const lib = await s();
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_";
  const bytes = lib.randombytes_buf(length);
  let out = "";
  for (let i = 0; i < length; i++) out += charset[bytes[i] % charset.length];
  return out;
}

/** Generate a fresh symmetric entry key (base64). */
export async function generateEntryKey(): Promise<string> {
  const lib = await s();
  return lib.to_base64(lib.crypto_aead_xchacha20poly1305_ietf_keygen());
}

// The native adapter requires string AD; an empty string is byte-equivalent to web null AD.
/** Encrypt content with a symmetric key → { cipher, nonce } (both base64). */
export async function encryptSecret(
  plaintext: string,
  keyBase64: string,
): Promise<{ cipher: string; nonce: string }> {
  const lib = await s();
  const nonce = lib.randombytes_buf(lib.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const cipher = lib.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext,
    "",
    null,
    nonce,
    decode(lib, keyBase64),
  );
  return { cipher: lib.to_base64(cipher), nonce: lib.to_base64(nonce) };
}

/** Seal a key to a public key (anonymous crypto_box_seal) → base64. */
export async function sealKey(keyBase64: string, publicKeyBase64: string): Promise<string> {
  const lib = await s();
  return lib.to_base64(
    lib.crypto_box_seal(decode(lib, keyBase64), decode(lib, publicKeyBase64)),
  );
}

/** Unseal a key sealed to our public key (crypto_box_seal). */
export async function unsealKey(
  sealedBase64: string,
  publicKeyBase64: string,
  privateKeyBase64: string,
): Promise<string> {
  const lib = await s();
  const opened = lib.crypto_box_seal_open(
    decode(lib, sealedBase64),
    decode(lib, publicKeyBase64),
    decode(lib, privateKeyBase64),
  );
  return lib.to_base64(opened);
}

/** Decrypt content with a symmetric key (XChaCha20-Poly1305 IETF). */
export async function decryptSecret(
  cipherBase64: string,
  nonceBase64: string,
  keyBase64: string,
): Promise<string> {
  const lib = await s();
  const plain = lib.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    decode(lib, cipherBase64),
    "",
    decode(lib, nonceBase64),
    decode(lib, keyBase64),
  );
  return lib.to_string(plain);
}

function decode(lib: typeof sodium, value: string): Uint8Array {
  return lib.from_base64(value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), lib.base64_variants.URLSAFE_NO_PADDING);
}
