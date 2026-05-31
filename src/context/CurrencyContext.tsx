'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ─── Supported Currencies ─────────────────────────────────────────────────────

export interface CurrencyConfig {
    code: string;
    name: string;
    symbol: string;
    flag: string;
    /** Rate vs USD (1 USD = X units of this currency) */
    rateFromUSD: number;
    decimals: number;
    position: 'prefix' | 'suffix';
}

export const CURRENCIES: CurrencyConfig[] = [
    { code: 'UGX', name: 'Ugandan Shilling',  symbol: 'UGX',  flag: '🇺🇬', rateFromUSD: 3780,    decimals: 0, position: 'prefix' },
    { code: 'USD', name: 'US Dollar',          symbol: '$',    flag: '🇺🇸', rateFromUSD: 1,       decimals: 2, position: 'prefix' },
    { code: 'KES', name: 'Kenyan Shilling',    symbol: 'KSh',  flag: '🇰🇪', rateFromUSD: 129,     decimals: 0, position: 'prefix' },
    { code: 'EUR', name: 'Euro',               symbol: '€',    flag: '🇪🇺', rateFromUSD: 0.92,    decimals: 2, position: 'prefix' },
    { code: 'GBP', name: 'British Pound',      symbol: '£',    flag: '🇬🇧', rateFromUSD: 0.79,    decimals: 2, position: 'prefix' },
    { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TZS',  flag: '🇹🇿', rateFromUSD: 2680,    decimals: 0, position: 'prefix' },
    { code: 'RWF', name: 'Rwandan Franc',      symbol: 'RF',   flag: '🇷🇼', rateFromUSD: 1320,    decimals: 0, position: 'prefix' },
    { code: 'JPY', name: 'Japanese Yen',       symbol: '¥',    flag: '🇯🇵', rateFromUSD: 157,     decimals: 0, position: 'prefix' },
];

// ─── Context ──────────────────────────────────────────────────────────────────

interface CurrencyContextType {
    currency: CurrencyConfig;
    setCurrency: (code: string) => void;
    /** Parses a money string like "$98,000" or "UGX 370,000,000" → raw USD number */
    parseUSD: (value: string | number) => number;
    /** Converts a USD amount and returns a formatted string in the active currency */
    formatCurrency: (usdValue: string | number) => string;
    /** Formats a raw amount (already in the active currency) without conversion */
    formatRaw: (amount: number) => string;
    /** Parses an input from the current local currency and returns a raw USD number */
    parseInputToUSD: (localValue: string | number) => number;
    /** Parses an input from the current local currency and formats it as a USD string (for DB storage) */
    formatUSDToStore: (localValue: string | number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    const [currency, setCurrencyState] = useState<CurrencyConfig>(CURRENCIES[0]); // UGX default

    useEffect(() => {
        try {
            const stored = localStorage.getItem('dms_currency');
            if (stored) {
                const found = CURRENCIES.find(c => c.code === stored);
                if (found) setCurrencyState(found);
            }
        } catch { /* ignore */ }
    }, []);

    const setCurrency = useCallback((code: string) => {
        const found = CURRENCIES.find(c => c.code === code);
        if (found) {
            setCurrencyState(found);
            try { localStorage.setItem('dms_currency', code); } catch { /* ignore */ }
        }
    }, []);

    /** Strip any currency symbol/code and commas, return the numeric value in USD */
    const parseUSD = useCallback((value: string | number): number => {
        if (typeof value === 'number') return value;
        // Remove all non-numeric except dot and minus
        const cleaned = value.replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned);
        if (isNaN(num)) return 0;
        // If stored value is already USD (our DB stores in USD), return as-is
        // If stored in current currency, convert back — but since all stored values are USD strings, return directly
        return num;
    }, []);

    /** Format a number in the active currency */
    const formatRaw = useCallback((amount: number): string => {
        const { symbol, decimals, position } = currency;
        const formatted = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(amount);
        return position === 'prefix' ? `${symbol} ${formatted}` : `${formatted} ${symbol}`;
    }, [currency]);

    /** Convert a USD amount string/number → active currency formatted string */
    const formatCurrency = useCallback((usdValue: string | number): string => {
        const usd = parseUSD(usdValue);
        const converted = usd * currency.rateFromUSD;
        return formatRaw(converted);
    }, [currency, parseUSD, formatRaw]);

    const parseInputToUSD = useCallback((localValue: string | number): number => {
        if (typeof localValue === 'number') return localValue / currency.rateFromUSD;
        const cleaned = localValue.replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned);
        if (isNaN(num)) return 0;
        return num / currency.rateFromUSD;
    }, [currency]);

    const formatUSDToStore = useCallback((localValue: string | number): string => {
        const usdNum = parseInputToUSD(localValue);
        return `$${usdNum.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }, [parseInputToUSD]);

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, parseUSD, formatCurrency, formatRaw, parseInputToUSD, formatUSDToStore }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    const ctx = useContext(CurrencyContext);
    if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
    return ctx;
}
