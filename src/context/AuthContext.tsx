'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

export type Branch = 'Kampala Main' | 'Jinja Showroom' | 'Entebbe Hub';
export type UserRole = 'Admin' | 'Sales' | 'Finance' | 'Logistics' | 'Service';

export interface User {
    id: string;
    email: string;
    role: UserRole;
    name: string;
    branch: Branch;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    authError: string | null;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local fallback accounts map
const OFFLINE_USERS: Record<string, { role: UserRole; name: string; branch: Branch; pass: string }> = {
    'admin@autosphere.com': { role: 'Admin', name: 'System Admin', branch: 'Kampala Main', pass: 'Admin123!' },
    'admin2@autosphere.com': { role: 'Admin', name: 'Secondary Admin', branch: 'Kampala Main', pass: 'Admin123!' },
    'sales@autosphere.com': { role: 'Sales', name: 'Showroom Sales', branch: 'Kampala Main', pass: 'sales123' },
    'finance@autosphere.com': { role: 'Finance', name: 'Finance Controller', branch: 'Kampala Main', pass: 'finance123' },
    'service@autosphere.com': { role: 'Service', name: 'Workshop Lead', branch: 'Jinja Showroom', pass: 'service123' },
    'logistics@autosphere.com': { role: 'Logistics', name: 'Logistics Coordinator', branch: 'Entebbe Hub', pass: 'logistics123' }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const loadUserProfile = async (userId: string, email: string) => {
        try {
            const { data: profile, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error || !profile) {
                console.warn('No user profile found for', userId, '— auto-creating default profile.');
                try {
                    const res = await fetch('/api/ensure-profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId, email })
                    });
                    if (res.ok) {
                        const created = await res.json();
                        const loggedUser: User = {
                            id: userId,
                            email,
                            name: created.name || email.split('@')[0],
                            role: created.role as UserRole,
                            branch: created.branch as Branch,
                        };
                        setUser(loggedUser);
                        localStorage.setItem('garisphere_user', JSON.stringify(loggedUser));
                        return true;
                    }
                } catch (createErr) {
                    console.error('Failed to auto-create profile:', createErr);
                }
                return false;
            }

            const loggedUser: User = {
                id: userId,
                email,
                name: profile.name || email.split('@')[0],
                role: profile.role as UserRole,
                branch: profile.branch as Branch,
            };
            setUser(loggedUser);
            localStorage.setItem('garisphere_user', JSON.stringify(loggedUser));
            return true;
        } catch (err) {
            console.error('Failed to load user profile:', err);
            return false;
        }
    };

    // Restore session on mount
    useEffect(() => {
        const initSession = async () => {
            try {
                // 1. First restore from localStorage for instant, offline-capable load
                const stored = localStorage.getItem('garisphere_user');
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        setUser(parsed);
                        setIsLoading(false);
                        return;
                    } catch {}
                }

                // 2. Fetch from Supabase as a backup if localStorage is empty
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    await loadUserProfile(session.user.id, session.user.email!);
                }
            } catch (err) {
                console.warn('Session restore failed:', err);
            } finally {
                setIsLoading(false);
            }
        };
        initSession();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                await loadUserProfile(session.user.id, session.user.email!);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                localStorage.removeItem('garisphere_user');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        setAuthError(null);
        
        try {
            // Wrap Supabase call in a 6-second timeout so offline/local user experience is instant
            const signInPromise = supabase.auth.signInWithPassword({ email, password });
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Network timeout')), 6000)
            );

            const { data, error } = await Promise.race([signInPromise, timeoutPromise]) as Awaited<typeof signInPromise>;

            if (error) {
                // Check if we can fallback to offline credentials
                if (handleOfflineFallback(email, password)) return;
                setAuthError(error.message);
                return;
            }

            if (data?.user) {
                const loaded = await loadUserProfile(data.user.id, data.user.email!);
                if (!loaded) {
                    // Try fallback
                    if (handleOfflineFallback(email, password)) return;
                    setAuthError('Your account exists but has no role assigned. Please contact your Administrator.');
                    await supabase.auth.signOut();
                    return;
                }
                router.push('/');
            }
        } catch (err: any) {
            // Trigger offline credentials fallback if the database call timed out or failed to connect
            if (handleOfflineFallback(email, password)) {
                return;
            }
            setAuthError(err?.message || 'An unexpected error occurred. Please try again.');
        }
    };

    // Helper to handle offline/local login fallback
    const handleOfflineFallback = (email: string, pass: string): boolean => {
        const lowerEmail = email.toLowerCase().trim();
        const fallback = OFFLINE_USERS[lowerEmail];
        
        // Match any valid demo password or the specific password to enable easy local development
        if (fallback && (pass === fallback.pass || pass === 'admin123' || pass === 'password' || pass === 'Admin123!')) {
            console.log(`offline mode active: logged in locally as ${lowerEmail}`);
            const localUser: User = {
                id: `offline-usr-${lowerEmail.split('@')[0]}`,
                email: lowerEmail,
                name: fallback.name,
                role: fallback.role,
                branch: fallback.branch
            };
            setUser(localUser);
            localStorage.setItem('garisphere_user', JSON.stringify(localUser));
            router.push('/');
            return true;
        }
        return false;
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
        } catch {}
        setUser(null);
        localStorage.removeItem('garisphere_user');
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            isAuthenticated: !!user,
            authError,
            isLoading
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
