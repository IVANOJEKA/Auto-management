import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';

export async function GET() {
    const { data, error } = await supabaseAdmin
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { data, error } = await supabaseAdmin
        .from('vehicles')
        .insert([{
            vin: body.vin,
            make: body.make,
            model: body.model,
            year: body.year,
            color: body.color,
            mileage: body.mileage,
            cost: body.cost,
            price: body.price,
            status: body.status,
            notes: body.notes,
            branch: body.branch,
            source: body.source || 'Shipped',
            acquisition_details: body.acquisitionDetails || null,
        }])
        .select()
        .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
}
