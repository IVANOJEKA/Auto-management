import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';
import { getTenantId } from '../../../lib/tenant-server';

export async function GET(req: NextRequest) {
    try {
        const tenantId = await getTenantId(req);
        const { data, error } = await supabaseAdmin
            .from('shipments')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        
        const mappedData = data.map(item => ({
            id: item.id,
            orderId: item.order_id,
            vehicle: item.vehicle,
            from: item.from,
            page: item.page,
            eta: item.eta,
            status: item.status,
            cost: item.cost,
            vessel: item.vessel,
            customsEntry: item.customs_entry,
            branch: item.branch
        }));
        
        return NextResponse.json(mappedData);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const tenantId = await getTenantId(req);
        const body = await req.json();
        // Auto-generate order_id if not provided
        const orderId = body.orderId || `ORD-${Date.now().toString().slice(-6)}`;
        const { data, error } = await supabaseAdmin
            .from('shipments')
            .insert([{
                tenant_id: tenantId,
                order_id: orderId,
                vehicle: body.vehicle,
                from: body.from,
                eta: body.eta,
                status: body.status,
                cost: body.cost,
                vessel: body.vessel,
                customs_entry: body.customsEntry,
                branch: body.branch
            }])
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
        
        return NextResponse.json(mapped, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
