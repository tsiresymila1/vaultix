import { createClient } from "@/utils/supabase/server";
import MembersPageContent from "./members-content";
import AppShell from "@/components/layout/app-shell";
import { UserData } from "@/types";
import { redirect } from "next/navigation";

export default async function MembersPage() {
    const supabase = await createClient();

    // Check session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    // Fetch members on the server
    const { data: members, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching members:", error);
    }

    return (
        <AppShell>
            <MembersPageContent initialMembers={(members as UserData[]) || []} />
        </AppShell>
    );
}
