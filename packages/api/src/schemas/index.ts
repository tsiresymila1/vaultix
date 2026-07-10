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
