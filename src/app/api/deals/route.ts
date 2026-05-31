import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';

export async function GET() {
    const { data, error } = await supabaseAdmin.from('deals').select('*').order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { data, error } = await supabaseAdmin
        .from('deals')
        .insert([{
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
}
