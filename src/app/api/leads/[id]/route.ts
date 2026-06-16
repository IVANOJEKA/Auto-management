import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';
import { getTenantId } from '../../../../lib/tenant-server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const tenantId = await getTenantId(req);
        const { id } = await params;
        const body = await req.json();
        const mapped: Record<string, unknown> = {};
        if (body.status !== undefined) mapped.status = body.status;
        if (body.notes !== undefined) mapped.notes = body.notes;
        if (body.lastContact !== undefined) mapped.last_contact = body.lastContact;
        
        const { data, error } = await supabaseAdmin
            .from('leads')
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const tenantId = await getTenantId(req);
        const { id } = await params;
        const { error } = await supabaseAdmin
            .from('leads')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
