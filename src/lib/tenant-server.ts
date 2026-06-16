import { NextRequest } from 'next/server';
import { supabaseAdmin } from './supabase-server';

/**
 * Returns the raw subdomain slug from the request Host header without a DB lookup.
 * Useful for seeding offline/demo data with tenant-aware defaults.
 */
export function getTenantSlug(req: NextRequest): string {
    const host = req.headers.get('host') || '';
    const hostWithoutPort = host.split(':')[0];
    const parts = hostWithoutPort.split('.');

    if (parts.length > 2) {
        const sub = parts[0].toLowerCase();
        if (sub !== 'www' && sub !== 'autosphere-dms-cyan') return sub;
    } else if (parts.length === 2 && hostWithoutPort.endsWith('localhost')) {
        const sub = parts[0].toLowerCase();
        if (sub !== 'www') return sub;
    }
    return 'garisphere';
}

// In-memory cache for subdomain -> tenant UUID mapping to reduce DB queries
const tenantCache: Record<string, string> = {};

/**
 * Resolves the tenant ID (UUID) based on the subdomain parsed from the request Host header.
 * If the subdomain is a root domain (or empty/localhost), it defaults to the 'garisphere' workspace.
 * If the subdomain does not exist in the database, it auto-creates the tenant record on the fly to support sandboxes.
 */
export async function getTenantId(req: NextRequest): Promise<string> {
    const host = req.headers.get('host') || '';
    
    // Default fallback workspace subdomain
    let subdomain = 'garisphere';
    
    // Parse subdomain: host could be "localhost:3000", "tesla.localhost:3000", "dealership1.autosphere-dms-cyan.vercel.app"
    const hostWithoutPort = host.split(':')[0];
    const parts = hostWithoutPort.split('.');
    
    if (parts.length > 2) {
        // e.g. "tenant.autosphere-dms-cyan.vercel.app" -> subdomain is "tenant"
        const sub = parts[0].toLowerCase();
        if (sub !== 'www' && sub !== 'autosphere-dms-cyan') {
            subdomain = sub;
        }
    } else if (parts.length === 2 && hostWithoutPort.endsWith('localhost')) {
        // e.g. "tenant.localhost" -> subdomain is "tenant"
        const sub = parts[0].toLowerCase();
        if (sub !== 'www') {
            subdomain = sub;
        }
    }
    
    // Check local cache
    if (tenantCache[subdomain]) {
        return tenantCache[subdomain];
    }
    
    // Lookup the subdomain in tenants table
    let { data: tenant, error } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .eq('subdomain', subdomain)
        .maybeSingle();

    if (error) {
        // If the tenants table doesn't exist yet (pre-migration), silently use the default UUID
        const isMissingTable =
            error.message?.includes('relation "tenants" does not exist') ||
            error.message?.includes('Could not find the table') ||
            error.code === '42P01';

        if (!isMissingTable) {
            console.error(`[SaaS] Tenant lookup failed for subdomain "${subdomain}":`, error.message);
        }
        // Cache the default so we don't query again this session
        tenantCache[subdomain] = '00000000-0000-0000-0000-000000000000';
        return '00000000-0000-0000-0000-000000000000';
    }

    // Dynamic provisioning: if subdomain exists in DB schema but this slug is new, auto-create it
    if (!tenant) {
        const prettyName = subdomain.charAt(0).toUpperCase() + subdomain.slice(1) + ' Dealership';

        const { data: newTenant, error: createError } = await supabaseAdmin
            .from('tenants')
            .insert([{ name: prettyName, subdomain }])
            .select('id')
            .single();

        if (createError) {
            // Fallback silently
            tenantCache[subdomain] = '00000000-0000-0000-0000-000000000000';
            return '00000000-0000-0000-0000-000000000000';
        }

        tenant = newTenant;
    }

    if (tenant) {
        tenantCache[subdomain] = tenant.id;
        return tenant.id;
    }

    // Ultimate fallback
    return '00000000-0000-0000-0000-000000000000';
}
