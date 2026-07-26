import { useCallback, useEffect, useState } from "react";
import { api, bearer } from "./api";
import { useAuth } from "./auth";

export interface MobileVault {
  id: string;
  name: string;
  environments: string[];
}

interface CliResponse {
  data: unknown;
  error: null | { message?: string };
}

interface RawVault {
  vault_id: string;
  vaults: { name: string };
}

function messageFrom(error: CliResponse["error"], fallback: string) {
  return error?.message || fallback;
}

export function useVaults() {
  const { session } = useAuth();
  const [vaults, setVaults] = useState<MobileVault[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);

    try {
      const response = await api.cli.$post(
        { json: { action: "get-user-vaults", params: {} } },
        { headers: bearer(session.token) },
      );
      const body = (await response.json()) as CliResponse;
      if (!response.ok || body.error) {
        throw new Error(messageFrom(body.error, "Failed to load vaults"));
      }

      const rawVaults = Array.isArray(body.data) ? (body.data as RawVault[]) : [];
      const next = await Promise.all(
        rawVaults.map(async (vault): Promise<MobileVault> => {
          const environmentsResponse = await api.cli.$post(
            {
              json: {
                action: "list-envs",
                params: { vaultNameOrId: vault.vault_id },
              },
            },
            { headers: bearer(session.token) },
          );
          const environmentsBody = (await environmentsResponse.json()) as CliResponse;
          const environments =
            environmentsResponse.ok && !environmentsBody.error && Array.isArray(environmentsBody.data)
              ? environmentsBody.data
                  .map((item) => (typeof item === "object" && item && "name" in item ? String(item.name) : ""))
                  .filter(Boolean)
              : [];

          return {
            id: vault.vault_id,
            name: vault.vaults.name,
            environments,
          };
        }),
      );

      setVaults(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load vaults");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { vaults, loading, error, refresh };
}
