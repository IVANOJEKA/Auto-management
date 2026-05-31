import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { CurrencyProvider } from '../context/CurrencyContext';
import { BusinessProvider } from '../context/BusinessContext';

export const metadata: Metadata = {
    title: 'GariSphere DMS | Dealership Management System',
    description: 'Premium global Dealer Management System (DMS) tailored for modern auto retail.',
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
                            <DataProvider>
                                {children}
                            </DataProvider>
                        </CurrencyProvider>
                    </BusinessProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
