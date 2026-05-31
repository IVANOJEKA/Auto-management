import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';

export async function GET() {
    const { data, error } = await supabaseAdmin.from('clients').select('*').order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { data, error } = await supabaseAdmin
        .from('clients')
        .insert([{
            name: body.name,
            email: body.email,
            phone: body.phone,
            purchases: body.purchases || 0,
            tv: body.tv || '$0',
            kyc: body.kyc || 'Pending',
            kyc_notes: body.kycNotes,
            branch: body.branch,
        }])
        .select()
        .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
}
