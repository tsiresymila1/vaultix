import { supabase } from "../supabase";

export async function listEnvs(vault: string): Promise<void> {
    const client = supabase();

    // 1. Find vault ID by name
    const { data: vaultData, error: vaultError } = await client
        .from("vaults")
        .select("id")
        .eq("name", vault)
        .single();

    if (vaultError || !vaultData) {
        console.error(`Vault "${vault}" not found.`);
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
        console.log(`No environments found for vault "${vault}".`);
        return;
    }

    data.forEach(e => console.log(e.name));
}

