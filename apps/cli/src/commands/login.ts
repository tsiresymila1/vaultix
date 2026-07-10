import http from "node:http";
import { exec } from "node:child_process";
import { saveGlobalConfig } from "../config";
import { callCliApi } from "../supabase";
import { success, error, info, bold } from "../utils/colors";

const APP_URL = process.env.VAULTIX_APP_URL || "https://vaultix-secure.vercel.app";

export async function login(): Promise<void> {
    return new Promise((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
            const url = new URL(req.url || "", "http://localhost");
            // console.log("CLI Debug: Received request at", req.url);
            const token = url.searchParams.get("token");
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
                    // Save token for API call
                    saveGlobalConfig({ token: token, email: email });

                    info("Fetching user crypto data via API...");
                    const { data: userData, error: apiError } = await callCliApi("get-user-crypto");

                    if (apiError || !userData) {
                        error(`Failed to fetch user data: ${apiError || "User not found"}`);
                        reject(new Error("User data fetch failed"));
                        return;
                    }

                    saveGlobalConfig({
                        token: token,
                        email,
                        privateKey: userData.private_key,
                        publicKey: userData.public_key,
                    });

                    success("Logged in successfully.");
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

