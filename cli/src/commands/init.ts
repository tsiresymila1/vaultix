import { generateProjectKey, saveConfig } from "../config";

export async function init(): Promise<void> {
    const projectKey = await generateProjectKey();
    saveConfig({ projectKey });
    console.log("✔ Vaultix initialized");
}
