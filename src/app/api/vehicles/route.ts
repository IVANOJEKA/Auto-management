import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';
import { getTenantId } from '../../../lib/tenant-server';

export async function GET(req: NextRequest) {
    try {
        const tenantId = await getTenantId(req);
        const { data, error } = await supabaseAdmin
            .from('vehicles')
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
            .from('vehicles')
            .insert([{
                tenant_id: tenantId,
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
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
