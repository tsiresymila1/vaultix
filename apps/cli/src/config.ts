import fs from "fs";
import path from "path";
import os from "os";
import { getSodium } from "./crypto";

export interface VaultixConfig {
    // Global User Config (Home Dir)
    token?: string | undefined;
    email?: string | undefined;
    privateKey?: string | undefined;
    publicKey?: string | undefined;
    authSession?: Record<string, unknown> | undefined; // Stores full Supabase session

    // Project Local Config (Current Project Dir)
    vaultId?: string | undefined;
    vaultName?: string | undefined;
    projectKey?: string | undefined; // Legacy/Compatibility
}

const GLOBAL_CONFIG_DIR = path.join(os.homedir(), ".vaultix");
const GLOBAL_CONFIG_FILE = path.join(GLOBAL_CONFIG_DIR, "config.json");
const PROJECT_CONFIG_FILE = path.join(process.cwd(), "vaultix.json");

export function loadConfig(): VaultixConfig {
    let config: VaultixConfig = {};

    // 1. Load Global Config
    if (fs.existsSync(GLOBAL_CONFIG_FILE)) {
        try {
            const globalConfig = JSON.parse(fs.readFileSync(GLOBAL_CONFIG_FILE, "utf-8"));
            config = { ...config, ...globalConfig };
        } catch (e) {
            console.error("Warning: Global config file is corrupted.");
        }
    }

    // 2. Load Project Config
    if (fs.existsSync(PROJECT_CONFIG_FILE)) {
        try {
            const projectConfig = JSON.parse(fs.readFileSync(PROJECT_CONFIG_FILE, "utf-8"));
            config = { ...config, ...projectConfig };
        } catch (e) {
            console.error("Warning: Project config file is corrupted.");
        }
    }

    return config;
}

export function saveGlobalConfig(config: Partial<VaultixConfig>): void {
    if (!fs.existsSync(GLOBAL_CONFIG_DIR)) {
        fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
    }

    let existing: Partial<VaultixConfig> = {};
    if (fs.existsSync(GLOBAL_CONFIG_FILE)) {
        try {
            existing = JSON.parse(fs.readFileSync(GLOBAL_CONFIG_FILE, "utf-8"));
        } catch (e) { }
    }

    // Only save user-related fields to global
    const toSave: Partial<VaultixConfig> = {
        token: config.token ?? existing.token,
        email: config.email ?? existing.email,
        privateKey: config.privateKey ?? existing.privateKey,
        publicKey: config.publicKey ?? existing.publicKey,
        authSession: config.authSession ?? existing.authSession,
    };

    // Remove undefined
    Object.keys(toSave).forEach(key => {
        const k = key as keyof VaultixConfig;
        if (toSave[k] === undefined) {
            delete toSave[k];
        }
    });

    fs.writeFileSync(GLOBAL_CONFIG_FILE, JSON.stringify(toSave, null, 2));
}

export function saveProjectConfig(config: Partial<VaultixConfig>): void {
    let existing: Partial<VaultixConfig> = {};
    if (fs.existsSync(PROJECT_CONFIG_FILE)) {
        try {
            existing = JSON.parse(fs.readFileSync(PROJECT_CONFIG_FILE, "utf-8"));
        } catch (e) { }
    }

    // Only save project-related fields to local
    const toSave: Partial<VaultixConfig> = {
        vaultId: config.vaultId ?? existing.vaultId,
        vaultName: config.vaultName ?? existing.vaultName,
        projectKey: config.projectKey ?? existing.projectKey,
    };

    // Remove undefined
    Object.keys(toSave).forEach(key => {
        const k = key as keyof VaultixConfig;
        if (toSave[k] === undefined) {
            delete toSave[k];
        }
    });

    fs.writeFileSync(PROJECT_CONFIG_FILE, JSON.stringify(toSave, null, 2));
}


/**
 * @deprecated Use saveGlobalConfig or saveProjectConfig
 */
export function saveConfig(config: Partial<VaultixConfig>): void {
    if (config.token || config.email || config.privateKey || config.publicKey) {
        saveGlobalConfig(config);
    }
    if (config.vaultId || config.vaultName || config.projectKey) {
        saveProjectConfig(config);
    }
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

