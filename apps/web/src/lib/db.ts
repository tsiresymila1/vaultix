"use client";

import { init } from "@instantdb/react";
import { schema } from "@vaultix/schema";
import { clientEnv } from "@/lib/env";

/**
 * Browser InstantDB client (real-time). Import as `db` in client components:
 *   const { data } = db.useQuery({ vaults: {} });
 *   db.transact(db.tx.vaults[id].update({ name }));
 */
export const db = init({
  appId: clientEnv.NEXT_PUBLIC_INSTANT_APP_ID,
  schema,
});

export { schema };
