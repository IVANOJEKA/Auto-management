import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';
import { verifyUserSession } from '../../../../lib/auth-server';

export async function GET(req: NextRequest) {
    try {
        const user = await verifyUserSession(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = user.tenantId;
        const { data, error } = await supabaseAdmin
            .from('parts_purchase_orders')
            .select('*, parts_purchase_order_items(*)')
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
        const user = await verifyUserSession(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = user.tenantId;
        const body = await req.json(); // contains poNumber, supplierId, branch, notes, items: Array<{ partNumber, name, quantity, unitCost }>

        const items = body.items || [];
        const totalCost = items.reduce((acc: number, item: any) => acc + (Number(item.quantity) * Number(item.unitCost)), 0);

        // 1. Insert PO Header
        const { data: poData, error: poError } = await supabaseAdmin
            .from('parts_purchase_orders')
            .insert([{
                tenant_id: tenantId,
                po_number: body.poNumber,
                supplier_id: body.supplierId || null,
                status: body.status || 'Ordered',
                total_cost: totalCost,
                branch: body.branch || user.branch,
                notes: body.notes
            }])
            .select()
            .single();

        if (poError) return NextResponse.json({ error: poError.message }, { status: 500 });

        // 2. Insert PO Items if present
        if (items.length > 0) {
            const mappedItems = items.map((item: any) => ({
                po_id: poData.id,
                part_number: item.partNumber,
                name: item.name,
                quantity: Number(item.quantity),
                unit_cost: Number(item.unitCost)
            }));

            const { error: itemsError } = await supabaseAdmin
                .from('parts_purchase_order_items')
                .insert(mappedItems);

            if (itemsError) {
                // Cleanup header on failure to prevent orphans
                await supabaseAdmin.from('parts_purchase_orders').delete().eq('id', poData.id);
                return NextResponse.json({ error: itemsError.message }, { status: 500 });
            }
        }

        // Return the PO with its nested items
        const { data: finalPO, error: finalError } = await supabaseAdmin
            .from('parts_purchase_orders')
            .select('*, parts_purchase_order_items(*)')
            .eq('id', poData.id)
            .single();

        if (finalError) return NextResponse.json(poData, { status: 201 });
        return NextResponse.json(finalPO, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
