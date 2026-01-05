import fs from "fs";
import path from "path";
import { getSodium } from "./crypto";

export interface VaultixConfig {
    projectKey: string;
    email?: string;
}

const CONFIG_DIR = path.join(process.cwd(), ".vaultix");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export function loadConfig(): VaultixConfig {
    if (!fs.existsSync(CONFIG_FILE)) {
        throw new Error("Vaultix not initialized. Run `vaultix init`.");
    }
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8")) as VaultixConfig;
}

export function saveConfig(config: VaultixConfig): void {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function generateProjectKey(): Promise<string> {
    const sodium = await getSodium();
    const bytes = sodium.randombytes_buf(32);
    return sodium.to_hex(bytes);
}
