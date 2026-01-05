import { createClient } from "@/utils/supabase/server";
import ProfilePageContent from "./profile-content";
import AppShell from "@/components/layout/app-shell";
import { UserData } from "@/types";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
    const supabase = await createClient();

    // Check session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    // Fetch user data on the server
    const { data: userData, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

    if (error) {
        console.error("Error fetching profile data:", error);
    }

    return (
        <AppShell>
            <ProfilePageContent initialUserData={userData as UserData} />
        </AppShell>
    );
}
