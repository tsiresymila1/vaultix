import { supabase } from "../supabase.js";

export async function pullSecrets(
    vault: string,
    opts: { env: string }
): Promise<void> {
    const { data, error } = await supabase()
        .from("secrets")
        .select("key,value, envs!inner(name, vaults!inner(name))")
        .eq("envs.name", opts.env)
        .eq("envs.vaults.name", vault);

    if (error) throw error;

    data.forEach(s => console.log(`${s.key}=${s.value}`));
}
