import { describe, expect, it } from "vitest";
import {
  decryptPrivateKey,
  decryptSecret,
  decryptVaultKeyWithPrivateKey,
  deriveMasterKey,
  encryptPrivateKey,
  encryptSecret,
  encryptVaultKeyForUser,
  fromBase64,
  generateSalt,
  generateUserKeyPair,
  generateVaultKey,
  toBase64,
} from "@/lib/crypto";

describe("deriveMasterKey", () => {
  it("is deterministic for the same password + salt", async () => {
    const salt = await generateSalt();
    const a = await deriveMasterKey("correct horse battery staple", salt);
    const b = await deriveMasterKey("correct horse battery staple", salt);
    expect(toBase64Sync(a)).toBe(toBase64Sync(b));
  });

  it("differs for a different salt", async () => {
    const salt1 = await generateSalt();
    const salt2 = await generateSalt();
    const a = await deriveMasterKey("same-password", salt1);
    const b = await deriveMasterKey("same-password", salt2);
    expect(toBase64Sync(a)).not.toBe(toBase64Sync(b));
  });
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a plaintext with a generated vault key", async () => {
    const vaultKey = await generateVaultKey();
    const plaintext = "super-secret-value-🔐";
    const { cipher, nonce } = await encryptSecret(plaintext, vaultKey);
    const decrypted = await decryptSecret(cipher, nonce, vaultKey);
    expect(decrypted).toBe(plaintext);
  });

  it("fails to decrypt with the wrong key", async () => {
    const vaultKey = await generateVaultKey();
    const wrongKey = await generateVaultKey();
    const { cipher, nonce } = await encryptSecret("hello", vaultKey);
    await expect(decryptSecret(cipher, nonce, wrongKey)).rejects.toThrow();
  });
});

describe("private key encryption", () => {
  it("round-trips a private key through a master key", async () => {
    const salt = await generateSalt();
    const masterKey = await deriveMasterKey("master-password", salt);
    const keyPair = await generateUserKeyPair();

    const { cipher, nonce } = await encryptPrivateKey(keyPair.privateKey, masterKey);
    const decrypted = await decryptPrivateKey(cipher, nonce, masterKey);
    expect(decrypted).toBe(keyPair.privateKey);
  });
});

describe("vault key sharing", () => {
  it("seals a vault key for a user and opens it with their keypair", async () => {
    const vaultKey = await generateVaultKey();
    const keyPair = await generateUserKeyPair();

    const sealed = await encryptVaultKeyForUser(vaultKey, keyPair.publicKey);
    const opened = await decryptVaultKeyWithPrivateKey(
      sealed,
      keyPair.publicKey,
      keyPair.privateKey
    );
    expect(opened).toBe(vaultKey);
  });
});

describe("password envelope model (per-entry key + sharing)", () => {
  it("owner and recipient both recover the same content; edits stay shared", async () => {
    const owner = await generateUserKeyPair();
    const recipient = await generateUserKeyPair();
    const stranger = await generateUserKeyPair();

    // Create: content encrypted with a per-entry key sealed to the owner.
    const entryKey = await generateVaultKey();
    const v1 = await encryptSecret("password-v1", entryKey);
    const ownerEncryptedKey = await encryptVaultKeyForUser(entryKey, owner.publicKey);

    // Owner decrypts.
    const ownerKey = await decryptVaultKeyWithPrivateKey(
      ownerEncryptedKey,
      owner.publicKey,
      owner.privateKey,
    );
    expect(await decryptSecret(v1.cipher, v1.nonce, ownerKey)).toBe("password-v1");

    // Share: seal the SAME entry key to the recipient (a grant, not a copy).
    const recipientEncryptedKey = await encryptVaultKeyForUser(entryKey, recipient.publicKey);
    const recKey = await decryptVaultKeyWithPrivateKey(
      recipientEncryptedKey,
      recipient.publicKey,
      recipient.privateKey,
    );
    expect(await decryptSecret(v1.cipher, v1.nonce, recKey)).toBe("password-v1");

    // Edit: re-encrypt with the same entry key → recipient sees the update
    // WITHOUT re-sharing (their sealed key still works).
    const v2 = await encryptSecret("password-v2", entryKey);
    expect(await decryptSecret(v2.cipher, v2.nonce, recKey)).toBe("password-v2");

    // A stranger's keypair cannot open the sealed entry key.
    await expect(
      decryptVaultKeyWithPrivateKey(recipientEncryptedKey, stranger.publicKey, stranger.privateKey),
    ).rejects.toThrow();
  });
});

describe("base64 helpers", () => {
  it("round-trips arbitrary bytes", async () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 255, 128, 64]);
    const encoded = await toBase64(bytes);
    const decoded = await fromBase64(encoded);
    expect(Array.from(decoded)).toEqual(Array.from(bytes));
  });
});

// Local synchronous base64 for comparing derived keys without another async hop.
function toBase64Sync(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}
