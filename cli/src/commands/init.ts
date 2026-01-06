import { saveProjectConfig, loadConfig } from "../config";
import { supabase } from "../supabase";
import readline from "node:readline";

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

interface VaultInfo {
    vault_id: string;
    vaults: {
        name: string;
    };
}

export async function init(): Promise<void> {
    const config = loadConfig();

    if (!config.token) {
        console.error("❌ You must be logged in to initialize a project. Run `vaultix login` first.");
        return;
    }

    const client = supabase();

    const userResponse = await client.auth.getUser();
    const user = userResponse.data.user;

    if (!user) {
        console.error("❌ Authentication error. Please run `vaultix login` again.");
        return;
    }

    console.log("Fetching your vaults...");
    const { data: vaultsData, error } = await client
        .from("vault_members")
        .select("vault_id, vaults(name)")
        .eq("user_id", user.id);

    if (error) {
        console.error("❌ Failed to fetch vaults:", error.message);
        return;
    }

    const vaults = vaultsData as unknown as VaultInfo[];

    if (!vaults || vaults.length === 0) {
        console.log("No vaults found. Please create a vault in the web dashboard first.");
        return;
    }

    console.log("\nAvailable Vaults:");
    vaults.forEach((v, i) => {
        console.log(`${i + 1}. ${v.vaults.name} (${v.vault_id})`);
    });

    const choice = await prompt(`\nSelect a vault to attach to this project (1-${vaults.length}): `);
    const index = parseInt(choice) - 1;
    const selected = vaults[index];

    if (!selected) {
        console.error("❌ Invalid selection.");
        return;
    }

    saveProjectConfig({
        vaultId: selected.vault_id,
        vaultName: selected.vaults.name
    });

    console.log(`\n✔ Project successfully attached to vault: ${selected.vaults.name}`);
    console.log("✔ vaultix.json created/updated.");
}


