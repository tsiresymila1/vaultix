import { saveCredentials, clearCredentials, type AutofillCredential } from "@/modules/vaultix-autofill";
import { unsealKey, decryptSecret } from "./crypto";
import type { PasswordEntry } from "./passwords";

function domainOf(url: string | null): string {
  if (!url) return "";
  try {
    const parsed = new URL(url.includes("://") ? url : `https://${url}`);
    if (parsed.protocol === "androidapp:") return `androidapp://${parsed.hostname}`;
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.hostname.toLowerCase().replace(/\.$/, "") : "";
  } catch {
    return "";
  }
}

let generation = 0;

/** Decrypt every entry and publish it to the OS-shared store so the native
 *  autofill provider can offer them. Call after the list loads / on unlock. */
export async function syncAutofill(
  entries: PasswordEntry[],
  pwPublicKey: string,
  pwPrivateKey: string,
): Promise<void> {
  const current = ++generation;
  const creds: AutofillCredential[] = [];
  for (const e of entries) {
    try {
      const key = await unsealKey(e.sealed_key, pwPublicKey, pwPrivateKey);
      const password = await decryptSecret(e.encrypted_password, e.password_nonce, key);
      creds.push({
        id: e.id,
        domain: domainOf(e.website_url),
        username: e.username ?? "",
        password,
      });
    } catch {
      // skip entries we can't decrypt
    }
  }
  if (current === generation) saveCredentials(creds);
}

export function clearAutofill() {
  generation++;
  clearCredentials();
}

export function cancelAutofillSync() {
  generation++;
}
