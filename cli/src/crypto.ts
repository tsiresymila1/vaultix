import sodium from "libsodium-wrappers-sumo";

let ready = false;

export async function getSodium(): Promise<typeof sodium> {
    if (!ready) {
        await sodium.ready;
        ready = true;
    }
    return sodium;
}

export async function deriveMasterKey(
    password: string,
    saltBase64: string
): Promise<Uint8Array> {
    const s = await getSodium();
    const salt = s.from_base64(saltBase64);

    const keyBytes = s.crypto_secretbox_KEYBYTES || 32;
    const opsLimit = s.crypto_pwhash_OPSLIMIT_INTERACTIVE || 2;
    const memLimit = s.crypto_pwhash_MEMLIMIT_INTERACTIVE || 67108864;
    const alg = s.crypto_pwhash_ALG_ARGON2ID13 || 2;

    return s.crypto_pwhash(
        keyBytes,
        password,
        salt,
        opsLimit,
        memLimit,
        alg
    );
}

export async function decryptPrivateKey(
    cipherBase64: string,
    nonceBase64: string,
    masterKey: Uint8Array
): Promise<string> {
    const s = await getSodium();
    const decrypted = s.crypto_secretbox_open_easy(
        s.from_base64(cipherBase64),
        s.from_base64(nonceBase64),
        masterKey
    );
    return s.to_base64(decrypted);
}


export async function decryptVaultKey(
    encryptedVaultKey: string,
    userPublicKey: string,
    userPrivateKey: string
): Promise<string> {
    const s = await getSodium();
    const decrypted = s.crypto_box_seal_open(
        s.from_base64(encryptedVaultKey),
        s.from_base64(userPublicKey),
        s.from_base64(userPrivateKey)
    );
    return s.to_base64(decrypted);
}

export async function decryptSecretValue(
    cipherBase64: string,
    nonceBase64: string,
    vaultKeyBase64: string
): Promise<string> {
    const s = await getSodium();
    const decrypted = s.crypto_aead_xchacha20poly1305_ietf_decrypt(
        null,
        s.from_base64(cipherBase64),
        null,
        s.from_base64(nonceBase64),
        s.from_base64(vaultKeyBase64)
    );
    return s.to_string(decrypted);
}

