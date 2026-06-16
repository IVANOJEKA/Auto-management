import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';
import { getTenantId } from '../../../lib/tenant-server';

export async function GET(req: NextRequest) {
    try {
        const tenantId = await getTenantId(req);
        const { data, error } = await supabaseAdmin
            .from('compliance_records')
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
            .from('compliance_records')
            .insert([{
                tenant_id: tenantId,
                id: body.id || undefined,
                vehicle: body.vehicle,
                vin: body.vin,
                client: body.client,
                taxes: body.taxes || 'Pending Assessment',
                logbook: body.logbook || 'Not Started',
                plates: body.plates || 'Pending Allocation',
                esign: body.esign || 'Pending',
                documents: body.documents || [],
                logbook_details: body.logbookDetails || null,
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
