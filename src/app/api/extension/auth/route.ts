import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { signCliToken } from "@/utils/jwt";

export async function GET(request: NextRequest) {
    const callback = request.nextUrl.searchParams.get("callback");

    if (!callback) {
        return new Response("Missing callback URL", { status: 400 });
    }

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        const currentUrl = request.nextUrl.toString();
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("returnTo", currentUrl);
        return NextResponse.redirect(loginUrl);
    }

    const extensionToken = await signCliToken({
        userId: session.user.id,
        email: session.user.email || ""
    });

    const loginPageUrl = new URL("/extension/login", request.url);
    loginPageUrl.searchParams.set("callback", callback);
    loginPageUrl.searchParams.set("token", extensionToken);
    loginPageUrl.searchParams.set("email", session.user.email || "");

    return NextResponse.redirect(loginPageUrl);
}