import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';
import { verifyUserSession } from '../../../../lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await verifyUserSession(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { id } = await params;
        const { data, error } = await supabaseAdmin
            .from('parts_inventory')
            .select('*')
            .eq('id', id)
            .eq('tenant_id', user.tenantId)
            .maybeSingle();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!data) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

        return NextResponse.json({
            id: data.id,
            partNumber: data.part_number,
            name: data.name,
            description: data.description,
            cost: Number(data.cost),
            price: Number(data.price),
            stockQuantity: Number(data.stock_quantity),
            category: data.category
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await verifyUserSession(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { id } = await params;
        const body = await req.json();
        
        const updatePayload: Record<string, any> = {};
        if (body.partNumber !== undefined) updatePayload.part_number = body.partNumber;
        if (body.name !== undefined) updatePayload.name = body.name;
        if (body.description !== undefined) updatePayload.description = body.description;
        if (body.cost !== undefined) updatePayload.cost = body.cost;
        if (body.price !== undefined) updatePayload.price = body.price;
        if (body.stockQuantity !== undefined) updatePayload.stock_quantity = body.stockQuantity;
        if (body.category !== undefined) updatePayload.category = body.category;
        
        updatePayload.updated_at = new Date().toISOString();

        const { data, error } = await supabaseAdmin
            .from('parts_inventory')
            .update(updatePayload)
            .eq('id', id)
            .eq('tenant_id', user.tenantId)
            .select()
            .single();
            
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        
        const mapped = {
            id: data.id,
            partNumber: data.part_number,
            name: data.name,
            description: data.description,
            cost: Number(data.cost),
            price: Number(data.price),
            stockQuantity: Number(data.stock_quantity),
            category: data.category
        };
        
        return NextResponse.json(mapped);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await verifyUserSession(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { id } = await params;

        const { error } = await supabaseAdmin
            .from('parts_inventory')
            .delete()
            .eq('id', id)
            .eq('tenant_id', user.tenantId);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

