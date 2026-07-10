// Thin adapter over the shared @vaultix/crypto package, keeping the CLI's
// existing call-site API (base64 salt in, aliased names).
import {
  deriveMasterKey as _deriveMasterKey,
  decryptPrivateKey,
  decryptVaultKeyWithPrivateKey,
  decryptSecret,
  fromBase64,
  getSodium,
} from "@vaultix/crypto";

export { getSodium };

export async function deriveMasterKey(
  password: string,
  saltBase64: string,
): Promise<Uint8Array> {
  return _deriveMasterKey(password, await fromBase64(saltBase64));
}

export { decryptPrivateKey };
export const decryptVaultKey = decryptVaultKeyWithPrivateKey;
export const decryptSecretValue = decryptSecret;
