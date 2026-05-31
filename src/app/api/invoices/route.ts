import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';

export async function GET() {
    const { data, error } = await supabaseAdmin.from('invoices').select('*').order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { data, error } = await supabaseAdmin
        .from('invoices')
        .insert([{
            date: new Date().toLocaleDateString('en-UG'),
            client: body.client,
            amount: body.amount,
            type: body.type,
            status: body.status || 'Pending Finance',
            branch: body.branch,
        }])
        .select()
        .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
}
