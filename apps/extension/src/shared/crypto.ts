// Thin adapter over the shared @vaultix/crypto package (proper libsodium import
// instead of the old global), keeping the extension's `decryptVaultKey` name.
export * from "@vaultix/crypto";
export { decryptVaultKeyWithPrivateKey as decryptVaultKey } from "@vaultix/crypto";
