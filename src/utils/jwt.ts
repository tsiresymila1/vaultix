import { SignJWT, jwtVerify } from "jose";
import { serverEnv } from "@/lib/env";

function getSecret() {
  return new TextEncoder().encode(serverEnv().CLI_JWT_SECRET);
}

export interface CliTokenPayload {
  userId: string;
  email: string;
}

export async function signCliToken(payload: CliTokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d") // CLI tokens last longer
    .sign(getSecret());
}

export async function verifyCliToken(token: string): Promise<CliTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.userId !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}
