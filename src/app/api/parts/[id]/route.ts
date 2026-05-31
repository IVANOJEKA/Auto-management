import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
}
