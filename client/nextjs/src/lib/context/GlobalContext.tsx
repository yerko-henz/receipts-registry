// src/lib/context/GlobalContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createSPASassClientAuthenticated as createSPASassClient } from '@/lib/supabase/client';


type User = {
    email: string;
    id: string;
    registered_at: Date;
    email_confirmed_at?: string | null;
};

interface GlobalContextType {
    loading: boolean;
    user: User | null;
    region: string;
    setRegion: (region: string) => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export function GlobalProvider({ children, initialUser }: { children: React.ReactNode, initialUser?: any }) {
    const [loading, setLoading] = useState(!initialUser);
    const [user, setUser] = useState<User | null>(initialUser ? {
        email: initialUser.email!,
        id: initialUser.id,
        registered_at: new Date(initialUser.created_at),
        email_confirmed_at: initialUser.email_confirmed_at
    } : null);
    const [region, setRegion] = useState<string>('es-CL');

    useEffect(() => {
        if (initialUser) return;

        async function loadData() {
            try {
                const supabase = await createSPASassClient();
                const client = supabase.getSupabaseClient();
                
                console.log('GlobalContext: Client created', !!client);

                // Get user data
                const userResponse = await client.auth.getUser();
                console.log('GlobalContext: getUser response', userResponse);
                const { data: { user } } = userResponse;
                
                if (user) {
                    setUser({
                        email: user.email!,
                        id: user.id,
                        registered_at: new Date(user.created_at),
                        email_confirmed_at: user.email_confirmed_at
                    });
                } else {
                    throw new Error('User not found');
                }

            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        }

        // Load region from cookie
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
        }
        const regionCookie = getCookie('NEXT_REGION');
        if (regionCookie) setRegion(regionCookie);

        loadData();
    }, []);

    const updateRegion = (newRegion: string) => {
        setRegion(newRegion);
        document.cookie = `NEXT_REGION=${newRegion}; path=/; max-age=31536000; SameSite=Lax`;
    };

    return (
        <GlobalContext.Provider value={{ loading, user, region, setRegion: updateRegion }}>
            {children}
        </GlobalContext.Provider>
    );
}

export const useGlobal = () => {
    const context = useContext(GlobalContext);
    if (context === undefined) {
        throw new Error('useGlobal must be used within a GlobalProvider');
    }
    return context;
};

