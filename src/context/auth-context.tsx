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
    setKeys: (masterKey: Uint8Array, privateKey: string) => void;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [masterKey, setMasterKeyState] = useState<Uint8Array | null>(null);
    const [privateKey, setPrivateKeyState] = useState<string | null>(null);

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

            if (data) {
                if (data.status === 'banned') {
                    await supabase.auth.signOut();
                    setUserData(null);
                    setUser(null);
                    toast.error("Account suspended. Contact support.");
                    return;
                }
                setUserData(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        // Initial Session Check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Auth State Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setUser(session?.user ?? null);
            if (!session) {
                setMasterKeyState(null);
                setPrivateKeyState(null);
                setUserData(null);
                setLoading(false);
            } else {
                await fetchProfile(session.user.id);
                setLoading(false);
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
        setUserData(null);
        localStorage.clear(); // Safety clear
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
            setKeys,
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
