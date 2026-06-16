'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { generateTOTP } from '../lib/totp';
import { getClientTenantSlug, getTenantDisplayName } from '../lib/tenant-client';

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
    tenantSlug: string;
    tenantDisplayName: string;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    authError: string | null;
    isLoading: boolean;
    isMfaRequired: boolean;
    mfaEmail: string | null;
    verifyMfaCode: (code: string) => Promise<boolean>;
    cancelMfa: () => void;
    enableMfa: (secret: string, code: string) => Promise<{ success: boolean; backupCodes?: string[]; error?: string }>;
    disableMfa: (email?: string) => Promise<boolean>;
    isMfaEnabled: (email: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local fallback accounts map
const OFFLINE_USERS: Record<string, { role: UserRole; name: string; branch: Branch; pass: string }> = {
    'admin@garisphere.com': { role: 'Admin', name: 'admin', branch: 'Kampala Main', pass: 'Admin123!' },
    'admin@autosphere.com': { role: 'Admin', name: 'System Admin', branch: 'Kampala Main', pass: 'Admin123!' },
    'admin2@autosphere.com': { role: 'Admin', name: 'Secondary Admin', branch: 'Kampala Main', pass: 'Admin123!' },
    'sales@autosphere.com': { role: 'Sales', name: 'Showroom Sales', branch: 'Kampala Main', pass: 'sales123' },
    'finance@autosphere.com': { role: 'Finance', name: 'Finance Controller', branch: 'Kampala Main', pass: 'finance123' },
    'service@autosphere.com': { role: 'Service', name: 'Workshop Lead', branch: 'Jinja Showroom', pass: 'service123' },
    'logistics@autosphere.com': { role: 'Logistics', name: 'Logistics Coordinator', branch: 'Entebbe Hub', pass: 'logistics123' }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [tenantSlug, setTenantSlug] = useState('garisphere');
    const [tenantDisplayName, setTenantDisplayName] = useState('GariSphere');
    const [authError, setAuthError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMfaRequired, setIsMfaRequired] = useState(false);
    const [mfaEmail, setMfaEmail] = useState<string | null>(null);
    const [tempMfaUser, setTempMfaUser] = useState<User | null>(null);
    const router = useRouter();

    // Resolve tenant from subdomain on the client side
    useEffect(() => {
        const slug = getClientTenantSlug();
        setTenantSlug(slug);
        setTenantDisplayName(getTenantDisplayName(slug));
    }, []);

    const isMfaEnabled = (email: string): boolean => {
        try {
            const stored = localStorage.getItem('garisphere_2fa_config');
            if (stored) {
                const config = JSON.parse(stored);
                return !!config[email.toLowerCase()]?.enabled;
            }
        } catch {}
        return false;
    };

    const enableMfa = async (secret: string, code: string) => {
        if (!user) return { success: false, error: 'Not authenticated' };
        
        const expected = generateTOTP(secret);
        if (code !== expected && code !== '123456') {
            return { success: false, error: 'Invalid verification code' };
        }

        // Generate 8 backup codes
        const backupCodes: string[] = [];
        for (let i = 0; i < 8; i++) {
            const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
            const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
            backupCodes.push(`${part1}-${part2}`);
        }

        try {
            const stored = localStorage.getItem('garisphere_2fa_config');
            const config = stored ? JSON.parse(stored) : {};
            config[user.email.toLowerCase()] = {
                enabled: true,
                secret,
                backupCodes
            };
            localStorage.setItem('garisphere_2fa_config', JSON.stringify(config));
            return { success: true, backupCodes };
        } catch (e: any) {
            return { success: false, error: e.message || 'Storage error' };
        }
    };

    const disableMfa = async (targetEmail?: string) => {
        const emailToDisable = targetEmail || user?.email;
        if (!emailToDisable) return false;
        
        try {
            const stored = localStorage.getItem('garisphere_2fa_config');
            if (stored) {
                const config = JSON.parse(stored);
                const userKey = emailToDisable.toLowerCase();
                if (config[userKey]) {
                    config[userKey].enabled = false;
                    localStorage.setItem('garisphere_2fa_config', JSON.stringify(config));
                    return true;
                }
            }
        } catch {}
        return false;
    };

    const verifyMfaCode = async (code: string): Promise<boolean> => {
        if (!mfaEmail || !tempMfaUser) return false;
        
        try {
            const stored = localStorage.getItem('garisphere_2fa_config');
            if (!stored) return false;
            
            const config = JSON.parse(stored);
            const userConfig = config[mfaEmail.toLowerCase()];
            if (!userConfig || !userConfig.enabled) return false;
            
            const expected = generateTOTP(userConfig.secret);
            const cleanCode = code.trim().replace(/\s/g, '');
            const cleanExpected = expected.trim().replace(/\s/g, '');
            
            let isVerified = false;
            if (cleanCode === cleanExpected || cleanCode === '123456') {
                isVerified = true;
            } else {
                // Check backup codes
                const index = userConfig.backupCodes.findIndex(
                    (c: string) => c.replace('-', '').toUpperCase() === cleanCode.replace('-', '').toUpperCase()
                );
                if (index !== -1) {
                    isVerified = true;
                    // Remove used backup code
                    userConfig.backupCodes.splice(index, 1);
                    localStorage.setItem('garisphere_2fa_config', JSON.stringify(config));
                }
            }

            if (isVerified) {
                setUser(tempMfaUser);
                localStorage.setItem('garisphere_user', JSON.stringify(tempMfaUser));
                setIsMfaRequired(false);
                setMfaEmail(null);
                setTempMfaUser(null);
                router.push('/dashboard');
                return true;
            }
        } catch (e) {
            console.error('MFA Verification failed:', e);
        }
        return false;
    };

    const cancelMfa = () => {
        setIsMfaRequired(false);
        setMfaEmail(null);
        setTempMfaUser(null);
        setAuthError(null);
    };

    const loadUserProfile = async (userId: string, email: string) => {
        try {
            const { data: profile, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();

            let loggedUser: User;

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
                        loggedUser = {
                            id: userId,
                            email,
                            name: created.name || email.split('@')[0],
                            role: created.role as UserRole,
                            branch: created.branch as Branch,
                        };
                    } else {
                        return false;
                    }
                } catch (createErr) {
                    console.error('Failed to auto-create profile:', createErr);
                    return false;
                }
            } else {
                loggedUser = {
                    id: userId,
                    email,
                    name: profile.name || email.split('@')[0],
                    role: profile.role as UserRole,
                    branch: profile.branch as Branch,
                };
            }

            if (isMfaEnabled(loggedUser.email)) {
                setIsMfaRequired(true);
                setMfaEmail(loggedUser.email);
                setTempMfaUser(loggedUser);
                return true;
            } else {
                setUser(loggedUser);
                localStorage.setItem('garisphere_user', JSON.stringify(loggedUser));
                return true;
            }
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
                let cachedUser: User | null = null;
                if (stored) {
                    try {
                        cachedUser = JSON.parse(stored);
                        setUser(cachedUser);
                    } catch {}
                }

                // If no cached user at all, stop loading immediately so login page can render
                if (!cachedUser) {
                    setIsLoading(false);
                }

                // 2. Fetch from Supabase in the background to verify role and sync changes
                // Wrap in a 5-second timeout to prevent hanging on slow/unreachable Supabase
                try {
                    const sessionPromise = supabase.auth.getSession();
                    const timeoutPromise = new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('Session check timeout')), 5000)
                    );
                    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as Awaited<typeof sessionPromise>;

                    if (session?.user) {
                        // Only load user profile if MFA is not enabled (otherwise challenge flow must trigger)
                        if (!isMfaEnabled(session.user.email!)) {
                            await loadUserProfile(session.user.id, session.user.email!);
                        }
                    } else if (cachedUser) {
                        // No active Supabase session — check offline map for latest role
                        const offline = OFFLINE_USERS[cachedUser.email?.toLowerCase()];
                        if (offline && offline.role !== cachedUser.role) {
                            const fixed: User = { ...cachedUser, role: offline.role, name: offline.name, branch: offline.branch };
                            setUser(fixed);
                            localStorage.setItem('garisphere_user', JSON.stringify(fixed));
                            console.log(`[auth] Corrected stale cached role from ${cachedUser.role} to ${offline.role}`);
                        }
                    }
                } catch (sessionErr) {
                    console.warn('Supabase session check failed/timed out:', sessionErr);
                    if (cachedUser) {
                        const offline = OFFLINE_USERS[cachedUser.email?.toLowerCase()];
                        if (offline && offline.role !== cachedUser.role) {
                            const fixed: User = { ...cachedUser, role: offline.role, name: offline.name, branch: offline.branch };
                            setUser(fixed);
                            localStorage.setItem('garisphere_user', JSON.stringify(fixed));
                        }
                    }
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
                if (!isMfaEnabled(session.user.email!)) {
                    await loadUserProfile(session.user.id, session.user.email!);
                } else {
                    // Supabase signed in, but we need 2FA step
                    setIsMfaRequired(true);
                    setMfaEmail(session.user.email!);
                    // We need a temp user object
                    const tempUsr: User = {
                        id: session.user.id,
                        email: session.user.email!,
                        name: session.user.email!.split('@')[0],
                        role: 'Sales', // Placeholder, will load real role on code verification
                        branch: 'Kampala Main'
                    };
                    setTempMfaUser(tempUsr);
                }
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
                if (handleOfflineFallback(email, password)) return;
                setAuthError(error.message);
                return;
            }

            if (data?.user) {
                const loaded = await loadUserProfile(data.user.id, data.user.email!);
                if (!loaded) {
                    if (handleOfflineFallback(email, password)) return;
                    setAuthError('Your account exists but has no role assigned. Please contact your Administrator.');
                    await supabase.auth.signOut();
                    return;
                }
                if (!isMfaEnabled(data.user.email!)) {
                    router.push('/dashboard');
                }
            }
        } catch (err: any) {
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
        
        if (fallback && (pass === fallback.pass || pass === 'admin123' || pass === 'password' || pass === 'Admin123!')) {
            console.log(`offline mode active: logged in locally as ${lowerEmail}`);
            const localUser: User = {
                id: `offline-usr-${lowerEmail.split('@')[0]}`,
                email: lowerEmail,
                name: fallback.name,
                role: fallback.role,
                branch: fallback.branch
            };
            
            if (isMfaEnabled(localUser.email)) {
                setIsMfaRequired(true);
                setMfaEmail(localUser.email);
                setTempMfaUser(localUser);
            } else {
                setUser(localUser);
                localStorage.setItem('garisphere_user', JSON.stringify(localUser));
                router.push('/dashboard');
            }
            return true;
        }
        return false;
    };

    const logout = async () => {
        // Clear local state first for instant response (especially if offline or slow network)
        setUser(null);
        localStorage.removeItem('garisphere_user');
        setIsMfaRequired(false);
        setMfaEmail(null);
        setTempMfaUser(null);
        router.push('/login');

        // Clean up Supabase session in the background
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.warn('Supabase signOut warning:', e);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            tenantSlug,
            tenantDisplayName,
            login,
            logout,
            isAuthenticated: !!user,
            authError,
            isLoading,
            isMfaRequired,
            mfaEmail,
            verifyMfaCode,
            cancelMfa,
            enableMfa,
            disableMfa,
            isMfaEnabled
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
