import { createClient } from "@/utils/supabase/server";
import PasswordsPageContent from "./passwords-content";
import AppShell from "@/components/layout/app-shell";
import { redirect } from "next/navigation";
import { PasswordEntry } from "@/types";

export default async function PasswordsPage() {
    const supabase = await createClient();

    // Check session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    // Fetch passwords - assuming the table exists or using a fallback
    // In a real scenario, this would be a specific table 'password_entries'
    // To be compatible with existing schema without migration, we could use a specific vault
    // but the user asked for a standalone page.
    const { data, error } = await supabase
        .from("password_entries")
        .select("*")
        .order("created_at", { ascending: false });

    // Handle missing table gracefully for this demo/task
    if (error && error.code === '42P01') {
        console.warn("Table password_entries not found. Please run the migration.");
    }

    const passwords = (data as PasswordEntry[]) || [];

    return (
        <AppShell>
            <PasswordsPageContent initialPasswords={passwords} />
        </AppShell>
    );
}
