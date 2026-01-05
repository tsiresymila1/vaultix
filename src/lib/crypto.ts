"use client";

import sodium from "libsodium-wrappers-sumo";

/**
 * Initialize sodium and wait for the WASM module to be ready.
 */
export async function initSodium(): Promise<void> {
    await sodium.ready;
}

/* ---------- KDF ---------- */
export async function generateSalt(): Promise<Uint8Array> {
    await sodium.ready;
    // Fallback to 16 bytes if constant is missing
    const saltBytes = sodium.crypto_pwhash_SALTBYTES || 16;
    return sodium.randombytes_buf(saltBytes);
}

export async function deriveMasterKey(
    password: string,
    salt: Uint8Array
): Promise<Uint8Array> {
    await sodium.ready;
    // Fallback constants for Argon2id if missing
    const keyBytes = sodium.crypto_secretbox_KEYBYTES || 32;
    const opsLimit = sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE || 2;
    const memLimit = sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE || 67108864;
    const alg = sodium.crypto_pwhash_ALG_ARGON2ID13 || 2;

    return sodium.crypto_pwhash(
        keyBytes,
        password,
        salt,
        opsLimit,
        memLimit,
        alg
    );
}

/* ---------- USER KEYPAIR ---------- */
export interface UserKeyPair {
    publicKey: string;
    privateKey: string;
}

export async function generateUserKeyPair(): Promise<UserKeyPair> {
    await sodium.ready;
    const keyPair = sodium.crypto_box_keypair();
    return {
        publicKey: sodium.to_base64(keyPair.publicKey),
        privateKey: sodium.to_base64(keyPair.privateKey),
    };
}

/* ---------- PRIVATE KEY ENCRYPTION ---------- */
export interface EncryptedData {
    cipher: string;
    nonce: string;
}

export async function encryptPrivateKey(
    privateKeyBase64: string,
    masterKey: Uint8Array
): Promise<EncryptedData> {
    await sodium.ready;
    const nonceBytes = sodium.crypto_secretbox_NONCEBYTES || 24;
    const nonce = sodium.randombytes_buf(nonceBytes);
    const encrypted = sodium.crypto_secretbox_easy(
        sodium.from_base64(privateKeyBase64),
        nonce,
        masterKey
    );
    return {
        cipher: sodium.to_base64(encrypted),
        nonce: sodium.to_base64(nonce),
    };
}

export async function decryptPrivateKey(
    cipherBase64: string,
    nonceBase64: string,
    masterKey: Uint8Array
): Promise<string> {
    await sodium.ready;
    const decrypted = sodium.crypto_secretbox_open_easy(
        sodium.from_base64(cipherBase64),
        sodium.from_base64(nonceBase64),
        masterKey
    );
    return sodium.to_base64(decrypted);
}

/* ---------- VAULT KEY ---------- */
export async function generateVaultKey(): Promise<string> {
    await sodium.ready;
    const keyBytes = sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES || 32;
    return sodium.to_base64(
        sodium.randombytes_buf(keyBytes)
    );
}

/* ---------- SECRET ENCRYPTION ---------- */
export async function encryptSecret(
    plaintext: string,
    vaultKeyBase64: string
): Promise<EncryptedData> {
    await sodium.ready;
    const key = sodium.from_base64(vaultKeyBase64);
    const npubBytes = sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES || 24;
    const nonce = sodium.randombytes_buf(npubBytes);
    const cipher = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        plaintext,
        null,
        null,
        nonce,
        key
    );
    return {
        cipher: sodium.to_base64(cipher),
        nonce: sodium.to_base64(nonce),
    };
}

export async function decryptSecret(
    cipherBase64: string,
    nonceBase64: string,
    vaultKeyBase64: string
): Promise<string> {
    await sodium.ready;
    const decrypted = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        null,
        sodium.from_base64(cipherBase64),
        null,
        sodium.from_base64(nonceBase64),
        sodium.from_base64(vaultKeyBase64)
    );
    return sodium.to_string(decrypted);
}

/* ---------- VAULT SHARING ---------- */
export async function encryptVaultKeyForUser(
    vaultKeyBase64: string,
    userPublicKeyBase64: string
): Promise<string> {
    await sodium.ready;
    const encrypted = sodium.crypto_box_seal(
        sodium.from_base64(vaultKeyBase64),
        sodium.from_base64(userPublicKeyBase64)
    );
    return sodium.to_base64(encrypted);
}

export async function decryptVaultKeyWithPrivateKey(
    encryptedVaultKeyBase64: string,
    userPublicKeyBase64: string,
    userPrivateKeyBase64: string
): Promise<string> {
    await sodium.ready;
    const decrypted = sodium.crypto_box_seal_open(
        sodium.from_base64(encryptedVaultKeyBase64),
        sodium.from_base64(userPublicKeyBase64),
        sodium.from_base64(userPrivateKeyBase64)
    );
    return sodium.to_base64(decrypted);
}

/* ---------- HELPERS ---------- */
export async function randomBytes(length: number): Promise<Uint8Array> {
    await sodium.ready;
    return sodium.randombytes_buf(length);
}

export async function getSaltBytes(): Promise<number> {
    await sodium.ready;
    return sodium.crypto_pwhash_SALTBYTES || 16;
}

export async function toBase64(data: Uint8Array): Promise<string> {
    await sodium.ready;
    return sodium.to_base64(data);
}

export async function fromBase64(data: string): Promise<Uint8Array> {
    await sodium.ready;
    return sodium.from_base64(data);
}

