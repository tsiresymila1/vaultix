import { spawn } from "child_process";
import { pullSecrets } from "./secrets";

export async function runCommand(
    vault: string | undefined,
    opts: { env?: string },
    cmd: string[]
): Promise<void> {
    if (!cmd?.length || !cmd[0]) {
        console.error("❌ Error: Missing command to run. Example: vaultix run --env Development -- npm start");
        return;
    }


    const secrets = await pullSecrets(vault, opts);

    // Convert secrets list to an object for process.env
    const secretEnv = secrets.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});

    const child = spawn(cmd[0], cmd.slice(1), {
        stdio: "inherit",
        env: { ...process.env, ...secretEnv }
    });

    child.on("exit", (code: number | null) => process.exit(code ?? 0));
}

