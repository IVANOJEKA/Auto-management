import type { Metadata } from 'next';
import '../../app/globals.css';

export const metadata: Metadata = {
    title: 'GariSphere Platform | Admin Console',
    description: 'GariSphere SaaS Platform Administration Console — manage tenants, analytics, and workspace provisioning.',
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-dark, #060b19)',
            color: 'var(--text-main, #f8fafc)',
            fontFamily: "'Inter', 'Outfit', system-ui, sans-serif",
            transition: 'background-color 0.3s ease, color 0.3s ease',
        }}>
            {children}
        </div>
    );
}
