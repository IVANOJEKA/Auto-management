import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';

export async function GET() {
    const { data, error } = await supabaseAdmin
        .from('parts_inventory')
        .select('*')
        .order('name', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    
    const mappedData = data.map(item => ({
        id: item.id,
        partNumber: item.part_number,
        name: item.name,
        description: item.description,
        cost: Number(item.cost),
        price: Number(item.price),
        stockQuantity: Number(item.stock_quantity),
        category: item.category
    }));
    
    return NextResponse.json(mappedData);
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { data, error } = await supabaseAdmin
        .from('parts_inventory')
        .insert([{
            part_number: body.partNumber,
            name: body.name,
            description: body.description,
            cost: body.cost,
            price: body.price,
            stock_quantity: body.stockQuantity,
            category: body.category
        }])
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
    
    return NextResponse.json(mapped, { status: 201 });
}
