"use client";
import { useEffect } from "react";
import { useAuth } from "@/context/auth-context";

export function ThemeSynchronizer() {
    const { userData } = useAuth();

    useEffect(() => {
        // Default to dark if no setting
        const theme = userData?.settings?.theme || "dark";
        const root = window.document.documentElement;

        root.classList.remove("light", "dark");

        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
            root.classList.add(systemTheme);
        } else {
            root.classList.add(theme);
        }
    }, [userData?.settings?.theme]);

    return null;
}
