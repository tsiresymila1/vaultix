import sodium from "libsodium-wrappers-sumo";

export async function initSodium() {
    await sodium.ready;
}

export async function deriveMasterKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
    await initSodium();
    return sodium.crypto_pwhash(
        sodium.crypto_secretbox_KEYBYTES,
        password,
        salt,
        sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_ALG_ARGON2ID13
    );
}

export async function decryptPrivateKey(encrypted: string, nonce: string, masterKey: Uint8Array) {
    await initSodium();
    const decodedEncrypted = sodium.from_base64(encrypted);
    const decodedNonce = sodium.from_base64(nonce);
    const decrypted = sodium.crypto_secretbox_open_easy(decodedEncrypted, decodedNonce, masterKey);
    return sodium.to_base64(decrypted);
}

export async function decryptVaultKeyWithPrivateKey(
    encryptedVaultKeyBase64: string,
    userPublicKeyBase64: string,
    userPrivateKeyBase64: string
) {
    await initSodium();
    const encryptedVaultKey = sodium.from_base64(encryptedVaultKeyBase64);
    const userPublicKey = sodium.from_base64(userPublicKeyBase64);
    const userPrivateKey = sodium.from_base64(userPrivateKeyBase64);
    const decrypted = sodium.crypto_box_seal_open(encryptedVaultKey, userPublicKey, userPrivateKey);
    return sodium.to_base64(decrypted);
}

export async function decryptSecret(cipherBase64: string, nonceBase64: string, vaultKeyBase64: string) {
    await initSodium();
    const cipher = sodium.from_base64(cipherBase64);
    const nonce = sodium.from_base64(nonceBase64);
    const vaultKey = sodium.from_base64(vaultKeyBase64);
    const decrypted = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        null,
        cipher,
        null,
        nonce,
        vaultKey
    );
    return sodium.to_string(decrypted);
}
