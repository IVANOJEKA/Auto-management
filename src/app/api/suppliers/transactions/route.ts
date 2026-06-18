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
            .from('supplier_transactions')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('date', { ascending: false });
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
        const body = await req.json();

        // 1. Insert transaction
        const { data: txData, error: txError } = await supabaseAdmin
            .from('supplier_transactions')
            .insert([{
                tenant_id: tenantId,
                supplier_id: body.supplierId,
                date: body.date,
                type: body.type,
                reference: body.reference,
                amount: Number(body.amount),
                status: body.status || 'Outstanding'
            }])
            .select()
            .single();

        if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });

        // 2. Fetch current supplier outstanding balance
        const { data: supplier, error: supplierError } = await supabaseAdmin
            .from('suppliers')
            .select('outstanding_balance')
            .eq('id', body.supplierId)
            .eq('tenant_id', tenantId)
            .single();

        if (!supplierError && supplier) {
            const currentBal = Number(supplier.outstanding_balance || 0);
            // outstanding balance = current balance + amount (purchases are positive, payments are negative)
            const newBal = Math.max(0, currentBal + Number(body.amount));
            
            await supabaseAdmin
                .from('suppliers')
                .update({ outstanding_balance: newBal })
                .eq('id', body.supplierId);
        }

        return NextResponse.json(txData, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
