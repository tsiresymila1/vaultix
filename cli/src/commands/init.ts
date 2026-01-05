import { generateKeys, saveConfig } from "../config";

export async function init(): Promise<void> {
    const keys = await generateKeys();
    saveConfig(keys);
    console.log("✔ Vaultix initialized (vaultix.json created)");
}
