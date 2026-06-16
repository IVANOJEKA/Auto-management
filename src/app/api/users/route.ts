import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';
import { getTenantId, getTenantSlug } from '../../../lib/tenant-server';

// GET /api/users — list all user profiles scoped to the current tenant
export async function GET(req: NextRequest) {
    let tenantId: string;
    let tenantSlug: string;

    try {
        tenantId = await getTenantId(req);
        tenantSlug = getTenantSlug(req);
    } catch {
        // Fallback: if no supabase, return demo data
        return NextResponse.json([
            { id: 'demo-1', name: 'Admin User', email: 'admin@garisphere.com', role: 'Admin', branch: 'Kampala Main', active: true },
            { id: 'demo-2', name: 'Alex T.', email: 'alex@garisphere.com', role: 'Sales', branch: 'Kampala Main', active: true },
            { id: 'demo-3', name: 'Sarah M.', email: 'sarah@garisphere.com', role: 'Sales', branch: 'Jinja Showroom', active: true },
            { id: 'demo-4', name: 'James O.', email: 'james@garisphere.com', role: 'Finance', branch: 'Kampala Main', active: true },
            { id: 'demo-5', name: 'Mike R.', email: 'mike@garisphere.com', role: 'Service', branch: 'Entebbe Hub', active: false },
        ]);
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
        return NextResponse.json([
            { id: 'demo-1', name: 'Admin User', email: `admin@${tenantSlug}.com`, role: 'Admin', branch: 'Kampala Main', active: true },
            { id: 'demo-2', name: 'Alex T.', email: `alex@${tenantSlug}.com`, role: 'Sales', branch: 'Kampala Main', active: true },
            { id: 'demo-3', name: 'Sarah M.', email: `sarah@${tenantSlug}.com`, role: 'Sales', branch: 'Jinja Showroom', active: true },
            { id: 'demo-4', name: 'James O.', email: `james@${tenantSlug}.com`, role: 'Finance', branch: 'Kampala Main', active: true },
            { id: 'demo-5', name: 'Mike R.', email: `mike@${tenantSlug}.com`, role: 'Service', branch: 'Entebbe Hub', active: false },
        ]);
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('name');
        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PATCH /api/users — update role/branch/name scoped to tenant
export async function PATCH(req: NextRequest) {
    let tenantId: string;

    try {
        tenantId = await getTenantId(req);
    } catch {
        return NextResponse.json({ error: 'Service client not configured' }, { status: 503 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
        return NextResponse.json({ error: 'Service client not configured' }, { status: 503 });
    }

    try {
        const body = await req.json();
        const { id, ...updates } = body;
        if (!id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });

        const { data, error } = await supabaseAdmin
            .from('user_profiles')
            .update(updates)
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select()
            .single();
        if (error) throw error;
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
