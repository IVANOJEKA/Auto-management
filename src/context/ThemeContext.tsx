'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'dark', toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('dark');

    // On mount, read saved preference
    useEffect(() => {
        try {
            const saved = localStorage.getItem('garisphere_theme') as Theme | null;
            const resolved: Theme = saved === 'light' ? 'light' : 'dark';
            setTheme(resolved);
            document.documentElement.setAttribute('data-theme', resolved);
        } catch { /* ignore */ }
    }, []);

    const toggleTheme = () => {
        setTheme(prev => {
            const next: Theme = prev === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            try { localStorage.setItem('garisphere_theme', next); } catch { /* ignore */ }
            return next;
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
