import { spawn } from "child_process";
import { pullSecrets } from "./secrets.js";

export async function runCommand(
    vault: string,
    opts: { env: string },
    cmd: string[]
): Promise<void> {
    if (!cmd?.length || !cmd[0]) {
        throw new Error("Missing command to run. Example: vaultix run <vault> --env Development -- node server.js");
    }

    await pullSecrets(vault, opts);

    const child = spawn(cmd[0], cmd.slice(1), {
        stdio: "inherit",
        env: { ...process.env }
    });

    child.on("exit", (code: number | null) => process.exit(code ?? 0));
}
