'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'Admin' | 'Sales' | 'Finance' | 'Logistics' | 'Service';

export interface ModuleDef {
    key: string;
    label: string;
    icon: string;
    path: string;
    description: string;
    adminOnly?: boolean; // Cannot be removed from Admin role
}

export const ALL_MODULES: ModuleDef[] = [
    { key: 'dashboard', label: 'Dashboard', icon: '', path: '/dashboard', description: 'Main overview & KPIs' },
    { key: 'inventory', label: 'Inventory (VIN)', icon: '', path: '/inventory', description: 'Vehicle stock management' },
    { key: 'logistics', label: 'Order & Logistics', icon: '', path: '/logistics', description: 'Shipments & order tracking' },
    { key: 'crm', label: 'CRM & Leads', icon: '', path: '/crm', description: 'Customer relationships & leads' },
    { key: 'sales', label: 'Sales Desk', icon: '', path: '/sales', description: 'Deals pipeline & closings' },
    { key: 'appointments', label: 'Appointments', icon: '', path: '/appointments', description: 'Scheduling & calendar' },
    { key: 'quotes', label: 'Quotations', icon: '', path: '/quotes', description: 'Price quotes & proposals' },
    { key: 'suppliers', label: 'Supplier Directory', icon: '', path: '/suppliers', description: 'Vendor & supplier records' },
    { key: 'compliance', label: 'Compliance Docs', icon: '', path: '/compliance', description: 'Tax, plates & legal docs' },
    { key: 'service', label: 'Service & e-RO', icon: '', path: '/service', description: 'Workshop repair orders' },
    { key: 'parts', label: 'Parts & POs', icon: '', path: '/parts', description: 'Parts inventory & Purchase Orders' },
    { key: 'notifications', label: 'Notifications & Feed', icon: '', path: '/notifications', description: 'Alerts & activity feed' },
    { key: 'finance', label: 'Finance & Accounts', icon: '', path: '/finance', description: 'Invoices, ledger & accounting' },
    { key: 'reports', label: 'Reports & Analytics', icon: '', path: '/reports', description: 'Analytics & shift reports' },
    { key: 'settings', label: 'Settings', icon: '', path: '/settings', description: 'System configuration', adminOnly: true },
];

export type RolePermissions = Record<UserRole, string[]>;

const DEFAULT_PERMISSIONS: RolePermissions = {
    Admin: ALL_MODULES.map(m => m.key),
    Finance: ['dashboard', 'inventory', 'crm', 'sales', 'finance', 'reports', 'compliance', 'notifications', 'quotes', 'parts'],
    Sales: ['dashboard', 'inventory', 'crm', 'sales', 'appointments', 'quotes', 'notifications'],
    Logistics: ['dashboard', 'inventory', 'logistics', 'suppliers', 'compliance', 'notifications'],
    Service: ['dashboard', 'service', 'appointments', 'inventory', 'notifications', 'parts'],
};

const STORAGE_KEY = 'garisphere_role_permissions';

interface PermissionsContextType {
    permissions: RolePermissions;
    hasAccess: (role: UserRole, moduleKey: string) => boolean;
    getAccessibleModules: (role: UserRole) => ModuleDef[];
    updateRolePermissions: (role: UserRole, moduleKeys: string[]) => void;
    toggleModuleForRole: (role: UserRole, moduleKey: string) => void;
    resetToDefaults: () => void;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
    const [permissions, setPermissions] = useState<RolePermissions>(DEFAULT_PERMISSIONS);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as RolePermissions;
                // Merge with defaults to ensure any new modules added in code updates are included for Admin
                const merged = { ...DEFAULT_PERMISSIONS };
                for (const role of Object.keys(parsed) as UserRole[]) {
                    if (merged[role]) {
                        merged[role] = parsed[role];
                    }
                }
                // Admin always has all admin-only modules
                ALL_MODULES.filter(m => m.adminOnly).forEach(m => {
                    if (!merged.Admin.includes(m.key)) merged.Admin.push(m.key);
                });
                setTimeout(() => setPermissions(merged), 0);
            }
        } catch {
            // Use defaults
        }
    }, []);

    const save = (p: RolePermissions) => {
        setPermissions(p);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    };

    const hasAccess = (role: UserRole, moduleKey: string): boolean => {
        // Admin always has access to everything
        if (role === 'Admin') return true;
        return permissions[role]?.includes(moduleKey) ?? false;
    };

    const getAccessibleModules = (role: UserRole): ModuleDef[] => {
        if (role === 'Admin') return ALL_MODULES;
        const keys = permissions[role] || [];
        return ALL_MODULES.filter(m => keys.includes(m.key));
    };

    const updateRolePermissions = (role: UserRole, moduleKeys: string[]) => {
        const updated = { ...permissions, [role]: moduleKeys };
        save(updated);
    };

    const toggleModuleForRole = (role: UserRole, moduleKey: string) => {
        // Can't modify Admin's settings access
        if (role === 'Admin') return;
        const mod = ALL_MODULES.find(m => m.key === moduleKey);
        if (mod?.adminOnly) return;

        const current = [...(permissions[role] || [])];
        const idx = current.indexOf(moduleKey);
        if (idx >= 0) {
            current.splice(idx, 1);
        } else {
            current.push(moduleKey);
        }
        const updated = { ...permissions, [role]: current };
        save(updated);
    };

    const resetToDefaults = () => {
        save({ ...DEFAULT_PERMISSIONS });
    };

    return (
        <PermissionsContext.Provider value={{
            permissions,
            hasAccess,
            getAccessibleModules,
            updateRolePermissions,
            toggleModuleForRole,
            resetToDefaults,
        }}>
            {children}
        </PermissionsContext.Provider>
    );
}

export function usePermissions() {
    const context = useContext(PermissionsContext);
    if (context === undefined) {
        throw new Error('usePermissions must be used within a PermissionsProvider');
    }
    return context;
}
