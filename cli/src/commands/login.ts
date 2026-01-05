import { loadConfig, saveConfig } from "../config";

export function login(email: string): void {
    const config = loadConfig();
    config.email = email;
    saveConfig(config);
    console.log(`✔ Logged in as ${email}`);
}
