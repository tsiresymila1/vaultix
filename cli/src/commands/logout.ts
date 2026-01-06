import { saveGlobalConfig } from "../config";

export async function logout(): Promise<void> {
    try {
        saveGlobalConfig({
            token: undefined,
            privateKey: undefined,
            publicKey: undefined,
            email: undefined,
            authSession: undefined, // Clear persistent session
        });
        console.log("✔ Logged out successfully.");
    } catch (err) {
        console.error("❌ Failed to log out:", err);
        process.exit(1);
    }
}
