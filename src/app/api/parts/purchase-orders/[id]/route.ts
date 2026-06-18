import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase-server';
import { verifyUserSession } from '../../../../../lib/auth-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const user = await verifyUserSession(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = user.tenantId;
        const body = await req.json(); // contains status

        // 1. Fetch current PO details
        const { data: po, error: poError } = await supabaseAdmin
            .from('parts_purchase_orders')
            .select('*')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .single();

        if (poError || !po) {
            return NextResponse.json({ error: poError?.message || 'Purchase Order not found' }, { status: 404 });
        }

        const prevStatus = po.status;
        const newStatus = body.status;

        // 2. Perform status update
        const { data: updatedPO, error: updateError } = await supabaseAdmin
            .from('parts_purchase_orders')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

        // 3. Trigger inventory and supplier balance updates if status changed from Ordered -> Received
        if (prevStatus === 'Ordered' && newStatus === 'Received') {
            // A. Fetch PO Items
            const { data: items, error: itemsError } = await supabaseAdmin
                .from('parts_purchase_order_items')
                .select('*')
                .eq('po_id', id);

            if (!itemsError && items) {
                for (const item of items) {
                    // B. Query matching part in parts_inventory
                    const { data: part, error: partError } = await supabaseAdmin
                        .from('parts_inventory')
                        .select('*')
                        .eq('part_number', item.part_number)
                        .eq('tenant_id', tenantId)
                        .maybeSingle();

                    if (!partError && part) {
                        // C. Update stock quantity
                        const newStock = Number(part.stock_quantity || 0) + Number(item.quantity);
                        await supabaseAdmin
                            .from('parts_inventory')
                            .update({ stock_quantity: newStock })
                            .eq('id', part.id);
                    } else {
                        // D. Create new part record in inventory
                        await supabaseAdmin
                            .from('parts_inventory')
                            .insert([{
                                tenant_id: tenantId,
                                part_number: item.part_number,
                                name: item.name,
                                description: `Auto-created from PO ${po.po_number}`,
                                cost: Number(item.unit_cost),
                                price: Number(item.unit_cost) * 1.3, // Default 30% markup
                                stock_quantity: Number(item.quantity),
                                category: 'Other'
                            }]);
                    }
                }
            }

            // E. Record supplier transaction and update supplier's outstanding balance if supplier is linked
            if (po.supplier_id) {
                const totalCostVal = Number(po.total_cost || 0);
                const todayStr = new Date().toISOString().split('T')[0];

                // Create restock transaction
                await supabaseAdmin
                    .from('supplier_transactions')
                    .insert([{
                        tenant_id: tenantId,
                        supplier_id: po.supplier_id,
                        date: todayStr,
                        type: 'Parts Restock',
                        reference: `Parts Restock PO: ${po.po_number}`,
                        amount: totalCostVal,
                        status: 'Outstanding'
                    }]);

                // Update supplier balance
                const { data: supplier } = await supabaseAdmin
                    .from('suppliers')
                    .select('outstanding_balance')
                    .eq('id', po.supplier_id)
                    .single();

                if (supplier) {
                    const newBal = Number(supplier.outstanding_balance || 0) + totalCostVal;
                    await supabaseAdmin
                        .from('suppliers')
                        .update({ outstanding_balance: newBal })
                        .eq('id', po.supplier_id);
                }
            }
        }

        // Return PO with items nested
        const { data: finalPO } = await supabaseAdmin
            .from('parts_purchase_orders')
            .select('*, parts_purchase_order_items(*)')
            .eq('id', id)
            .single();

        return NextResponse.json(finalPO || updatedPO);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const user = await verifyUserSession(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = user.tenantId;

        const { error } = await supabaseAdmin
            .from('parts_purchase_orders')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
