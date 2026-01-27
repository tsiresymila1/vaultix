import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import DeletionsContent from "./deletions-content";

export default async function AdminDeletionsPage() {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        redirect("/login");
    }

    // Check admin role from the users table
    const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!userData || userData.role !== 'admin') {
        redirect("/vaults");
    }

    const { data: requests, error } = await supabase
        .from('deletion_requests')
        .select('*')
        .order('requested_at', { ascending: false });

    if (error) {
        console.error("Error loading deletion requests:", error);
    }

    return <DeletionsContent initialRequests={requests || []} />;
}
