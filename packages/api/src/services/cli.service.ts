import { createAdminDb } from "../db-admin";
import type { AuthedUser } from "../types";
import type { CliAction } from "../schemas";

// Responses use snake_case + nested `vaults`/`users` to preserve the contract the
// released CLI binary already consumes.

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

type Result = { data: unknown; error: unknown };

export async function dispatchCli(
  action: CliAction,
  params: Record<string, unknown>,
  user: AuthedUser,
): Promise<Result> {
  const db = createAdminDb();
  const profileRes = await db.query({
    profiles: { $: { where: { "$user.id": user.id } } },
  });
  const profile = profileRes.profiles?.[0];
  if (!profile) return { data: null, error: { message: "Profile not found" } };

  switch (action) {
    case "get-user-crypto":
      return {
        data: {
          encrypted_private_key: profile.encryptedPrivateKey,
          master_key_salt: profile.masterKeySalt,
          private_key_nonce: profile.privateKeyNonce,
          public_key: profile.publicKey,
        },
        error: null,
      };

    case "get-vault-access": {
      const vaultNameOrId = String(params.vaultNameOrId ?? "");
      const { vaultMembers } = await db.query({
        vaultMembers: { $: { where: { "member.id": profile.id } }, vault: {} },
      });
      const match = (vaultMembers ?? []).find((m) =>
        isUuid(vaultNameOrId)
          ? m.vault?.id === vaultNameOrId
          : m.vault?.name?.toLowerCase() === vaultNameOrId.toLowerCase(),
      );
      if (!match?.vault) {
        return { data: null, error: { message: "Vault not found or no access" } };
      }
      return {
        data: {
          encrypted_vault_key: match.encryptedVaultKey,
          vault_id: match.vault.id,
          vaults: { id: match.vault.id, name: match.vault.name },
          users: { email: user.email, public_key: profile.publicKey },
        },
        error: null,
      };
    }

    case "get-environment": {
      const vaultId = String(params.vaultId ?? "");
      const envName = String(params.envName ?? "");
      const { environments } = await db.query({
        environments: { $: { where: { "vault.id": vaultId } } },
      });
      const env = (environments ?? []).find(
        (e) => e.name.toLowerCase() === envName.toLowerCase(),
      );
      if (!env) return { data: null, error: { message: "Environment not found" } };
      return { data: { id: env.id }, error: null };
    }

    case "get-secrets": {
      const vaultId = String(params.vaultId ?? "");
      const environmentId = String(params.environmentId ?? "");
      const { secrets } = await db.query({
        secrets: { $: { where: { "vault.id": vaultId, "environment.id": environmentId } } },
      });
      return {
        data: (secrets ?? []).map((s) => ({
          key: s.key,
          encrypted_payload: s.encryptedPayload,
          nonce: s.nonce,
        })),
        error: null,
      };
    }

    case "get-user-vaults": {
      const { vaultMembers } = await db.query({
        vaultMembers: { $: { where: { "member.id": profile.id } }, vault: {} },
      });
      return {
        data: (vaultMembers ?? [])
          .filter((m) => m.vault)
          .map((m) => ({ vault_id: m.vault!.id, vaults: { name: m.vault!.name } })),
        error: null,
      };
    }

    case "list-envs": {
      const vaultNameOrId = String(params.vaultNameOrId ?? "");
      const { vaultMembers } = await db.query({
        vaultMembers: { $: { where: { "member.id": profile.id } }, vault: { environments: {} } },
      });
      const match = (vaultMembers ?? []).find((m) =>
        isUuid(vaultNameOrId)
          ? m.vault?.id === vaultNameOrId
          : m.vault?.name?.toLowerCase() === vaultNameOrId.toLowerCase(),
      );
      if (!match?.vault) {
        return { data: null, error: { message: "Vault not found or no access" } };
      }
      const envs = [...(match.vault.environments ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      return { data: envs.map((e) => ({ name: e.name })), error: null };
    }

    case "list-vaults": {
      const { vaultMembers } = await db.query({
        vaultMembers: { $: { where: { "member.id": profile.id } }, vault: {} },
      });
      return {
        data: (vaultMembers ?? []).filter((m) => m.vault).map((m) => ({ name: m.vault!.name })),
        error: null,
      };
    }
  }
}
