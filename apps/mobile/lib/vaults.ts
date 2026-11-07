import { useMemo } from "react";
import { useAuth } from "./auth";
import { db } from "./instant";

export interface MobileVault {
  id: string;
  name: string;
  environments: string[];
}

function messageFrom(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useVaults() {
  const { session } = useAuth();
  const { user, isLoading: authLoading } = db.useAuth();
  const { data, isLoading, error } = db.useQuery(
    session && user
      ? {
          vaults: {
            $: { order: { createdAt: "desc" } },
            environments: { $: { order: { createdAt: "asc" } } },
          },
        }
      : null,
  );

  const vaults = useMemo<MobileVault[]>(
    () =>
      (data?.vaults ?? []).map((vault) => ({
        id: vault.id,
        name: vault.name,
        environments: (vault.environments ?? []).map((environment) => environment.name),
      })),
    [data?.vaults],
  );

  return {
    vaults,
    loading: authLoading || isLoading,
    error: error ? messageFrom(error, "Failed to load vaults") : null,
  };
}
