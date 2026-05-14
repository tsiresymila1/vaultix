import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { verifyCliToken } from "@/utils/jwt";

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.replace("Bearer ", "");
        
        if (!token) {
            return NextResponse.json(
                { error: "No token provided" },
                { status: 401 }
            );
        }

        // Verify the custom JWT token
        const tokenPayload = await verifyCliToken(token);
        
        if (!tokenPayload) {
            return NextResponse.json(
                { error: "Invalid token" },
                { status: 401 }
            );
        }

        const supabase = await createClient();
        
        // Fetch passwords for the user from the token
        const { data: passwords, error } = await supabase
            .from("password_entries")
            .select("id, title, website_url, username, encrypted_password, password_nonce, encrypted_otp_seed, otp_nonce, notes, created_at")
            .eq("user_id", tokenPayload.userId)
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