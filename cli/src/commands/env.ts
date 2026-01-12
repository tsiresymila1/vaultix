import { callCliApi } from "../supabase";
import { loadConfig } from "../config";
import { error, bold, colors, info } from "../utils/colors";

export async function listEnvs(vault: string | undefined): Promise<void> {
    const config = loadConfig();
    const vaultNameOrId = vault || config.vaultName || config.vaultId;

    if (!vaultNameOrId) {
        error("No vault specified and no project configuration found. Run `vaultix init` or specify a vault.");
        return;
    }

    info(`Fetching environments for vault: ${bold(vaultNameOrId)}...`);

    const { data, error: apiError } = await callCliApi("list-envs", { vaultNameOrId });

    if (apiError) {
        error(`Failed to fetch environments: ${apiError}`);
        return;
    }

    if (!data || data.length === 0) {
        console.log(`\nNo environments found for vault "${bold(vaultNameOrId)}".\n`);
        return;
    }

    console.log(`\n${bold("Environments:")}`);
    data.forEach((e: { name: string }) => {
        console.log(`  ${colors.fg.cyan}→${colors.reset} ${e.name}`);
    });
    console.log("");
}


