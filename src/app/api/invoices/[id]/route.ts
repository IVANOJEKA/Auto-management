import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';
import { getTenantId } from '../../../../lib/tenant-server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const tenantId = await getTenantId(req);
        const { id } = await params;
        const body = await req.json();
        const updateFields: Record<string, any> = { updated_at: new Date().toISOString() };
        if (body.status !== undefined) {
            updateFields.status = body.status;
            updateFields.paid_date = body.status === 'Paid' ? new Date().toLocaleDateString('en-UG') : null;
        }
        if (body.amount !== undefined) {
            updateFields.amount = body.amount;
        }
        if (body.payment_method !== undefined) {
            updateFields.payment_method = body.payment_method;
        }
        if (body.payment_option !== undefined) {
            updateFields.payment_option = body.payment_option;
        }
        
        const { data, error } = await supabaseAdmin
            .from('invoices')
            .update(updateFields)
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
