import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';
import { getTenantId } from '../../../../lib/tenant-server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const tenantId = await getTenantId(req);
        const { id } = await params;
        const body = await req.json();
        
        const updatePayload: Record<string, any> = {};
        if (body.orderId !== undefined) updatePayload.order_id = body.orderId;
        if (body.vehicle !== undefined) updatePayload.vehicle = body.vehicle;
        if (body.from !== undefined) updatePayload.from = body.from;
        if (body.eta !== undefined) updatePayload.eta = body.eta;
        if (body.status !== undefined) updatePayload.status = body.status;
        if (body.cost !== undefined) updatePayload.cost = body.cost;
        if (body.vessel !== undefined) updatePayload.vessel = body.vessel;
        if (body.customsEntry !== undefined) updatePayload.customs_entry = body.customsEntry;
        if (body.branch !== undefined) updatePayload.branch = body.branch;
        
        updatePayload.updated_at = new Date().toISOString();

        const { data, error } = await supabaseAdmin
            .from('shipments')
            .update(updatePayload)
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select()
            .single();
            
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        
        const mapped = {
            id: data.id,
            orderId: data.order_id,
            vehicle: data.vehicle,
            from: data.from,
            eta: data.eta,
            status: data.status,
            cost: data.cost,
            vessel: data.vessel,
            customsEntry: data.customs_entry,
            branch: data.branch
        };
        
        return NextResponse.json(mapped);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
