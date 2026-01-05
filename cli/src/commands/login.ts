import http from "node:http";
import { exec } from "node:child_process";
import readline from "node:readline";
import { saveConfig } from "../config";
import { createSupabaseClient } from "../supabase";
import { decryptPrivateKey, deriveMasterKey } from "../crypto";

const PORT = 3456;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
            const url = new URL(req.url || "", `http://localhost:${PORT}`);
            const token = url.searchParams.get("token");
            const email = url.searchParams.get("email");

            if (token && email) {
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end("<h1>Success!</h1><p>You can close this window now. Return to your terminal.</p>");
                server.close();

                console.log(`✔ Authenticated as ${email}`);

                try {
                    const supabase = createSupabaseClient(token);

                    // Fetch user crypto data
                    const { data: userData, error: userError } = await supabase
                        .from("users")
                        .select("encrypted_private_key, master_key_salt, private_key_nonce, public_key")
                        .eq("email", email)
                        .single();

                    if (userError || !userData) {
                        throw new Error(`Failed to fetch user data: ${userError?.message || "User not found"}`);
                    }

                    console.log("\nYour private key is encrypted. Please enter your master password to decrypt it.");
                    const password = await prompt("Master Password: ");

                    if (!password) {
                        throw new Error("Password is required to decrypt your private key.");
                    }

                    console.log("Deriving master key and decrypting private key...");
                    const masterKey = await deriveMasterKey(password, userData.master_key_salt);
                    const privateKey = await decryptPrivateKey(
                        userData.encrypted_private_key,
                        userData.private_key_nonce,
                        masterKey
                    );

                    // Also need projectKey if we want to follow the current schema
                    // For now, if projectKey is missing, we might need to fetch it or generate it
                    // But usually projectKey is tied to the vaultix.json in the repo.

                    saveConfig({
                        token,
                        email,
                        privateKey,
                        publicKey: userData.public_key
                    });

                    console.log(`✔ Logged in and private key successfully decrypted.`);
                    resolve();
                } catch (err) {
                    console.error(`\n❌ Login failed: ${err}`);
                    reject(err);
                }
            } else {
                res.writeHead(400);
                res.end("Invalid request");
            }
        });

        server.listen(PORT, () => {
            const loginUrl = `${APP_URL}/cli/login?callback=http://localhost:${PORT}`;
            console.log(`Logging in via browser...`);
            console.log(`If the browser doesn't open, visit: ${loginUrl}`);

            const command = process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
            exec(`${command} "${loginUrl}"`);
        });
    });
}

