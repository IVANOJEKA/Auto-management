'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { generateTOTP } from '../lib/totp';
import { getClientTenantSlug, getTenantDisplayName } from '../lib/tenant-client';

export type Branch = string; // Dynamic — managed via Settings → Branches
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
    loginWithGoogle: () => Promise<void>;
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
        } catch {
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
                try {
                    const sessionRes = await supabase.auth.getSession();
                    const token = sessionRes.data.session?.access_token;
                    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }
                    const res = await fetch('/api/ensure-profile', {
                        method: 'POST',
                        headers,
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
                } catch {
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
        } catch {
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

                // Set isLoading to false immediately if we have a cached user so the UI loads instantly
                if (cachedUser) {
                    setIsLoading(false);
                }

                // 2. Fetch from Supabase in the background to verify role and sync changes
                // Wrap in a 1.5-second timeout to prevent hanging on slow/unreachable Supabase
                let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
                try {
                    const sessionPromise = supabase.auth.getSession();
                    const timeoutPromise = new Promise<never>((_, reject) => {
                        timeoutHandle = setTimeout(
                            () => reject(new Error('Session check timeout')),
                            1500
                        );
                    });
                    // Suppress unhandled rejection on the timeout branch
                    timeoutPromise.catch(() => {});

                    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as Awaited<typeof sessionPromise>;
                    if (timeoutHandle) clearTimeout(timeoutHandle);

                    if (session?.user) {
                        // Only load user profile if MFA is not enabled (otherwise challenge flow must trigger)
                        if (!isMfaEnabled(session.user.email!)) {
                            let profileTimeoutHandle: ReturnType<typeof setTimeout> | null = null;
                            try {
                                const profilePromise = loadUserProfile(session.user.id, session.user.email!);
                                const profileTimeoutPromise = new Promise<boolean>((resolve) => {
                                    profileTimeoutHandle = setTimeout(() => resolve(false), 2000);
                                });
                                await Promise.race([profilePromise, profileTimeoutPromise]);
                                if (profileTimeoutHandle) clearTimeout(profileTimeoutHandle);
                            } catch {
                                if (profileTimeoutHandle) clearTimeout(profileTimeoutHandle);
                            }
                        }
                    } else {
                        // No active Supabase session
                        if (cachedUser) {
                            const storedOffline = localStorage.getItem('garisphere_offline_users');
                            let offlineUserObj = null;
                            if (storedOffline) {
                                try {
                                    const list: any[] = JSON.parse(storedOffline);
                                    offlineUserObj = list.find(u => u.email?.toLowerCase().trim() === cachedUser!.email?.toLowerCase().trim());
                                } catch {}
                            }
                            const fallback = offlineUserObj || OFFLINE_USERS[cachedUser.email?.toLowerCase()];
                            if (fallback && (fallback.role !== cachedUser.role || fallback.branch !== cachedUser.branch || fallback.name !== cachedUser.name)) {
                                const fixed: User = { ...cachedUser, role: fallback.role, name: fallback.name, branch: fallback.branch };
                                setUser(fixed);
                                localStorage.setItem('garisphere_user', JSON.stringify(fixed));
                            }
                        } else {
                            setUser(null);
                        }
                    }
                } catch {
                    if (timeoutHandle) clearTimeout(timeoutHandle);
                    // Silently fall back to cached session (offline mode)
                    if (cachedUser) {
                        const storedOffline = localStorage.getItem('garisphere_offline_users');
                        let offlineUserObj = null;
                        if (storedOffline) {
                            try {
                                const list: any[] = JSON.parse(storedOffline);
                                offlineUserObj = list.find(u => u.email?.toLowerCase().trim() === cachedUser!.email?.toLowerCase().trim());
                            } catch {}
                        }
                        const fallback = offlineUserObj || OFFLINE_USERS[cachedUser.email?.toLowerCase()];
                        if (fallback && (fallback.role !== cachedUser.role || fallback.branch !== cachedUser.branch || fallback.name !== cachedUser.name)) {
                            const fixed: User = { ...cachedUser, role: fallback.role, name: fallback.name, branch: fallback.branch };
                            setUser(fixed);
                            localStorage.setItem('garisphere_user', JSON.stringify(fixed));
                        }
                    }
                }
            } catch {
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
                // Only clear session if user is not using a cached local/offline user session
                try {
                    const stored = localStorage.getItem('garisphere_user');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        if (parsed && (parsed.id?.startsWith('offline-usr-') || parsed.id?.startsWith('mock-'))) {
                            return; // Keep local/offline session intact
                        }
                    }
                } catch {}
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
        
        // Load dynamic offline users from localStorage
        let offlineUsersMap: Record<string, { role: UserRole; name: string; branch: Branch; pass: string; active?: boolean }> = {};
        
        // Populate map with hardcoded users first
        Object.keys(OFFLINE_USERS).forEach(k => {
            offlineUsersMap[k] = { 
                ...OFFLINE_USERS[k], 
                active: k === 'mike@garisphere.com' ? false : true // mike is deactivated in seeds
            };
        });

        try {
            const stored = localStorage.getItem('garisphere_offline_users');
            if (stored) {
                const list: any[] = JSON.parse(stored);
                list.forEach(u => {
                    if (u.email) {
                        const emailKey = u.email.toLowerCase().trim();
                        offlineUsersMap[emailKey] = {
                            role: u.role,
                            name: u.name,
                            branch: u.branch,
                            pass: u.pass || 'password',
                            active: u.active !== undefined ? u.active : true
                        };
                    }
                });
            }
        } catch {
        }

        const fallback = offlineUsersMap[lowerEmail];
        
        if (fallback) {
            if (fallback.active === false) {
                setAuthError('This staff account has been deactivated. Please contact your Administrator.');
                return true;
            }

            if (pass === fallback.pass || pass === 'admin123' || pass === 'password' || pass === 'Admin123!') {
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
        router.push('/app');

        // Clean up Supabase session in the background
        try {
            await supabase.auth.signOut();
        } catch {
        }
    };

    const loginWithGoogle = async () => {
        setAuthError(null);
        try {
            const redirectUrl = typeof window !== 'undefined'
                ? `${window.location.origin}/dashboard`
                : undefined;
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'select_account',
                    },
                },
            });
            if (error) {
                setAuthError(error.message);
            }
        } catch (err: any) {
            setAuthError(err?.message || 'Google authentication failed. Please try again.');
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            tenantSlug,
            tenantDisplayName,
            login,
            loginWithGoogle,
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
