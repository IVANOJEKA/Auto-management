import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy (formerly Middleware): Tenant Subdomain Guard
 *
 * When a request arrives on a TENANT subdomain (e.g. joanrides.garisphere.com),
 * the root path "/" is instantly redirected to "/login" so staff only ever
 * see the DMS login screen – never the marketing landing page.
 *
 * Root domain (garisphere.com / www.garisphere.com) and the platform admin
 * subdomain are left untouched.
 *
 * NOTE: Next.js 16+ uses "proxy.ts" instead of "middleware.ts".
 */

// Subdomains that are NOT tenants – let these pass through normally
const RESERVED_SUBDOMAINS = new Set([
    'www',
    'platform',
    'admin',
    'api',
    'mail',
    'smtp',
    'cdn',
    'static',
]);

function isTenantSubdomain(hostname: string): boolean {
    // Strip port if present (useful in local dev)
    const host = hostname.split(':')[0];
    const parts = host.split('.');

    // Must have at least 3 parts: sub.domain.tld
    if (parts.length < 3) return false;

    // Check for localhost-style subdomains (e.g. joanrides.localhost)
    if (host.endsWith('.localhost') && parts.length === 2) {
        const sub = parts[0].toLowerCase();
        return sub !== 'www' && !RESERVED_SUBDOMAINS.has(sub);
    }

    const sub = parts[0].toLowerCase();

    // Skip reserved subdomains
    if (RESERVED_SUBDOMAINS.has(sub)) return false;

    // Skip the old Vercel preview domain prefix
    if (sub === 'autosphere-dms-cyan') return false;

    return true;
}

export function proxy(request: NextRequest) {
    const { pathname, origin } = request.nextUrl;
    const hostname = request.headers.get('host') || '';

    if (!isTenantSubdomain(hostname)) {
        // Root domain or reserved subdomain — let Next.js handle it normally
        return NextResponse.next();
    }

    // --- TENANT SUBDOMAIN ---
    // Redirect bare root "/" to "/login"
    if (pathname === '/') {
        const loginUrl = new URL('/login', origin);
        return NextResponse.redirect(loginUrl, { status: 301 });
    }

    // All other paths (/login, /dashboard, /api/…) pass through normally.
    return NextResponse.next();
}

export const config = {
    /*
     * Match every route EXCEPT:
     *  - Next.js internals (_next/static, _next/image)
     *  - favicon.ico and public static files
     */
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|css|js)$).*)',
    ],
};
