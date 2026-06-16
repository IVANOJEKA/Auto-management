import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';
import { getTenantId } from '../../../../lib/tenant-server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const tenantId = await getTenantId(req);
        const { id } = await params;
        const body = await req.json();
        const mapped: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (body.kyc !== undefined) mapped.kyc = body.kyc;
        if (body.kycNotes !== undefined) mapped.kyc_notes = body.kycNotes;
        if (body.purchases !== undefined) mapped.purchases = body.purchases;
        if (body.tv !== undefined) mapped.tv = body.tv;
        
        const { data, error } = await supabaseAdmin
            .from('clients')
            .update(mapped)
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select()
            .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
