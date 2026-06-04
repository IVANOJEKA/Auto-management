import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { CurrencyProvider } from '../context/CurrencyContext';
import { BusinessProvider } from '../context/BusinessContext';
import { PermissionsProvider } from '../context/PermissionsContext';
import ShiftGuard from '../components/ShiftGuard';

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

