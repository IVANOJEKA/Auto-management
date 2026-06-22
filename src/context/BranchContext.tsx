'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DEFAULT_BRANCHES = ['Kampala Main', 'Jinja Showroom', 'Entebbe Hub'];
const LS_KEY = 'dms_branches';

interface BranchContextType {
    branches: string[];
    loadingBranches: boolean;
    addBranch: (name: string) => Promise<void>;
    removeBranch: (name: string) => Promise<void>;
    renameBranch: (oldName: string, newName: string) => Promise<void>;
    refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
    const [branches, setBranches] = useState<string[]>(DEFAULT_BRANCHES);
    const [loadingBranches, setLoadingBranches] = useState(true);

    const refreshBranches = useCallback(async () => {
        setLoadingBranches(true);
        try {
            const res = await fetch('/api/branches');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setBranches(data);
                    try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
                    return;
                }
            }
        } catch {}

        // Fall back to localStorage
        try {
            const stored = localStorage.getItem(LS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    setBranches(parsed);
                    return;
                }
            }
        } catch {}

        // Fall back to defaults
        setBranches(DEFAULT_BRANCHES);
        setLoadingBranches(false);
    }, []);

    useEffect(() => {
        refreshBranches().finally(() => setLoadingBranches(false));
    }, [refreshBranches]);

    const saveBranches = async (updated: string[]) => {
        setBranches(updated);
        try { localStorage.setItem(LS_KEY, JSON.stringify(updated)); } catch {}
        try {
            await fetch('/api/branches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ branches: updated })
            });
        } catch {}
    };

    const addBranch = async (name: string) => {
        const trimmed = name.trim();
        if (!trimmed || branches.includes(trimmed)) return;
        await saveBranches([...branches, trimmed]);
    };

    const removeBranch = async (name: string) => {
        await saveBranches(branches.filter(b => b !== name));
    };

    const renameBranch = async (oldName: string, newName: string) => {
        const trimmed = newName.trim();
        if (!trimmed || branches.includes(trimmed)) return;
        await saveBranches(branches.map(b => (b === oldName ? trimmed : b)));
    };

    return (
        <BranchContext.Provider value={{ branches, loadingBranches, addBranch, removeBranch, renameBranch, refreshBranches }}>
            {children}
        </BranchContext.Provider>
    );
}

export function useBranches() {
    const ctx = useContext(BranchContext);
    if (!ctx) throw new Error('useBranches must be used inside BranchProvider');
    return ctx;
}
