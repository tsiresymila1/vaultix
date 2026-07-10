import type { createAdminDb } from "./db-admin";

export type AdminDb = ReturnType<typeof createAdminDb>;

export interface AuthedUser {
  id: string;
  email: string;
}

// Hono environment: `user` is populated by the auth middleware.
export interface AppEnv {
  Variables: {
    user: AuthedUser;
  };
}
