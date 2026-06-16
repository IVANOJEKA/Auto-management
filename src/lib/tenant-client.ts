'use client';

/**
 * Returns the tenant slug from the browser's current hostname.
 * Works identically to the server-side getTenantSlug() but reads window.location.
 * Safe to call in any 'use client' component.
 */
export function getClientTenantSlug(): string {
    if (typeof window === 'undefined') return 'garisphere';

    const host = window.location.hostname;
    const parts = host.split('.');

    if (parts.length > 2) {
        const sub = parts[0].toLowerCase();
        if (sub !== 'www' && sub !== 'autosphere-dms-cyan' && sub !== 'platform' && sub !== 'admin') return sub;
    } else if (parts.length === 2 && host.endsWith('localhost')) {
        const sub = parts[0].toLowerCase();
        if (sub !== 'www') return sub;
    }

    return 'garisphere';
}

/**
 * Returns a pretty display name derived from the tenant slug.
 * e.g. "tesla-motors" → "Tesla Motors"
 */
export function getTenantDisplayName(slug: string): string {
    return slug
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}
