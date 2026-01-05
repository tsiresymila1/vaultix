import { createClient } from "@/utils/supabase/server";
import VaultsPageContent from "./vaults-content";
import { Vault } from "@/types";

export default async function VaultsPage() {
    const supabase = await createClient();

    // Fetch vaults on the server
    const { data: vaults, error } = await supabase
        .from("vaults")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching vaults:", error);
    }

    return <VaultsPageContent initialVaults={(vaults as Vault[]) || []} />;
}
