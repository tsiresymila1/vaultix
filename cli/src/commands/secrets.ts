import { supabase } from "../supabase";
import { loadConfig } from "../config";
import { decryptSecretValue, decryptVaultKey } from "../crypto";

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
    vault: string,
    opts: { env: string }
): Promise<{ key: string; value: string }[]> {
    const config = loadConfig();

    if (!config.email || !config.privateKey) {
        console.error("Missing email or privateKey in config. Please login or run init.");
        return [];
    }

    const client = supabase();

    // 1. Get the vault member record to get both vault access and vault ID
    const { data: memberData, error: memberError } = await client
        .from("vault_members")
        .select(`
            encrypted_vault_key,
            vault_id,
            vaults!inner(name),
            users!inner(email, public_key)
        `)
        .eq("users.email", config.email)
        .eq("vaults.name", vault)
        .single();

    if (memberError || !memberData) {
        console.error("Error fetching vault access:", memberError?.message || "No access to this vault.");
        return [];
    }

    const member = memberData as unknown as VaultMemberWithJoin;

    // 2. Find the environment ID by name within this vault
    const { data: envData, error: envError } = await client
        .from("environments")
        .select("id")
        .eq("vault_id", member.vault_id)
        .eq("name", opts.env)
        .single();

    if (envError || !envData) {
        console.error(`Environment "${opts.env}" not found in vault "${vault}".`);
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
        console.error("Failed to decrypt vault key. Your local private key might not match.");
        return [];
    }

    // 4. Fetch the secrets for this environment
    const { data: secretsData, error: secretsError } = await client
        .from("secrets")
        .select(`key, encrypted_payload, nonce`)
        .eq("environment_id", envData.id)
        .eq("vault_id", member.vault_id);

    if (secretsError) {
        console.error("Error pulling secrets:", secretsError.message);
        return [];
    }

    if (!secretsData || secretsData.length === 0) {
        console.log(`No secrets found for vault "${vault}" and environment "${opts.env}"`);
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
            console.error(`Failed to decrypt secret "${s.key}"`);
        }
    }
    return decryptedSecrets;
}
