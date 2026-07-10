import type { InstaQLEntity } from "@instantdb/react";
import type { AppSchema } from "../../instant.schema";

// Auth identity (from InstantDB magic-code auth).
export interface AuthUser {
  id: string;
  email: string;
}

export interface UserSettings {
  theme?: "light" | "dark" | "system";
  email_notifications?: boolean;
  auto_lock?: boolean;
  lock_timeout?: number;
}

// Profile = zero-knowledge crypto material + app fields, linked 1-1 to $users.
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
