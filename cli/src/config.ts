import fs from "fs";
import path from "path";
import { getSodium } from "./crypto";

export interface VaultixConfig {
    projectKey: string;
    publicKey: string;
    privateKey: string;
    email?: string;
    token?: string;
}

const PROJECT_CONFIG_FILE = path.join(process.cwd(), "vaultix.json");
const CONFIG_DIR = path.join(process.cwd(), ".vaultix");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export function loadConfig(): VaultixConfig {
    if (!fs.existsSync(CONFIG_FILE)) {
        throw new Error("Vaultix not initialized. Run `vaultix init`.");
    }
    const userConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));

    // Project config should also exist if initialized
    if (fs.existsSync(PROJECT_CONFIG_FILE)) {
        const projectConfig = JSON.parse(fs.readFileSync(PROJECT_CONFIG_FILE, "utf-8"));
        return { ...userConfig, ...projectConfig };
    }

    return userConfig;
}

export function saveConfig(config: Partial<VaultixConfig>): void {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });

    // Split config into public and private
    const projectConfig = {
        projectKey: config.projectKey,
        publicKey: config.publicKey,
    };

    const userConfig = {
        privateKey: config.privateKey,
        email: config.email,
        token: config.token,
        projectKey: config.projectKey, // Keep it here too for convenience? Or just in projectConfig?
    };

    if (projectConfig.projectKey || projectConfig.publicKey) {
        fs.writeFileSync(PROJECT_CONFIG_FILE, JSON.stringify(projectConfig, null, 2));
    }

    // Load existing user config to merge
    let currentConfig = {};
    if (fs.existsSync(CONFIG_FILE)) {
        currentConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    }

    const finalUserConfig = { ...currentConfig, ...userConfig };

    // Remove undefined values
    Object.keys(finalUserConfig).forEach((key) => {
        const k = key as keyof typeof finalUserConfig;
        if (finalUserConfig[k] === undefined) {
            delete finalUserConfig[k];
        }
    });

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(finalUserConfig, null, 2));
}

export async function generateKeys(): Promise<{ publicKey: string; privateKey: string; projectKey: string }> {
    const sodium = await getSodium();
    const keypair = sodium.crypto_box_keypair();
    const bytes = sodium.randombytes_buf(32);

    return {
        publicKey: sodium.to_hex(keypair.publicKey),
        privateKey: sodium.to_hex(keypair.privateKey),
        projectKey: sodium.to_hex(bytes),
    };
}
