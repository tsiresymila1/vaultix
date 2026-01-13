import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { signCliToken } from "@/utils/jwt";

export async function GET(request: NextRequest) {
    const callback = request.nextUrl.searchParams.get("callback");

    if (!callback) {
        return new Response("Missing callback URL", { status: 400 });
    }

    // Always try to get a fresh session from cookies if possible
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        // Redirect to login if no session matches
        const currentUrl = request.nextUrl.toString();
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("returnTo", currentUrl);
        return NextResponse.redirect(loginUrl);
    }

    // Generate a backend-managed token for the CLI
    const cliToken = await signCliToken({
        userId: session.user.id,
        email: session.user.email || ""
    });

    // Construct redirect URL to the CLI login page
    const loginPageUrl = new URL("/cli/login", request.url);
    loginPageUrl.searchParams.set("callback", callback);
    loginPageUrl.searchParams.set("token", cliToken);
    loginPageUrl.searchParams.set("email", session.user.email || "");

    return NextResponse.redirect(loginPageUrl);
}
