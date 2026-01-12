import { callCliApi } from "../supabase";
import { loadConfig } from "../config";
import { decryptSecretValue, decryptVaultKey } from "../crypto";
import { error, warn, info, bold, success } from "../utils/colors";

interface VaultMemberWithJoin {
    encrypted_vault_key: string;
    vault_id: string;
    vaults: {
        id: string;
        name: string;
    };
    users: {
        email: string;
        public_key: string;
    };
}


interface Secret {
    key: string;
    encrypted_payload: string;
    nonce: string;
}

export async function pullSecrets(
    vault: string | undefined,
    opts: { env?: string }
): Promise<{ key: string; value: string }[]> {
    const config = loadConfig();

    if (!config.email || !config.privateKey) {
        error("Missing email or privateKey in config. Please login first.");
        return [];
    }

    const vaultNameOrId = vault || config.vaultId || config.vaultName;
    if (!vaultNameOrId) {
        error("No vault specified and no project configuration found. Run `vaultix init` or specify a vault.");
        return [];
    }

    // 1. Get the vault member record via API
    const { data: memberData, error: memberError } = await callCliApi("get-vault-access", { vaultNameOrId });

    if (memberError || !memberData) {
        error(`Failed to fetch vault access: ${memberError || "No access to this vault"}`);
        return [];
    }

    const member = memberData as unknown as VaultMemberWithJoin;

    const env = opts.env ?? "development"

    // 2. Find the environment ID via API
    const { data: envData, error: envError } = await callCliApi("get-environment", { 
        vaultId: member.vault_id, 
        envName: env 
    });

    if (envError || !envData) {
        error(`Environment "${env}" not found in vault "${vaultNameOrId}".`);
        return [];
    }


    // 3. Decrypt the vault key
    let vaultKey: string;
    try {
        vaultKey = await decryptVaultKey(
            member.encrypted_vault_key,
            member.users.public_key,
            config.privateKey
        );
    } catch (err) {
        error("Failed to decrypt vault key. Your local private key might not match.");
        return [];
    }

    // 4. Fetch the secrets via API
    const { data: secretsData, error: secretsError } = await callCliApi("get-secrets", {
        vaultId: member.vault_id,
        environmentId: envData.id
    });

    if (secretsError) {
        error(`Error pulling secrets: ${secretsError}`);
        return [];
    }

    if (!secretsData || secretsData.length === 0) {
        warn(`No secrets found for vault "${vaultNameOrId}" and environment "${env}"`);
        return [];
    }

    const secrets = secretsData as Secret[];


    // 5. Decrypt each secret
    const decryptedSecrets: { key: string; value: string }[] = [];
    for (const s of secrets) {
        try {
            const value = await decryptSecretValue(s.encrypted_payload, s.nonce, vaultKey);
            decryptedSecrets.push({ key: s.key, value });
        } catch (err) {
            error(`Failed to decrypt secret "${s.key}"`);
        }
    }
    return decryptedSecrets;
}
