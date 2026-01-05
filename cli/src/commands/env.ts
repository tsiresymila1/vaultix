import { supabase } from "../supabase";

export async function listEnvs(vault: string): Promise<void> {
    const { data, error } = await supabase()
        .from("environments")
        .select("name, vaults!inner(name)")
        .eq("vaults.name", vault);
    if (error) throw error;
    if (!data || data.length === 0) console.log("No data");
    data.forEach(e => console.log(e.name));
}
