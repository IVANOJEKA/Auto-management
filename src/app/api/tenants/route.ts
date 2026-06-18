import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';
import { getTenantSlug } from '../../../lib/tenant-server';
import { cookies } from 'next/headers';

// GET /api/tenants — returns info about the current tenant workspace
export async function GET(req: NextRequest) {
    const slug = getTenantSlug(req);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
        return NextResponse.json({
            id: '00000000-0000-0000-0000-000000000000',
            name: 'GariSphere Demo',
            subdomain: slug,
            plan: 'free',
            status: 'active',
            isDefault: slug === 'garisphere'
        });
    }

    try {
        const { data: tenant, error } = await supabaseAdmin
            .from('tenants')
            .select('*')
            .eq('subdomain', slug)
            .maybeSingle();

        if (error) throw error;

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found', subdomain: slug }, { status: 404 });
        }

        return NextResponse.json({
            ...tenant,
            isDefault: slug === 'garisphere'
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

async function checkPlatformAuth(): Promise<boolean> {
    const cookieStore = await cookies();
    return cookieStore.get('platform_admin_session')?.value === 'authenticated';
}

// POST /api/tenants — provision a new tenant workspace
export async function POST(req: NextRequest) {
    if (!await checkPlatformAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
        return NextResponse.json({ error: 'Service client not configured' }, { status: 503 });
    }

    try {
        const body = await req.json();
        const { name, subdomain, plan, status, owner_email } = body;

        if (!name || !subdomain) {
            return NextResponse.json({ error: 'name and subdomain are required' }, { status: 400 });
        }

        // Validate subdomain format
        const slugRegex = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;
        if (!slugRegex.test(subdomain)) {
            return NextResponse.json({
                error: 'Subdomain must be 3-32 lowercase alphanumeric characters or hyphens, and must not start/end with a hyphen.'
            }, { status: 400 });
        }

        // Reserved subdomains
        const RESERVED = ['www', 'api', 'app', 'admin', 'mail', 'smtp', 'ftp', 'static', 'cdn', 'autosphere-dms-cyan', 'garisphere'];
        if (RESERVED.includes(subdomain)) {
            return NextResponse.json({ error: `Subdomain "${subdomain}" is reserved.` }, { status: 409 });
        }

        // Check if already taken
        const { data: existing } = await supabaseAdmin
            .from('tenants')
            .select('id')
            .eq('subdomain', subdomain)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: `Subdomain "${subdomain}" is already taken.` }, { status: 409 });
        }

        const insertPayload: any = { name, subdomain };
        if (plan) insertPayload.plan = plan;
        if (status) insertPayload.status = status;
        if (owner_email) insertPayload.owner_email = owner_email;

        const { data: newTenant, error: createError } = await supabaseAdmin
            .from('tenants')
            .insert([insertPayload])
            .select()
            .single();

        if (createError) throw createError;

        return NextResponse.json(newTenant, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
