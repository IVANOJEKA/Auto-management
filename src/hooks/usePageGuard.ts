'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';

/**
 * Guards a page against unauthorized access.
 * - Redirects to /login if the user is not authenticated.
 * - Redirects to /dashboard if the user's role doesn't have access to the module.
 * - Redirects to /dashboard if the module is disabled at the tenant level.
 *
 * @param moduleKey - The module key as defined in PermissionsContext ALL_MODULES
 */
export function usePageGuard(moduleKey: string) {
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const { hasAccess } = usePermissions();
    const [tenantAllowed, setTenantAllowed] = useState<boolean | null>(null);

    useEffect(() => {
        // Not logged in → go to login
        if (!isAuthenticated || !user) {
            router.replace('/login');
            return;
        }

        // Logged in but no role-based access → redirect to dashboard
        if (!hasAccess(user.role, moduleKey)) {
            router.replace('/dashboard');
            return;
        }

        // Dashboard and settings are always allowed at tenant level
        if (moduleKey === 'dashboard' || moduleKey === 'settings') {
            setTenantAllowed(true);
            return;
        }

        // Try load from local cache first for instant resolution
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('garisphere_tenant_modules');
            if (cached) {
                try {
                    const modules = JSON.parse(cached) as string[];
                    const allowed = modules.includes(moduleKey);
                    setTenantAllowed(allowed);
                    if (!allowed) {
                        router.replace('/dashboard');
                        return;
                    }
                } catch {}
            }
        }

        // Fetch API to verify / synchronize
        async function fetchTenantConfig() {
            try {
                const res = await fetch('/api/tenants');
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.modules) {
                        if (typeof window !== 'undefined') {
                            localStorage.setItem('garisphere_tenant_modules', JSON.stringify(data.modules));
                        }
                        const allowed = data.modules.includes(moduleKey);
                        setTenantAllowed(allowed);
                        if (!allowed) {
                            router.replace('/dashboard');
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to fetch tenant configuration in guard', err);
            }
        }

        fetchTenantConfig();
    }, [isAuthenticated, user, moduleKey, hasAccess, router]);

    const isAllowed =
        isAuthenticated &&
        !!user &&
        hasAccess(user.role, moduleKey) &&
        (tenantAllowed !== false);

    return { isAllowed, user };
}
