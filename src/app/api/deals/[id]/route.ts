import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json();
    
    const updatePayload: Record<string, any> = {};
    if (body.client !== undefined) updatePayload.client = body.client;
    if (body.vehicle !== undefined) updatePayload.vehicle = body.vehicle;
    if (body.salePrice !== undefined) updatePayload.sale_price = body.salePrice;
    if (body.margin !== undefined) updatePayload.margin = body.margin;
    if (body.commission !== undefined) updatePayload.commission = body.commission;
    if (body.agent !== undefined) updatePayload.agent = body.agent;
    if (body.status !== undefined) updatePayload.status = body.status;
    if (body.fiProducts !== undefined) updatePayload.fi_products = body.fiProducts;
    if (body.notes !== undefined) updatePayload.notes = body.notes;
    if (body.tradeIn !== undefined) updatePayload.trade_in = body.tradeIn;
    if (body.financing !== undefined) updatePayload.financing = body.financing;
    if (body.branch !== undefined) updatePayload.branch = body.branch;

    const { data, error } = await supabaseAdmin
        .from('deals')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
        
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}
