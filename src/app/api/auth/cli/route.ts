import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
    const callback = request.nextUrl.searchParams.get("callback");

    if (!callback) {
        return new Response("Missing callback URL", { status: 400 });
    }

    const urlToken = request.nextUrl.searchParams.get("access_token") || request.nextUrl.searchParams.get("token");
    const urlRefreshToken = request.nextUrl.searchParams.get("refresh_token");
    const urlEmail = request.nextUrl.searchParams.get("email");

    let sessionToken = urlToken;
    let sessionRefreshToken = urlRefreshToken;
    let sessionEmail = urlEmail || "";

    // Always try to get a fresh session from cookies if possible
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        sessionToken = sessionToken || session.access_token;
        sessionRefreshToken = sessionRefreshToken || session.refresh_token;
        sessionEmail = sessionEmail || session.user.email || "";
    }

    if (!sessionToken) {
        // Redirect to login if no session/token found
        const currentUrl = request.nextUrl.toString();
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("returnTo", currentUrl);
        return NextResponse.redirect(loginUrl);
    }

    // Construct redirect URL back to the CLI
    const redirectUrl = new URL(callback);
    redirectUrl.searchParams.set("token", sessionToken);

    if (sessionRefreshToken && sessionRefreshToken !== "null") {
        redirectUrl.searchParams.set("refresh_token", sessionRefreshToken);
    }

    if (sessionEmail) {
        redirectUrl.searchParams.set("email", sessionEmail);
    }

    return NextResponse.redirect(redirectUrl);
}
