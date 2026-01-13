import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.CLI_JWT_SECRET || "default-secret-change-me-in-production";
const secret = new TextEncoder().encode(JWT_SECRET);

export interface CliTokenPayload {
    userId: string;
    email: string;
}

export async function signCliToken(payload: CliTokenPayload): Promise<string> {
    return await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d") // CLI tokens last longer
        .sign(secret);
}

export async function verifyCliToken(token: string): Promise<CliTokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, secret);
        return payload as unknown as CliTokenPayload;
    } catch (error) {
        console.error("JWT verification failed:", error);
        return null;
    }
}
