// Crypto functions using global sodium (loaded via script tag)
declare const sodium: any;

export async function initSodium(): Promise<void> {
  if (typeof sodium !== 'undefined') {
    await sodium.ready;
  }
}

export async function deriveMasterKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  await sodium.ready;
  return sodium.crypto_pwhash(32, sodium.from_string(password), salt, 2, 64 * 1024);
}

export async function toBase64(data: Uint8Array): Promise<string> {
  await sodium.ready;
  return sodium.to_base64(data);
}

export async function fromBase64(data: string): Promise<Uint8Array> {
  await sodium.ready;
  return sodium.from_base64(data);
}

export async function encryptSecret(plaintext: string, vaultKeyBase64: string): Promise<{ cipher: string; nonce: string }> {
  await sodium.ready;
  const key = sodium.from_base64(vaultKeyBase64);
  const nonce = sodium.randombytes_buf(24);
  const cipher = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, null, nonce, key);
  return { cipher: sodium.to_base64(cipher), nonce: sodium.to_base64(nonce) };
}

export async function decryptSecret(cipherBase64: string, nonceBase64: string, vaultKeyBase64: string): Promise<string> {
  await sodium.ready;
  const decrypted = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null, sodium.from_base64(cipherBase64), null, sodium.from_base64(nonceBase64), sodium.from_base64(vaultKeyBase64)
  );
  return sodium.to_string(decrypted);
}

export async function decryptPrivateKey(cipherBase64: string, nonceBase64: string, masterKey: Uint8Array): Promise<string> {
  await sodium.ready;
  const decrypted = sodium.crypto_secretbox_open_easy(sodium.from_base64(cipherBase64), sodium.from_base64(nonceBase64), masterKey);
  return sodium.to_string(decrypted);
}

export async function generateUserKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  await sodium.ready;
  const keyPair = sodium.crypto_box_keypair();
  return { publicKey: sodium.to_base64(keyPair.publicKey), privateKey: sodium.to_base64(keyPair.privateKey) };
}