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

        const { data: userData, error } = await supabase
            .from("users")
            .select("id, email, public_key, encrypted_private_key, private_key_nonce, master_key_salt, full_name")
            .eq("id", session.user.id)
            .single();

        if (error) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            user: {
                id: userData.id,
                email: userData.email,
                public_key: userData.public_key,
                encrypted_private_key: userData.encrypted_private_key,
                private_key_nonce: userData.private_key_nonce,
                master_key_salt: userData.master_key_salt,
                full_name: userData.full_name,
            }
        });
    } catch (error) {
        console.error("Extension API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}