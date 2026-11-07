import { useEffect, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "./auth";

// Device-local preference; never uploads account names or entry IDs.
export function useFavorites() {
  const { session } = useAuth();
  const account = session?.email ?? "";
  const key = `vaultix.favorites.${Array.from(account).map(c => c.charCodeAt(0).toString(16).padStart(4, "0")).join("")}`;
  const [ids, setIds] = useState<string[]>([]);
  const current = useRef<string[]>([]);
  const queue = useRef(Promise.resolve());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setReady(false);
    setIds([]);
    current.current = [];
    setError(null);
    SecureStore.getItemAsync(key).then(raw => {
      const data: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(data) || !data.every(id => typeof id === "string")) throw new Error("Invalid favorites");
      if (active) { current.current = data; setIds(data); setReady(true); }
    }).catch(() => { if (active) setError("Impossible de charger les favoris de cet appareil."); });
    return () => { active = false; };
  }, [key]);
  const toggle = (id: string) => {
    if (!ready) return;
    const next = current.current.includes(id) ? current.current.filter(value => value !== id) : [...current.current, id];
    current.current = next;
    setIds(next);
    queue.current = queue.current.then(() => SecureStore.setItemAsync(key, JSON.stringify(next)))
      .then(() => setError(null)).catch(() => setError("Impossible d’enregistrer les favoris sur cet appareil."));
  };
  return { ids, ready, error, toggle };
}
