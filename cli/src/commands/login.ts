import http from "node:http";
import { exec } from "node:child_process";
import readline from "node:readline";
import { saveGlobalConfig } from "../config";
import { createSupabaseClient, callCliApi } from "../supabase";
import { decryptPrivateKey, deriveMasterKey } from "../crypto";
import { Session } from "@supabase/supabase-js";
import { success, error, info, bold, warn } from "../utils/colors";

const APP_URL = process.env.VAULTIX_APP_URL || "https://vaultix-secure.vercel.app";

async function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

export async function login(): Promise<void> {
    return new Promise((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
            const url = new URL(req.url || "", "http://localhost");
            const token = url.searchParams.get("token");
            const refreshToken = url.searchParams.get("refresh_token");
            const email = url.searchParams.get("email");

            if (token && email) {
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(`
                    <html>
                        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #000; color: #fff;">
                            <h1 style="color: #4ade80;">Success!</h1>
                            <p>Authenticated successfully. You can close this window now.</p>
                            <script>
                                setTimeout(() => {
                                    window.close();
                                }, 2000);
                            </script>
                        </body>
                    </html>
                `);

                // Allow some time for the response to be sent before closing server
                setTimeout(() => server.close(), 500);

                success(`Authenticated as ${bold(email)}`);

                try {
                    let session: Session | null = null;
                    let supabase = createSupabaseClient();

                    // If we have a refresh token, try to establish a proper session
                    if (refreshToken && refreshToken !== "null") {
                        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                            access_token: token,
                            refresh_token: refreshToken
                        });

                        if (!sessionError && sessionData.session) {
                            session = sessionData.session;
                        } else {
                            warn("Could not establish a refreshing session. Proceeding with temporary token...");
                        }
                    }

                    // If no session established yet, use the access token directly
                    if (!session) {
                        supabase = createSupabaseClient(token);
                    }
                    // Save temporary token for API call
                    saveGlobalConfig({ token: token, email: email });

                    info("Fetching user crypto data via API...");
                    const { data: userData, error: apiError } = await callCliApi("get-user-crypto");

                    if (apiError || !userData) {
                        error(`Failed to fetch user data: ${apiError || "User not found"}`);
                        reject(new Error("User data fetch failed"));
                        return;
                    }

                    console.log(`\n${bold("Private Key Decryption:")}`);
                    console.log("Your private key is encrypted. Please enter your master password to decrypt it.");
                    const password = await prompt("Master Password: ");

                    if (!password) {
                        error("Password is required to decrypt your private key.");
                        reject(new Error("Password required"));
                        return;
                    }

                    info("Deriving master key and decrypting private key...");
                    const masterKey = await deriveMasterKey(password, userData.master_key_salt);
                    const privateKey = await decryptPrivateKey(
                        userData.encrypted_private_key,
                        userData.private_key_nonce,
                        masterKey
                    );

                    // Final session object to persist
                    const sessionToSave = session || {
                        access_token: token,
                        refresh_token: refreshToken === "null" ? "" : (refreshToken || ""),
                        user: { email }
                    };

                    saveGlobalConfig({
                        token: sessionToSave.access_token,
                        email,
                        privateKey,
                        publicKey: userData.public_key,
                        authSession: sessionToSave as unknown as Record<string, unknown>
                    });

                    success("Logged in and private key successfully decrypted.");
                    resolve();

                    // Force exit to prevent hanging on lingering handles
                    setTimeout(() => process.exit(0), 100);
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : String(err);
                    error(`Login failed: ${message}`);
                    reject(err);
                    process.exit(1);
                }

            } else {
                res.writeHead(400);
                res.end("Invalid request");
            }
        });

        server.listen(0, "localhost", () => {
            const addr = server.address();
            const port = typeof addr === "object" && addr ? addr.port : 0;
            const loginUrl = `${APP_URL}/api/auth/cli?callback=http://localhost:${port}`;

            console.log(`Logging in via browser...`);
            console.log(`If the browser doesn't open, visit: ${loginUrl}`);

            const command = process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
            exec(`${command} "${loginUrl}"`);
        });
    });
}

