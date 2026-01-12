import { spawn } from "child_process";
import { pullSecrets } from "./secrets";
import { success, error, info, bold, warn } from "../utils/colors";

export async function runCommand(
    vault: string | undefined,
    opts: { env?: string },
    cmd: string[]
): Promise<void> {
    if (!cmd?.length || !cmd[0]) {
        error("Missing command to run. Example: vaultix run --env Development -- npm start");
        return;
    }


    const secrets = await pullSecrets(vault, opts);

    if (secrets.length > 0) {
        success(`Injected ${bold(secrets.length.toString())} secrets:`);
        secrets.forEach(s => console.log(`  ${bold("→")} ${s.key}`));
        console.log("");
    } else {
        warn("No secrets found to inject.\n");
    }

    // Convert secrets list to an object for process.env
    const secretEnv = secrets.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});

    info(`Running command: ${bold(cmd.join(" "))}\n`);

    const child = spawn(cmd[0], cmd.slice(1), {
        stdio: "inherit",
        env: { ...process.env, ...secretEnv },
        shell: true
    });

    child.on("exit", (code: number | null) => process.exit(code ?? 0));
}

