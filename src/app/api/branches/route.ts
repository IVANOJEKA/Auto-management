import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';

const DEFAULT_BRANCHES = ['Kampala Main', 'Jinja Showroom', 'Entebbe Hub'];
const TENANT_ID = '00000000-0000-0000-0000-000000000000';

// GET /api/branches — return branch list for the current tenant
export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
        return NextResponse.json(DEFAULT_BRANCHES);
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('tenants')
            .select('branches')
            .eq('id', TENANT_ID)
            .single();

        if (error || !data?.branches || !Array.isArray(data.branches)) {
            return NextResponse.json(DEFAULT_BRANCHES);
        }

        return NextResponse.json(data.branches);
    } catch {
        return NextResponse.json(DEFAULT_BRANCHES);
    }
}

// POST /api/branches — save branch list for the current tenant
export async function POST(req: NextRequest) {
    try {
        const { branches } = await req.json();

        if (!Array.isArray(branches)) {
            return NextResponse.json({ error: 'branches must be an array' }, { status: 400 });
        }

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
            return NextResponse.json({ success: true, branches, message: 'Mock saved (no DB).' });
        }

        const { data, error } = await supabaseAdmin
            .from('tenants')
            .update({ branches })
            .eq('id', TENANT_ID)
            .select('branches')
            .single();

        if (error) {
            console.error('[branches] DB update error:', error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, branches: data?.branches ?? branches });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
