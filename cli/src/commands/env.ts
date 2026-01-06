import { supabase } from "../supabase";
import { loadConfig } from "../config";

export async function listEnvs(vault: string | undefined): Promise<void> {
    const config = loadConfig();
    const vaultNameOrId = vault || config.vaultName || config.vaultId;

    if (!vaultNameOrId) {
        console.error("No vault specified and no project configuration found. Run `vaultix init` or specify a vault.");
        return;
    }

    const client = supabase();

    // 1. Find vault ID
    const query = client.from("vaults").select("id");

    if (vaultNameOrId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        query.eq("id", vaultNameOrId);
    } else {
        query.ilike("name", vaultNameOrId);
    }


    const { data: vaultData, error: vaultError } = await query.single();

    if (vaultError || !vaultData) {
        console.error(`Vault "${vaultNameOrId}" not found.`);
        return;
    }

    // 2. Fetch environments for this vault
    const { data, error } = await client
        .from("environments")
        .select("name")
        .eq("vault_id", vaultData.id)
        .order("name", { ascending: true });

    if (error) {
        console.error("Error fetching environments:", error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log(`No environments found for vault "${vaultNameOrId}".`);
        return;
    }

    data.forEach(e => console.log(e.name));
}


