import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';
import { getTenantId } from '../../../lib/tenant-server';

export async function GET(req: NextRequest) {
    try {
        const tenantId = await getTenantId(req);
        const { data, error } = await supabaseAdmin
            .from('deals')
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
            .from('deals')
            .insert([{
                tenant_id: tenantId,
                date: new Date().toLocaleDateString('en-UG'),
                client: body.client,
                vehicle: body.vehicle,
                sale_price: body.salePrice,
                margin: body.margin,
                commission: body.commission,
                agent: body.agent,
                status: body.status,
                fi_products: body.fiProducts,
                notes: body.notes,
                trade_in: body.tradeIn || null,
                financing: body.financing || null,
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
