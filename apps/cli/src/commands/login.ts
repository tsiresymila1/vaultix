import http from "node:http";
import { exec } from "node:child_process";
import readline from "node:readline";
import { saveGlobalConfig } from "../config";
import { callCliApi } from "../supabase";
import { decryptPrivateKey, deriveMasterKey } from "../crypto";
import { success, error, info, bold } from "../utils/colors";

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
            // console.log("CLI Debug: Received request at", req.url);
            const token = url.searchParams.get("token");
            const email = url.searchParams.get("email");
            const urlPrivateKey = url.searchParams.get("private_key");

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

                    let privateKey = urlPrivateKey;
                    let publicKey: string | undefined;

                    if (!privateKey) {
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
                        privateKey = await decryptPrivateKey(
                            userData.encrypted_private_key,
                            userData.private_key_nonce,
                            masterKey
                        );
                        publicKey = userData.public_key;
                    } else {
                        success("Private key received securely from browser.");
                        // Fetch the public key separately if we got the private key from URL
                        const { data: userData } = await callCliApi("get-user-crypto");
                        if (userData) publicKey = userData.public_key;
                    }

                    saveGlobalConfig({
                        token: token,
                        email,
                        privateKey,
                        publicKey: publicKey,
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

