"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    masterKey: Uint8Array | null;
    privateKey: string | null;
    setKeys: (masterKey: Uint8Array, privateKey: string) => void;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [masterKey, setMasterKeyState] = useState<Uint8Array | null>(null);
    const [privateKey, setPrivateKeyState] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (!session) {
                setMasterKeyState(null);
                setPrivateKeyState(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const setKeys = (mk: Uint8Array, pk: string) => {
        setMasterKeyState(mk);
        setPrivateKeyState(pk);
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setMasterKeyState(null);
        setPrivateKeyState(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, masterKey, privateKey, setKeys, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
