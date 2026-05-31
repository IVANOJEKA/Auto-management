import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';

export async function GET() {
    const { data, error } = await supabaseAdmin.from('leads').select('*').order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { data, error } = await supabaseAdmin
        .from('leads')
        .insert([{
            name: body.name,
            phone: body.phone,
            email: body.email,
            interest: body.interest,
            status: body.status || 'Hot',
            last_contact: 'Just now',
            notes: body.notes,
            branch: body.branch,
        }])
        .select()
        .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
}
