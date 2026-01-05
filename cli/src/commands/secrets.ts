import { supabase } from "../supabase";

export async function pullSecrets(
    vault: string,
    opts: { env: string }
): Promise<void> {
    const { data, error } = await supabase()
        .from("secrets")
        .select("key,value, environments!inner(name, vaults!inner(name))")
        .eq("environments.name", opts.env)
        .eq("environments.vaults.name", vault);

    if (error) console.log(error);
    if (!data || data.length === 0) console.log("No data");
    data?.forEach(s => console.log(`${s.key}=${s.value}`));
}
