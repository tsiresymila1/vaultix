import { z } from "zod";

// --- auth / token ---
export const mintTokenSchema = z.object({ instantToken: z.string().min(1) });

// --- users ---
export const userSearchSchema = z.object({ email: z.string().email() });

// --- shared secrets ---
export const sharedReadSchema = z.object({ id: z.string().min(1) });

// --- vault members ---
export const memberInviteSchema = z.object({
  vaultId: z.string().min(1),
  memberProfileId: z.string().min(1),
  role: z.enum(["moderator", "member"]),
  encryptedVaultKey: z.string().min(1),
});
export const memberRemoveSchema = z.object({ memberRowId: z.string().min(1) });

// --- account ---
export const accountEmailSchema = z.object({ newEmail: z.string().email() });

// Profile creation (registration). The client generates an identity keypair and
// sends the raw private key; the server wraps it under the app key at rest and
// hands it back after login. (Non-zero-knowledge: no master password.)
export const accountSetupSchema = z.object({
  publicKey: z.string().min(1),
  privateKey: z.string().min(1),
  fullName: z.string().optional(),
});

// --- vaults (manager-authorized, admin-routed writes) ---
export const vaultCreateSchema = z.object({
  name: z.string().min(1),
  encryptedVaultKey: z.string().min(1),
});
export const vaultRenameSchema = z.object({ vaultId: z.string().min(1), name: z.string().min(1) });
export const vaultDeleteSchema = z.object({ vaultId: z.string().min(1) });
const secretPayload = z.object({
  key: z.string().min(1),
  encryptedPayload: z.string().min(1),
  nonce: z.string().min(1),
});
export const secretCreateSchema = secretPayload.extend({
  vaultId: z.string().min(1),
  environmentId: z.string().min(1),
});
export const secretImportSchema = z.object({
  vaultId: z.string().min(1),
  environmentId: z.string().min(1),
  secrets: z.array(secretPayload).min(1),
});
export const secretUpdateSchema = z.object({
  secretId: z.string().min(1),
  key: z.string().min(1).optional(),
  encryptedPayload: z.string().min(1).optional(),
  nonce: z.string().min(1).optional(),
  environmentId: z.string().min(1).optional(),
});
export const secretsDeleteSchema = z.object({
  vaultId: z.string().min(1),
  secretIds: z.array(z.string().min(1)).min(1),
});
export const envCreateSchema = z.object({ vaultId: z.string().min(1), name: z.string().min(1) });
export const envRenameSchema = z.object({ environmentId: z.string().min(1), name: z.string().min(1) });
export const envDeleteSchema = z.object({ environmentId: z.string().min(1) });

// --- password entry creation (used by the extension "save from page") ---
export const passwordCreateSchema = z.object({
  title: z.string().min(1),
  websiteUrl: z.string().optional(),
  username: z.string().optional(),
  encryptedPassword: z.string().min(1),
  passwordNonce: z.string().min(1),
  ownerEncryptedKey: z.string().min(1),
  encryptedOtpSeed: z.string().optional(),
  otpNonce: z.string().optional(),
  notes: z.string().optional(),
});

// --- password sharing (envelope: grant the entry key, content stays on entry) ---
export const passwordShareSchema = z.object({
  recipientEmail: z.string().email(),
  entryId: z.string().min(1),
  encryptedKey: z.string().min(1), // entry key sealed to recipient's public key
});
export const passwordRevokeSchema = z.object({ shareId: z.string().min(1) });

// --- cli dispatcher ---
export const cliActionSchema = z.object({
  action: z.enum([
    "get-user-crypto",
    "get-vault-access",
    "get-environment",
    "get-secrets",
    "get-user-vaults",
    "list-envs",
    "list-vaults",
  ]),
  params: z.record(z.string(), z.unknown()).optional().default({}),
});
export type CliAction = z.infer<typeof cliActionSchema>["action"];
