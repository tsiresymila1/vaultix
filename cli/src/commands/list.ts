import { callCliApi } from "../supabase";
import { success, error, bold, colors } from "../utils/colors";

export async function listVaults(): Promise<void> {
    const { data, error: apiError } = await callCliApi("list-vaults");

    if (apiError) {
        error(`Failed to list vaults: ${apiError}`);
        return;
    }

    if (data && data.length > 0) {
        console.log(`\n${bold("Your Vaults:")}`);
        data.forEach((e: { name: string }) => {
            console.log(`  ${colors.fg.cyan}→${colors.reset} ${e.name}`);
        });
        console.log("");
    } else {
        console.log("\nNo vaults found. Create one at https://vaultix-secure.vercel.app\n");
    }
}
