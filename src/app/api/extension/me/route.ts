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
        
        // Fetch user data using the userId from the token
        const { data: userData, error } = await supabase
            .from("users")
            .select("id, email, public_key, encrypted_private_key, private_key_nonce, master_key_salt, full_name")
            .eq("id", tokenPayload.userId)
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