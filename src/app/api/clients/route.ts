import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';
import { getTenantId } from '../../../lib/tenant-server';

export async function GET(req: NextRequest) {
    try {
        const tenantId = await getTenantId(req);
        const { data, error } = await supabaseAdmin
            .from('clients')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const tenantId = await getTenantId(req);
        const body = await req.json();
        const { data, error } = await supabaseAdmin
            .from('clients')
            .insert([{
                tenant_id: tenantId,
                name: body.name,
                email: body.email,
                phone: body.phone,
                purchases: body.purchases || 0,
                tv: body.tv || '$0',
                kyc: body.kyc || 'Pending',
                kyc_notes: body.kycNotes,
                branch: body.branch,
            }])
            .select()
            .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
