import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = await createClient();
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        const { data: passwords, error } = await supabase
            .from("password_entries")
            .select("id, title, website_url, username, encrypted_password, password_nonce, encrypted_otp_seed, otp_nonce, notes, created_at")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching passwords:", error);
            return NextResponse.json(
                { error: "Failed to fetch passwords" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            passwords: passwords || []
        });
    } catch (error) {
        console.error("Extension API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}