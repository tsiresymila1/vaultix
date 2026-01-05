import sodium from "libsodium-wrappers-sumo";

let ready = false;

export async function getSodium(): Promise<typeof sodium> {
    if (!ready) {
        await sodium.ready;
        ready = true;
    }
    return sodium;
}
