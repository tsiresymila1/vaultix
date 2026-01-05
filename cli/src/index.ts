#!/usr/bin/env ts-node
import { Command } from "commander";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as spawn from "cross-spawn";
import {
    deriveMasterKey,
    decryptPrivateKey,
    decryptVaultKeyWithPrivateKey,
    decryptSecret
} from "./crypto";
import sodium from "libsodium-wrappers-sumo";
import * as readline from "readline";

const program = new Command();
const CONFIG_DIR = path.join(os.homedir(), ".vaultix");
const CONFIG_FILE = path.join(CONFIG_DIR, "session.json");

interface Session {
    userId: string;
    email: string;
    privateKey: string;
    publicKey: string;
    token: string;
}

// Use env vars or prompt for them
const supabaseUrl = process.env.VAULTIX_SUPABASE_URL;
const supabaseAnonKey = process.env.VAULTIX_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

function saveSession(data: Session) {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR);
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data));
}

function getSession(): Session | null {
    if (!fs.existsSync(CONFIG_FILE)) return null;
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string) => new Promise((resolve) => rl.question(query, resolve));

program
    .name("vaultix")
    .description("Vaultix CLI - Zero-Knowledge Secret Manager")
    .version("1.0.0");

program
    .command("login")
    .argument("<email>", "user email")
    .action(async (email) => {
        try {
            const password = (await question("Enter Master Password: ")) as string;
            rl.close();

            console.log("Authenticating...");
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            console.log("Decrypting private key...");
            const { data: userData } = await supabase
                .from("users")
                .select("encrypted_private_key, public_key")
                .eq("id", authData.user.id)
                .single();

            const [encryptedPK, nonce, saltBase64] = userData?.encrypted_private_key.split(":");
            const salt = sodium.from_base64(saltBase64);
            const masterKey = await deriveMasterKey(password, salt);
            const privateKey = await decryptPrivateKey(encryptedPK, nonce, masterKey);

            saveSession({
                userId: authData.user.id,
                email,
                privateKey,
                publicKey: userData?.public_key,
                token: authData.session.access_token
            });

            console.log("Login successful!");
        } catch (error: unknown) {
            const err = error as Error;
            console.error("Login failed:", err.message);
            process.exit(1);
        }
    });

program
    .command("run")
    .argument("<vaultName>", "vault name")
    .option("-e, --env <env>", "environment (e.g., Development)", "Development")
    .action(async (vaultName, options) => {
        const session = getSession();
        if (!session) {
            console.error("Not logged in. Run 'vaultix login' first.");
            process.exit(1);
        }

        try {
            console.log(`Fetching secrets for ${vaultName} [${options.env}]...`);

            // 1. Get vault
            const { data: vault } = await supabase
                .from("vaults")
                .select("id")
                .eq("name", vaultName)
                .single();

            if (!vault) throw new Error("Vault not found");

            // 2. Get environment
            const { data: env } = await supabase
                .from("environments")
                .select("id")
                .eq("vault_id", vault.id)
                .eq("name", options.env)
                .single();

            if (!env) throw new Error("Environment not found");

            // 3. Get vault key
            const { data: memberData } = await supabase
                .from("vault_members")
                .select("encrypted_vault_key")
                .eq("vault_id", vault.id)
                .eq("user_id", session.userId)
                .single();

            const vaultKey = await decryptVaultKeyWithPrivateKey(
                memberData.encrypted_vault_key,
                session.publicKey,
                session.privateKey
            );

            // 4. Get secrets
            const { data: secrets } = await supabase
                .from("secrets")
                .select("key, encrypted_payload, nonce")
                .eq("environment_id", env.id);

            const decryptedEnv: Record<string, string> = {};
            for (const s of (secrets || [])) {
                decryptedEnv[s.key] = await decryptSecret(s.encrypted_payload, s.nonce, vaultKey);
            }

            // 5. Inject and run
            console.log("Injecting secrets and starting process...");

            const args = program.args.slice(program.args.indexOf("--") + 1);
            if (args.length === 0) {
                console.table(decryptedEnv);
                return;
            }

            const child = spawn(args[0], args.slice(1), {
                env: { ...process.env, ...decryptedEnv },
                stdio: "inherit"
            });

            child.on("exit", (code) => process.exit(code || 0));

        } catch (error: unknown) {
            const err = error as Error;
            console.error("Error:", err.message);
            process.exit(1);
        }
    });

program.parse();
