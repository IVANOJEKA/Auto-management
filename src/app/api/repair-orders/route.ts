import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';

export async function GET() {
    const { data, error } = await supabaseAdmin
        .from('repair_orders')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    
    // Map db snake_case structure to client camelCase if needed, or keep it standard.
    // In DataContext, we have fields like ro, vehicle, client, issue, technician, status, due, laborHours, parts, cost, partsList, branch.
    // Let's verify schema: ro, vehicle, client, issue, technician, status, due, labor_hours (mapped from laborHours), parts, cost, parts_list (mapped from partsList), branch.
    const mappedData = data.map(item => ({
        id: item.id,
        ro: item.ro,
        vehicle: item.vehicle,
        client: item.client,
        issue: item.issue,
        technician: item.technician,
        status: item.status,
        due: item.due,
        laborHours: item.labor_hours ? Number(item.labor_hours) : undefined,
        parts: item.parts,
        cost: item.cost,
        partsList: item.parts_list || [],
        branch: item.branch
    }));
    
    return NextResponse.json(mappedData);
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    // Auto-generate RO number if not provided
    const roNumber = body.ro || `RO-${Date.now().toString().slice(-6)}`;
    const { data, error } = await supabaseAdmin
        .from('repair_orders')
        .insert([{
            ro: roNumber,
            vehicle: body.vehicle,
            client: body.client,
            issue: body.issue,
            technician: body.technician,
            status: body.status,
            due: body.due,
            labor_hours: body.laborHours,
            parts: body.parts,
            cost: body.cost,
            parts_list: body.partsList || [],
            branch: body.branch
        }])
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
    
    return NextResponse.json(mapped, { status: 201 });
}
