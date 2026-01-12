import { saveGlobalConfig } from "../config";
import { success, error } from "../utils/colors";

export async function logout(): Promise<void> {
    try {
        saveGlobalConfig({
            token: undefined,
            privateKey: undefined,
            publicKey: undefined,
            email: undefined,
            authSession: undefined, // Clear persistent session
        });
        success("Logged out successfully.");
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        error(`Failed to log out: ${message}`);
        process.exit(1);
    }
}
