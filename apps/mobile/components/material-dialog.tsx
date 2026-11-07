import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { Modal, ScrollView, View, type AlertButton } from "react-native";
import { Button } from "./ui/button";
import { Text } from "./ui/text";
type Message = { title: string; message?: string; buttons?: AlertButton[] };
const Context = createContext<{ alert: (title: string, message?: string, buttons?: AlertButton[]) => void }>({ alert: () => {} });
export function MaterialDialogProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<Message | null>(null);
  const queue = useRef<Message[]>([]);
  const active = useRef(false);
  const dismiss = () => { const next = queue.current.shift() ?? null; active.current = !!next; setMessage(next); };
  const alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const next = { title, message, buttons };
    if (active.current) queue.current.push(next);
    else { active.current = true; setMessage(next); }
  };
  return <Context.Provider value={{ alert }}>
    {children}
    <Modal visible={!!message} transparent animationType="fade" onRequestClose={dismiss}>
      <View className="flex-1 justify-center bg-black/40 px-6">
        <View accessibilityViewIsModal className="max-h-[80%] rounded-[28px] bg-card p-6">
          <ScrollView><Text className="text-xl font-semibold">{message?.title}</Text><Text className="mt-3 text-sm leading-6 text-muted-foreground">{message?.message}</Text></ScrollView>
          <View className="mt-5 gap-2">{(message?.buttons ?? [{ text: "Fermer" }]).map((button, i) => <Button key={i} variant={button.style === "destructive" ? "destructive" : button.style === "cancel" ? "ghost" : "default"} onPress={() => { dismiss(); Promise.resolve().then(() => button.onPress?.()).catch(() => alert("Erreur", "Impossible de terminer cette action.")); }}><Text>{button.text}</Text></Button>)}</View>
        </View>
      </View>
    </Modal>
  </Context.Provider>;
}
export const useMaterialDialog = () => useContext(Context);
