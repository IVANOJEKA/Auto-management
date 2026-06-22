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

    // On mount, set initial theme based on manual override or local time
    useEffect(() => {
        const checkTheme = () => {
            try {
                const manual = localStorage.getItem('garisphere_manual_theme');
                if (manual === 'true') {
                    const saved = localStorage.getItem('garisphere_theme') as Theme | null;
                    if (saved === 'light' || saved === 'dark') {
                        setTheme(saved);
                        document.documentElement.setAttribute('data-theme', saved);
                        return;
                    }
                }
            } catch { /* ignore */ }

            // Automatic visitor time zone switch
            const hour = new Date().getHours();
            const resolved: Theme = (hour >= 6 && hour < 19) ? 'light' : 'dark';
            setTheme(resolved);
            document.documentElement.setAttribute('data-theme', resolved);
        };

        checkTheme();

        // Periodically check every 60 seconds (in case hour rolls over while on page)
        const interval = setInterval(checkTheme, 60000);
        return () => clearInterval(interval);
    }, []);

    const toggleTheme = () => {
        setTheme(prev => {
            const next: Theme = prev === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            try {
                localStorage.setItem('garisphere_theme', next);
                localStorage.setItem('garisphere_manual_theme', 'true');
            } catch { /* ignore */ }
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
