import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { deriveMasterKey, decryptPrivateKey, fromBase64 } from "@/lib/crypto/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token, masterPassword } = body;

        if (!token || !masterPassword) {
            return NextResponse.json(
                { error: "Missing token or master password" },
                { status: 400 }
            );
        }

        // Decode JWT to get userId
        let userId: string;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userId = payload.userId;
        } catch (e) {
            return NextResponse.json(
                { error: "Invalid token format" },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Fetch user encryption data
        const { data: userData, error: dbError } = await supabase
            .from('users')
            .select('encrypted_private_key, master_key_salt, private_key_nonce, public_key, email')
            .eq('id', userId)
            .single();

        if (dbError) {
            return NextResponse.json(
                { error: "Could not fetch encryption data: " + dbError.message },
                { status: 500 }
            );
        }

        if (!userData) {
            return NextResponse.json(
                { error: "User data not found" },
                { status: 404 }
            );
        }

        // Derive master key and decrypt private key on server
        const salt = await fromBase64(userData.master_key_salt);
        const masterKey = await deriveMasterKey(masterPassword, salt);
        const privateKey = await decryptPrivateKey(
            userData.encrypted_private_key,
            userData.private_key_nonce,
            masterKey
        );

        // Return the decrypted data (not the masterKey itself for security)
        return NextResponse.json({
            success: true,
            data: {
                privateKey,
                masterKeySalt: userData.master_key_salt,
                encryptedPrivateKey: userData.encrypted_private_key,
                privateKeyNonce: userData.private_key_nonce,
                email: userData.email
            }
        });
    } catch (error) {
        console.error("Extension decrypt error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Decryption failed" },
            { status: 500 }
        );
    }
}