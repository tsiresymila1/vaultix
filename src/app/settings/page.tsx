import { createClient } from "@/utils/supabase/server";
import SettingsPageContent from "./settings-content";
import AppShell from "@/components/layout/app-shell";
import { UserSettings } from "@/types";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
    const supabase = await createClient();

    // Check session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    // Fetch user settings on the server
    const { data } = await supabase
        .from("users")
        .select("settings")
        .eq("id", user.id)
        .single();

    return (
        <AppShell>
            <SettingsPageContent initialSettings={data?.settings as UserSettings} />
        </AppShell>
    );
}
