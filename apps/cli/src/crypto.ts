// Thin adapter over the shared @vaultix/crypto package, keeping the CLI's
// existing call-site API (base64 salt in, aliased names).
import {
  decryptVaultKeyWithPrivateKey,
  decryptSecret,
  getSodium,
} from "@vaultix/crypto";

export { getSodium };

export const decryptVaultKey = decryptVaultKeyWithPrivateKey;
export const decryptSecretValue = decryptSecret;
