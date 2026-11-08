import { useEffect, useState } from "react";
import { UnlockDialogContent } from "./unlock-dialog-content";

export function UnlockDialog({ visible, onCancel, onUnlock }: { visible: boolean; onCancel: () => void; onUnlock: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (!visible) { setPassword(""); setError(""); setVisiblePassword(false); } }, [visible]);
  const submit = async () => {
    if (busy || !password) return;
    setBusy(true); setError("");
    try { await onUnlock(password); setPassword(""); }
    catch (reason) { setError(reason instanceof Error ? `Déverrouillage impossible : ${reason.message}` : "Déverrouillage impossible."); }
    finally { setBusy(false); }
  };
  return <UnlockDialogContent {...{ visible, busy, error, password, visiblePassword, onCancel, submit, setPassword, setError, setVisiblePassword }} />;
}
