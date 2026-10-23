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
    /** Converts a value to the active currency and returns a formatted string */
    formatCurrency: (value: string | number) => string;
    /** Formats a raw amount (already in the active currency) without conversion */
    formatRaw: (amount: number) => string;
    /** Parses an input from the current local currency and returns a raw USD number */
    parseInputToUSD: (localValue: string | number) => number;
    /** Parses an input from the current local currency and formats it as a USD string (for DB storage) */
    formatUSDToStore: (localValue: string | number) => string;
    /** Parses any money input (e.g. '$98,000', 'UGX 4,900,000', 4900000) to numeric amount in active local currency */
    parseToLocal: (value: string | number | undefined | null) => number;
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
                if (found) setTimeout(() => setCurrencyState(found), 0);
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

    /** Parse any money input (e.g. '$98,000', 'UGX 4,900,000', 4900000) into numeric amount in the active local currency */
    const parseToLocal = useCallback((value: string | number | undefined | null): number => {
        if (value === undefined || value === null || value === '') return 0;
        if (typeof value === 'number') return isNaN(value) ? 0 : value;
        const str = String(value).trim();
        if (!str) return 0;

        // If string contains '$' (explicit USD):
        if (str.includes('$')) {
            const cleaned = str.replace(/[^0-9.-]/g, '');
            const usd = parseFloat(cleaned);
            if (isNaN(usd)) return 0;
            return usd * currency.rateFromUSD;
        }

        // If string contains active currency symbol or code (e.g. 'UGX') or plain number:
        const cleaned = str.replace(/[^0-9.-]/g, '');
        if (!cleaned || cleaned === '.' || cleaned === '-') return 0;
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    }, [currency.rateFromUSD]);

    /** Strip any currency symbol/code and return the numeric value in USD */
    const parseUSD = useCallback((value: string | number | undefined | null): number => {
        if (value === undefined || value === null || value === '') return 0;
        if (typeof value === 'number') {
            if (isNaN(value)) return 0;
            return value / 3780; // Base DMS currency is UGX (3,780 UGX = 1 USD)
        }
        const str = String(value).trim();
        if (!str) return 0;
        const cleaned = str.replace(/[^0-9.-]/g, '');
        if (!cleaned || cleaned === '.' || cleaned === '-') return 0;
        const num = parseFloat(cleaned);
        if (isNaN(num)) return 0;
        if (str.includes('$')) {
            return num; // Explicit USD
        }
        // Local base amount
        return num / 3780;
    }, []);

    /** Format a raw amount (already in the active currency) without conversion */
    const formatRaw = useCallback((amount: number): string => {
        const { symbol, decimals, position } = currency;
        // Explicitly round to the target decimal places BEFORE Intl formatting
        // to eliminate floating-point drift (e.g. 49,999,987.8 → 50,000,000)
        const precise = decimals === 0
            ? Math.round(amount)
            : parseFloat(amount.toFixed(decimals));
        const formatted = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(precise);
        return position === 'prefix' ? `${symbol} ${formatted}` : `${formatted} ${symbol}`;
    }, [currency]);

    /** Convert a value (USD string, UGX number, or active local currency) → active currency formatted string */
    const formatCurrency = useCallback((value: string | number | undefined | null): string => {
        if (value === undefined || value === null || value === '') return formatRaw(0);

        // 1. Numbers:
        // In GariSphere, numbers (e.g. part costs, part prices, stock values, PO totals, invoice amounts, ledger amounts)
        // are stored in the base currency of the business (UGX).
        if (typeof value === 'number') {
            if (isNaN(value) || value === 0) return formatRaw(0);
            if (currency.code === 'UGX') {
                return formatRaw(value);
            }
            // If user switched to another currency (e.g. USD, KES):
            // Base currency is UGX (3,780 per USD). Convert UGX -> USD -> active currency:
            const ugxRate = 3780;
            const usdVal = value / ugxRate;
            const converted = usdVal * currency.rateFromUSD;
            return formatRaw(converted);
        }

        const str = String(value).trim();
        if (!str) return formatRaw(0);

        // 2. Explicit USD strings like '$98,000':
        if (str.includes('$')) {
            const cleaned = str.replace(/[^0-9.-]/g, '');
            const usdNum = parseFloat(cleaned) || 0;
            const converted = usdNum * currency.rateFromUSD;
            return formatRaw(converted);
        }

        // 3. Explicit UGX strings like 'UGX 4,900,000':
        if (str.toUpperCase().includes('UGX')) {
            const cleaned = str.replace(/[^0-9.-]/g, '');
            const ugxNum = parseFloat(cleaned) || 0;
            if (currency.code === 'UGX') {
                return formatRaw(ugxNum);
            }
            const usdVal = ugxNum / 3780;
            return formatRaw(usdVal * currency.rateFromUSD);
        }

        // 4. Other currencies (e.g. KSh, EUR, TZS):
        for (const c of CURRENCIES) {
            if (c.code !== 'USD' && c.code !== 'UGX' && (str.includes(c.symbol) || str.toUpperCase().includes(c.code))) {
                const cleaned = str.replace(/[^0-9.-]/g, '');
                const num = parseFloat(cleaned) || 0;
                if (currency.code === c.code) return formatRaw(num);
                const usdVal = num / c.rateFromUSD;
                return formatRaw(usdVal * currency.rateFromUSD);
            }
        }

        // 5. Plain numeric string without symbols (e.g. "4900000" or "25000"):
        const cleaned = str.replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned) || 0;
        if (currency.code === 'UGX') {
            return formatRaw(num);
        }
        const usdVal = num / 3780;
        return formatRaw(usdVal * currency.rateFromUSD);
    }, [currency, formatRaw]);

    const parseInputToUSD = useCallback((localValue: string | number): number => {
        if (typeof localValue === 'number') return localValue / currency.rateFromUSD;
        const cleaned = localValue.replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned);
        if (isNaN(num)) return 0;
        return num / currency.rateFromUSD;
    }, [currency]);

    const formatUSDToStore = useCallback((localValue: string | number): string => {
        const usdNum = parseInputToUSD(localValue);
        // Store with up to 8 decimal places so round-trip conversions
        // (e.g. UGX 50,000,000 → USD → back to UGX) stay exact
        return `$${usdNum.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 })}`;
    }, [parseInputToUSD]);

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, parseUSD, formatCurrency, formatRaw, parseInputToUSD, formatUSDToStore, parseToLocal }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    const ctx = useContext(CurrencyContext);
    if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
    return ctx;
}
