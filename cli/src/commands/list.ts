import { supabase } from "../supabase";

export async function listVaults(): Promise<void> {
    const { data, error } = await supabase().from("vaults").select("name");

    if (error) throw error;
    data.forEach(v => console.log(v.name));
}
