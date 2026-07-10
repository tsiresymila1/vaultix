// Entity types live in @vaultix/schema; re-exported here for existing @/types imports.
export type {
  Profile,
  Vault,
  Environment,
  Secret,
  PasswordEntry,
  SharedSecret,
  DeletionRequest,
  VaultMember,
  MemberData,
} from "@vaultix/schema";

// Web-only types (not derived from the DB schema).
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
