import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const tenantId = searchParams.get('tenant_id');

        let query = supabaseAdmin
            .from('parts_sales')
            .select('*, parts_sale_items(*)')
            .order('created_at', { ascending: false });

        if (tenantId) query = query.eq('tenant_id', tenantId);

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { items, ...sale } = body;

        const { data: newSale, error: saleErr } = await supabaseAdmin
            .from('parts_sales')
            .insert([{
                sale_number: sale.saleNumber,
                date: sale.date || new Date().toISOString(),
                customer_id: sale.customerId || null,
                customer_name: sale.customerName || null,
                subtotal: sale.subtotal,
                discount: sale.discount || 0,
                total: sale.total,
                payment_method: sale.paymentMethod,
                notes: sale.notes || null,
                branch: sale.branch || null,
                created_by: sale.createdBy,
                tenant_id: sale.tenant_id || null,
            }])
            .select()
            .single();

        if (saleErr) throw saleErr;

        if (items?.length) {
            const saleItems = items.map((item: any) => ({
                sale_id: newSale.id,
                part_id: item.partId || null,
                part_number: item.partNumber,
                name: item.name,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                unit_cost: item.unitCost,
                line_total: item.lineTotal,
            }));
            await supabaseAdmin.from('parts_sale_items').insert(saleItems);
        }

        return NextResponse.json(newSale, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
