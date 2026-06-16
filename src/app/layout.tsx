import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { CurrencyProvider } from '../context/CurrencyContext';
import { BusinessProvider } from '../context/BusinessContext';
import { PermissionsProvider } from '../context/PermissionsContext';
import ShiftGuard from '../components/ShiftGuard';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://garisphere.com';

export const metadata: Metadata = {
    metadataBase: new URL(BASE_URL),
    title: {
        default: 'GariSphere DMS | East Africa\'s Premium Dealer Management System',
        template: '%s | GariSphere DMS',
    },
    description: 'The complete Dealer Management System (DMS) for East African auto showrooms. Automate vehicle inventory tracking, sales CRM pipelines, finance, workshop orders, and URA EFRIS compliance.',
    keywords: ['DMS Uganda', 'Dealer Management System Kampala', 'auto dealer software East Africa', 'car dealer inventory tracking', 'URA EFRIS auto dealer', 'Kampala car showroom app', 'Jinja auto importer software', 'GariSphere DMS'],
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
        title: 'GariSphere DMS | East Africa\'s Premium Dealer Management System',
        description: 'Run your auto dealership smarter. Centralize multi-branch stock, track logistics import routes, audit deal margins, and automate URA EFRIS compliance.',
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
        title: 'GariSphere DMS | East Africa\'s Premium Dealer Management System',
        description: 'Run your auto dealership smarter with multi-branch synchronization and URA EFRIS invoicing.',
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
            <body>
                <AuthProvider>
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
                </AuthProvider>
            </body>
        </html>
    );
}

