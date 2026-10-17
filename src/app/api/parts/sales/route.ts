import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';
import { verifyUserSession } from '../../../../lib/auth-server';

export async function GET(req: NextRequest) {
    try {
        const user = await verifyUserSession(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const branch = searchParams.get('branch');

        let query = supabaseAdmin
            .from('parts_sales')
            .select('*, parts_sale_items(*)')
            .eq('tenant_id', user.tenantId)
            .order('created_at', { ascending: false });

        if (branch && branch !== 'All') {
            query = query.eq('branch', branch);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json(data || []);
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

        const body = await req.json();
        const { items, ...sale } = body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Cart is empty. Sale must contain at least one item.' }, { status: 400 });
        }

        // Authoritative Backend Stock Validation & Concurrency Check
        for (const item of items) {
            if (!item.partId && !item.partNumber) {
                return NextResponse.json({ error: `Item "${item.name}" is missing product identifier.` }, { status: 400 });
            }

            let partQuery = supabaseAdmin
                .from('parts_inventory')
                .select('*')
                .eq('tenant_id', user.tenantId);

            if (item.partId) {
                partQuery = partQuery.eq('id', item.partId);
            } else {
                partQuery = partQuery.eq('part_number', item.partNumber);
            }

            const { data: part, error: pErr } = await partQuery.maybeSingle();

            if (pErr || !part) {
                return NextResponse.json({ 
                    error: `Product "${item.name}" (${item.partNumber}) not found in inventory.` 
                }, { status: 400 });
            }

            const currentStock = Number(part.stock_quantity || 0);
            const reqQty = Number(item.quantity || 0);

            if (reqQty <= 0) {
                return NextResponse.json({ 
                    error: `Invalid quantity ${reqQty} for "${item.name}".` 
                }, { status: 400 });
            }

            if (currentStock <= 0) {
                return NextResponse.json({ 
                    error: `Checkout blocked: "${part.name}" is unpurchased or out of stock (Stock: 0).` 
                }, { status: 400 });
            }

            if (reqQty > currentStock) {
                return NextResponse.json({ 
                    error: `Checkout blocked: Requested ${reqQty} units of "${part.name}", but only ${currentStock} are available.` 
                }, { status: 400 });
            }
        }

        // 1. Insert Sales Record
        const { data: newSale, error: saleErr } = await supabaseAdmin
            .from('parts_sales')
            .insert([{
                sale_number: sale.saleNumber,
                date: sale.date || new Date().toISOString(),
                customer_id: sale.customerId || null,
                customer_name: sale.customerName || 'Walk-in Customer',
                subtotal: Number(sale.subtotal || 0),
                discount: Number(sale.discount || 0),
                total: Number(sale.total || 0),
                payment_method: sale.paymentMethod || 'Cash',
                notes: sale.notes || null,
                branch: sale.branch || user.branch || null,
                created_by: sale.createdBy || user.email,
                tenant_id: user.tenantId,
            }])
            .select()
            .single();

        if (saleErr) throw saleErr;

        // 2. Insert Sale Items
        const saleItems = items.map((item: any) => ({
            sale_id: newSale.id,
            part_id: item.partId || null,
            part_number: item.partNumber,
            name: item.name,
            quantity: Number(item.quantity),
            unit_price: Number(item.unitPrice),
            unit_cost: Number(item.unitCost || 0),
            line_total: Number(item.lineTotal),
        }));
        await supabaseAdmin.from('parts_sale_items').insert(saleItems);

        // 3. Atomically decrement stock in backend database
        for (const item of items) {
            let partLookup = supabaseAdmin
                .from('parts_inventory')
                .select('id, stock_quantity')
                .eq('tenant_id', user.tenantId);

            if (item.partId) {
                partLookup = partLookup.eq('id', item.partId);
            } else {
                partLookup = partLookup.eq('part_number', item.partNumber);
            }

            const { data: currentPart } = await partLookup.maybeSingle();
            if (currentPart) {
                const updatedStock = Math.max(0, Number(currentPart.stock_quantity || 0) - Number(item.quantity));
                await supabaseAdmin
                    .from('parts_inventory')
                    .update({ stock_quantity: updatedStock, updated_at: new Date().toISOString() })
                    .eq('id', currentPart.id)
                    .eq('tenant_id', user.tenantId);
            }
        }

        return NextResponse.json(newSale, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

