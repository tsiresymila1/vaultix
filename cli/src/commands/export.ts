import { pullSecrets } from "./secrets";

export async function exportEnv(
    vault: string | undefined,
    opts: { env?: string }
): Promise<void> {

    const data = await pullSecrets(vault, opts);

    if (data.length === 0) return;

    console.log(data.map(s => `${s.key}=${s.value}`).join("\n"));
}


