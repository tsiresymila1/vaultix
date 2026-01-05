import { createClient } from "@/utils/supabase/server";
import VaultDetailContent from "./vault-detail-content";
import { notFound, redirect } from "next/navigation";
import { Environment, Secret, MemberData } from "@/types";

export default async function VaultDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    // 1. Fetch vault
    const { data: vault, error: vaultError } = await supabase
        .from("vaults")
        .select("*")
        .eq("id", id)
        .single();

    if (vaultError || !vault) {
        return notFound();
    }

    // 2. Fetch environments
    const { data: environments } = await supabase
        .from("environments")
        .select("*")
        .eq("vault_id", id)
        .order("name", { ascending: true });

    // 3. Fetch secrets (encrypted)
    const { data: secrets } = await supabase
        .from("secrets")
        .select("*")
        .eq("vault_id", id)
        .order("created_at", { ascending: false });

    // 4. Fetch member data (for vault key decryption)
    const { data: memberData } = await supabase
        .from("vault_members")
        .select("encrypted_vault_key, users(public_key)")
        .eq("vault_id", id)
        .eq("user_id", user.id)
        .single();

    return (
        <VaultDetailContent
            params={{ id }}
            initialVault={vault}
            initialEnvironments={(environments as Environment[]) || []}
            initialSecrets={(secrets as Secret[]) || []}
            initialMemberData={memberData as unknown as MemberData}
        />
    );
}
