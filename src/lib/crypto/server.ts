import sodium from "libsodium-wrappers-sumo";

export async function initSodium(): Promise<void> {
    await sodium.ready;
}

export async function fromBase64(data: string): Promise<Uint8Array> {
    await sodium.ready;
    return sodium.from_base64(data);
}

export async function deriveMasterKey(
    password: string,
    salt: Uint8Array
): Promise<Uint8Array> {
    await sodium.ready;
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