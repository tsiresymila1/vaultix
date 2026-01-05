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
    const [masterKey, setMasterKeyState] = useState<Uint8Array | null>(null);
    const [privateKey, setPrivateKeyState] = useState<string | null>(null);

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
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setMasterKeyState(null);
        setPrivateKeyState(null);
        setUserData(null);
        localStorage.clear();
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
