import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { type AlertButton } from "react-native";
import { MaterialDialogContent } from "./material-dialog-content";
type Message = { title: string; message?: string; buttons?: AlertButton[]; compactActions?: boolean };
const Context = createContext<{ alert: (title: string, message?: string, buttons?: AlertButton[], options?: { compactActions?: boolean }) => void }>({ alert: () => {} });
export function MaterialDialogProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<Message | null>(null);
  const queue = useRef<Message[]>([]);
  const active = useRef(false);
  const dismiss = () => { const next = queue.current.shift() ?? null; active.current = !!next; setMessage(next); };
  const alert = (title: string, message?: string, buttons?: AlertButton[], options?: { compactActions?: boolean }) => {
    const next = { title, message, buttons, compactActions: options?.compactActions };
    if (active.current) queue.current.push(next);
    else { active.current = true; setMessage(next); }
  };
  return <Context.Provider value={{ alert }}>
    {children}
    <MaterialDialogContent message={message} dismiss={dismiss} onAction={button => {
      dismiss();
      Promise.resolve().then(() => button.onPress?.()).catch(() => alert("Erreur", "Impossible de terminer cette action."));
    }} />
  </Context.Provider>;
}
export const useMaterialDialog = () => useContext(Context);
