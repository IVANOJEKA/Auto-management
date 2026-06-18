import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';
import { verifyUserSession } from '../../../../lib/auth-server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await verifyUserSession(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = user.tenantId;
        const { id } = await params;
        const body = await req.json();

        const mapped: Record<string, unknown> = {};
        if (body.type !== undefined) mapped.type = body.type;
        if (body.clientName !== undefined) mapped.client_name = body.clientName;
        if (body.clientPhone !== undefined) mapped.client_phone = body.clientPhone;
        if (body.vehicleLabel !== undefined) mapped.vehicle_label = body.vehicleLabel;
        if (body.date !== undefined) mapped.date = body.date;
        if (body.time !== undefined) mapped.time = body.time;
        if (body.agent !== undefined) mapped.agent = body.agent;
        if (body.notes !== undefined) mapped.notes = body.notes;
        if (body.status !== undefined) mapped.status = body.status;
        if (body.branch !== undefined) mapped.branch = body.branch;

        const { data, error } = await supabaseAdmin
            .from('appointments')
            .update(mapped)
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
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
        const tenantId = user.tenantId;
        const { id } = await params;

        const { error } = await supabaseAdmin
            .from('appointments')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
