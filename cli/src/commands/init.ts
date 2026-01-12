import { saveProjectConfig, loadConfig } from "../config";
import { callCliApi } from "../supabase";
import readline from "node:readline";
import { success, error, info, bold, colors, warn } from "../utils/colors";

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
        error("You must be logged in to initialize a project. Run `vaultix login` first.");
        return;
    }

    info("Fetching your vaults...");
    const { data: vaultsData, error: apiError } = await callCliApi("get-user-vaults");

    if (apiError) {
        error(`Failed to fetch vaults: ${apiError}`);
        return;
    }

    const vaults = vaultsData as unknown as VaultInfo[];

    if (!vaults || vaults.length === 0) {
        warn("No vaults found. Please create a vault in the web dashboard first.");
        return;
    }

    console.log(`\n${bold("Available Vaults:")}`);
    vaults.forEach((v, i) => {
        console.log(`  ${colors.fg.cyan}${i + 1}.${colors.reset} ${v.vaults.name} ${colors.dim}(${v.vault_id})${colors.reset}`);
    });

    const choice = await prompt(`\nSelect a vault to attach to this project (1-${vaults.length}): `);
    const index = parseInt(choice) - 1;
    const selected = vaults[index];

    if (!selected) {
        error("Invalid selection.");
        return;
    }

    saveProjectConfig({
        vaultId: selected.vault_id,
        vaultName: selected.vaults.name
    });

    console.log("");
    success(`Project successfully attached to vault: ${bold(selected.vaults.name)}`);
    success("vaultix.json created/updated.");
    console.log("");
}


