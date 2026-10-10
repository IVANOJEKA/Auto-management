import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { CurrencyProvider } from '../context/CurrencyContext';
import { BusinessProvider } from '../context/BusinessContext';
import { PermissionsProvider } from '../context/PermissionsContext';
import { ThemeProvider } from '../context/ThemeContext';
import { BranchProvider } from '../context/BranchContext';
import ShiftGuard from '../components/ShiftGuard';
import PWAProvider from '../components/PWAProvider';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://garisphere.com';

export const viewport: Viewport = {
    themeColor: '#0f172a',
    width: 'device-width',
    initialScale: 1,
};

export const metadata: Metadata = {
    metadataBase: new URL(BASE_URL),
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'GariSphere',
    },
    icons: {
        icon: [
            { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { url: '/garisphere-logo.png', type: 'image/png' },
        ],
        apple: [
            { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
    },
    title: {
        default: 'GariSphere DMS | The World\'s Complete Dealer Management System',
        template: '%s | GariSphere DMS',
    },
    description: 'The complete cloud-based Dealer Management System (DMS) for auto showrooms worldwide. Automate vehicle inventory, sales CRM pipelines, finance & accounting, multi-branch coordination, and local tax compliance.',
    keywords: ['dealer management system', 'DMS software', 'car dealership software', 'auto dealer CRM', 'vehicle inventory management', 'dealership management platform', 'automotive DMS', 'car dealer finance software', 'multi-branch dealership system', 'vehicle yard management', 'dealership compliance software', 'auto import tracking software', 'GariSphere DMS'],
    authors: [{ name: 'GariSphere DMS Ltd' }],
    creator: 'GariSphere DMS Ltd',
    publisher: 'GariSphere DMS Ltd',
    robots: {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true },
    },
    openGraph: {
        type: 'website',
        locale: 'en_UG',
        url: BASE_URL,
        siteName: 'GariSphere DMS',
        title: 'GariSphere DMS | The World\'s Complete Dealer Management System',
        description: 'Run your auto dealership smarter. Centralize multi-branch stock, track global import logistics, audit deal margins, and automate tax compliance — from one powerful platform.',
        images: [
            {
                url: '/hero-car.png',
                width: 1200,
                height: 630,
                alt: 'GariSphere DMS — Auto Dealer Management Platform',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'GariSphere DMS | The World\'s Complete Dealer Management System',
        description: 'Run your auto dealership smarter — multi-branch sync, inventory tracking, and automated tax compliance in one platform.',
        images: ['/hero-car.png'],
        creator: '@garispheredms',
    },
    verification: {
        google: process.env.GOOGLE_SITE_VERIFICATION || '',
    },
    alternates: {
        canonical: BASE_URL,
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            {/* No-flash theme script — runs before React hydrates */}
            <head>
                <script dangerouslySetInnerHTML={{ __html: `
                    try {
                        var m = localStorage.getItem('garisphere_manual_theme');
                        var t = localStorage.getItem('garisphere_theme');
                        if (m === 'true') {
                            if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
                        } else {
                            var h = new Date().getHours();
                            if (h >= 6 && h < 19) document.documentElement.setAttribute('data-theme', 'light');
                        }
                    } catch(e) {}
                ` }} />
            </head>
            <body>
                <PWAProvider>
                    <ThemeProvider>
                        <AuthProvider>
                            <BranchProvider>
                                <BusinessProvider>
                                    <CurrencyProvider>
                                        <PermissionsProvider>
                                            <DataProvider>
                                                <ShiftGuard>
                                                    {children}
                                                </ShiftGuard>
                                            </DataProvider>
                                        </PermissionsProvider>
                                    </CurrencyProvider>
                                </BusinessProvider>
                            </BranchProvider>
                        </AuthProvider>
                    </ThemeProvider>
                </PWAProvider>
            </body>
        </html>
    );
}

