"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { UserData } from "@/types";
import { toast } from "sonner";

interface AuthContextType {
    user: User | null;
    userData: UserData | null;
    loading: boolean;
    masterKey: Uint8Array | null;
    privateKey: string | null;
    vaultKeys: Record<string, string>;
    setKeys: (masterKey: Uint8Array, privateKey: string) => void;
    setVaultKey: (vaultId: string, key: string) => void;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

interface AuthProviderProps {
    children: React.ReactNode;
    initialUser?: User | null;
    initialUserData?: UserData | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
    children,
    initialUser = null,
    initialUserData = null
}: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(initialUser);
    const [userData, setUserData] = useState<UserData | null>(initialUserData);
    const [loading, setLoading] = useState(!initialUser);

    // Crypto session state
    const [masterKey, setMasterKeyState] = useState<Uint8Array | null>(null);
    const [privateKey, setPrivateKeyState] = useState<string | null>(null);
    const [vaultKeys, setVaultKeys] = useState<Record<string, string>>({});

    // Restore crypto session from sessionStorage on mount
    useEffect(() => {
        try {
            const savedMK = sessionStorage.getItem("vx_mk");
            const savedPK = sessionStorage.getItem("vx_pk");
            const savedVK = sessionStorage.getItem("vx_vk");

            if (savedMK && savedPK) {
                // Decode masterKey from base64
                const mkArray = new Uint8Array(atob(savedMK).split("").map(c => c.charCodeAt(0)));
                setMasterKeyState(mkArray);
                setPrivateKeyState(savedPK);
            }

            if (savedVK) {
                setVaultKeys(JSON.parse(savedVK));
            }
        } catch (err) {
            console.error("Failed to restore session from storage", err);
        }
    }, []);

    // Sync state with server-provided props (supports router.refresh())
    useEffect(() => {
        setUser(initialUser);
        if (initialUser) setLoading(false);
    }, [initialUser]);

    useEffect(() => {
        setUserData(initialUserData);
    }, [initialUserData]);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
                return;
            }
            setUserData(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        // Auth State Listener - strictly for managing session cleanup/discovery
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (event === 'SIGNED_IN' && session?.user && !userData) {
                // If we signed in (e.g. from login page) and don't have userData yet, fetch it
                await fetchProfile(session.user.id);
            }

            if (event === 'SIGNED_OUT') {
                setMasterKeyState(null);
                setPrivateKeyState(null);
                setUserData(null);
            }

            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [userData]);

    const setKeys = (mk: Uint8Array, pk: string) => {
        setMasterKeyState(mk);
        setPrivateKeyState(pk);

        // Persist to sessionStorage for tab-level persistence
        try {
            const b64MK = btoa(String.fromCharCode(...Array.from(mk)));
            sessionStorage.setItem("vx_mk", b64MK);
            sessionStorage.setItem("vx_pk", pk);
        } catch (err) {
            console.error("Failed to save session keys", err);
        }
    };

    const setVaultKey = (vaultId: string, key: string) => {
        setVaultKeys(prev => {
            const next = { ...prev, [vaultId]: key };
            try {
                sessionStorage.setItem("vx_vk", JSON.stringify(next));
            } catch (err) {
                console.error("Failed to save vault keys", err);
            }
            return next;
        });
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setMasterKeyState(null);
        setPrivateKeyState(null);
        setUserData(null);
        setVaultKeys({});
        localStorage.clear();
        sessionStorage.clear();
    };

    const refreshProfile = async () => {
        if (user) await fetchProfile(user.id);
    };

    return (
        <AuthContext.Provider value={{
            user,
            userData,
            loading,
            masterKey,
            privateKey,
            vaultKeys,
            setKeys,
            setVaultKey,
            signOut,
            refreshProfile
        }}>
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
