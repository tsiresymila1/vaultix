export interface ParsedEnvEntry {
    key: string;
    value: string;
    line: number;
}

/**
 * Minimal `.env` parser:
 * - supports `KEY=VALUE`
 * - ignores empty lines and comments starting with `#`
 * - supports quoted values with single/double quotes
 */
export function parseDotEnv(contents: string): ParsedEnvEntry[] {
    const lines = contents.split(/\r?\n/);
    const out: ParsedEnvEntry[] = [];

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const trimmed = raw.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const eqIdx = trimmed.indexOf("=");
        if (eqIdx <= 0) continue;

        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1);

        // strip optional inline comments: KEY=VALUE # comment
        // only when VALUE is not quoted
        const valueTrim = value.trimStart();
        const startsQuoted = valueTrim.startsWith('"') || valueTrim.startsWith("'");
        if (!startsQuoted) {
            const hashIdx = value.indexOf("#");
            if (hashIdx >= 0) value = value.slice(0, hashIdx);
        }

        value = value.trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        if (!key) continue;
        out.push({ key, value, line: i + 1 });
    }

    return out;
}

