'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ─── Business Config ───────────────────────────────────────────────────────────

export interface BusinessConfig {
    name: string;
    tagline: string;
    address: string;
    phone: string;
    email: string;
    logoEmoji: string;
    country: string;
    tin: string;
    website: string;
    isRegistered: boolean;
}

export const DEFAULT_BUSINESS: BusinessConfig = {
    name: 'GariSphere',
    tagline: 'Dealership Management System',
    address: '',
    phone: '',
    email: '',
    logoEmoji: '🏎',
    country: 'Uganda',
    tin: '',
    website: '',
    isRegistered: false,
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
                setBusiness(prev => ({ ...prev, ...parsed }));
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
