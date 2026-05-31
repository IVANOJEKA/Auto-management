import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json();
    const mapped: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.taxes !== undefined) mapped.taxes = body.taxes;
    if (body.logbook !== undefined) mapped.logbook = body.logbook;
    if (body.plates !== undefined) mapped.plates = body.plates;
    if (body.esign !== undefined) mapped.esign = body.esign;
    if (body.documents !== undefined) mapped.documents = body.documents;
    if (body.logbookDetails !== undefined) mapped.logbook_details = body.logbookDetails;
    const { data, error } = await supabaseAdmin
        .from('compliance_records')
        .update(mapped)
        .eq('id', id)
        .select()
        .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}
