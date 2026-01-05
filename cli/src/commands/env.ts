import { supabase } from "../supabase.js";

export async function listEnvs(vault: string): Promise<void> {
    const { data, error } = await supabase()
        .from("envs")
        .select("name, vaults!inner(name)")
        .eq("vaults.name", vault);

    if (error) throw error;
    data.forEach(e => console.log(e.name));
}
