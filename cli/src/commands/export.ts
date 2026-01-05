import { supabase } from "../supabase.js";

export async function exportEnv(
    vault: string,
    opts: { env: string }
): Promise<void> {
    const { data, error } = await supabase()
        .from("secrets")
        .select("key,value, envs!inner(name, vaults!inner(name))")
        .eq("envs.name", opts.env)
        .eq("envs.vaults.name", vault);

    if (error) throw error;

    console.log(data.map(s => `${s.key}=${s.value}`).join("\n"));
}
