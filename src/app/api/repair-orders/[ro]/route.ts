import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ro: string }> }) {
    const { ro } = await params;
    const body = await req.json();
    
    // Map camelCase update keys from client to snake_case DB columns
    const updatePayload: Record<string, any> = {};
    if (body.vehicle !== undefined) updatePayload.vehicle = body.vehicle;
    if (body.client !== undefined) updatePayload.client = body.client;
    if (body.issue !== undefined) updatePayload.issue = body.issue;
    if (body.technician !== undefined) updatePayload.technician = body.technician;
    if (body.status !== undefined) updatePayload.status = body.status;
    if (body.due !== undefined) updatePayload.due = body.due;
    if (body.laborHours !== undefined) updatePayload.labor_hours = body.laborHours;
    if (body.parts !== undefined) updatePayload.parts = body.parts;
    if (body.cost !== undefined) updatePayload.cost = body.cost;
    if (body.partsList !== undefined) updatePayload.parts_list = body.partsList;
    if (body.branch !== undefined) updatePayload.branch = body.branch;
    
    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
        .from('repair_orders')
        .update(updatePayload)
        .eq('ro', ro)
        .select()
        .single();
        
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    
    const mapped = {
        id: data.id,
        ro: data.ro,
        vehicle: data.vehicle,
        client: data.client,
        issue: data.issue,
        technician: data.technician,
        status: data.status,
        due: data.due,
        laborHours: data.labor_hours ? Number(data.labor_hours) : undefined,
        parts: data.parts,
        cost: data.cost,
        partsList: data.parts_list || [],
        branch: data.branch
    };
    
    return NextResponse.json(mapped);
}
