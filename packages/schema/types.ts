import type { InstaQLEntity } from "@instantdb/react";
import type { AppSchema } from "./instant.schema";

// Entity types derived from the InstantDB schema.
export type Profile = InstaQLEntity<AppSchema, "profiles">;
export type Vault = InstaQLEntity<AppSchema, "vaults">;
export type Environment = InstaQLEntity<AppSchema, "environments">;
export type Secret = InstaQLEntity<AppSchema, "secrets">;
export type PasswordEntry = InstaQLEntity<AppSchema, "passwordEntries">;
export type SharedSecret = InstaQLEntity<AppSchema, "sharedSecrets">;
export type DeletionRequest = InstaQLEntity<AppSchema, "deletionRequests">;
export type VaultMember = InstaQLEntity<
  AppSchema,
  "vaultMembers",
  { member: { $user: object } }
>;

// Convenience view of a member row joined with the member's profile public key.
export interface MemberData {
  encryptedVaultKey: string;
  role: string;
  member?: {
    publicKey: string;
    $user?: { email: string } | null;
  } | null;
}
