'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ─── Business Config ───────────────────────────────────────────────────────────

export interface FiPackage {
    id: string;
    name: string;
    price: number;
}

export interface BusinessConfig {
    name: string;
    tagline: string;
    address: string;
    phone: string;
    email: string;
    logoEmoji: string;
    logoImage?: string;
    country: string;
    tin: string;
    website: string;
    isRegistered: boolean;
    uraEnabled?: boolean;
    efrisDeviceNumber?: string;
    efrisAppKey?: string;
    uraSandboxMode?: boolean;
    fiPackages?: FiPackage[];
}

export const DEFAULT_FI_PACKAGES: FiPackage[] = [
    { id: 'warranty', name: 'Extended Warranty (3yr)', price: 2500 },
    { id: 'gap', name: 'GAP Insurance', price: 850 },
    { id: 'ceramic', name: 'Ceramic Coating', price: 1200 },
    { id: 'wheels', name: 'Wheel & Tire Protection', price: 699 },
];

export const DEFAULT_BUSINESS: BusinessConfig = {
    name: 'GariSphere',
    tagline: 'Dealership Management System',
    address: '',
    phone: '',
    email: '',
    logoEmoji: '🏎',
    logoImage: '',
    country: 'Uganda',
    tin: '',
    website: '',
    isRegistered: false,
    uraEnabled: false,
    efrisDeviceNumber: '',
    efrisAppKey: '',
    uraSandboxMode: true,
    fiPackages: DEFAULT_FI_PACKAGES,
};

const STORAGE_KEY = 'dms_business_config';

// ─── Context ──────────────────────────────────────────────────────────────────

interface BusinessContextType {
    business: BusinessConfig;
    updateBusiness: (patch: Partial<BusinessConfig>) => void;
    resetBusiness: () => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BusinessProvider({ children }: { children: React.ReactNode }) {
    const [business, setBusiness] = useState<BusinessConfig>(DEFAULT_BUSINESS);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as Partial<BusinessConfig>;
                setTimeout(() => setBusiness(prev => ({ ...prev, ...parsed })), 0);
            }
        } catch { /* ignore */ }
    }, []);

    const updateBusiness = useCallback((patch: Partial<BusinessConfig>) => {
        setBusiness(prev => {
            const next = { ...prev, ...patch };
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
            return next;
        });
    }, []);

    const resetBusiness = useCallback(() => {
        setBusiness(DEFAULT_BUSINESS);
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    }, []);

    return (
        <BusinessContext.Provider value={{ business, updateBusiness, resetBusiness }}>
            {children}
        </BusinessContext.Provider>
    );
}

export function useBusiness() {
    const ctx = useContext(BusinessContext);
    if (!ctx) throw new Error('useBusiness must be used within a BusinessProvider');
    return ctx;
}
