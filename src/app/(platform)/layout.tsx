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
            background: 'linear-gradient(135deg, #060614 0%, #0d0d2b 50%, #080820 100%)',
            color: 'white',
            fontFamily: "'Inter', 'Outfit', system-ui, sans-serif",
        }}>
            {children}
        </div>
    );
}
