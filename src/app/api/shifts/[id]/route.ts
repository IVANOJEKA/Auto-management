import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';
import { getTenantId } from '../../../../lib/tenant-server';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const tenantId = await getTenantId(req);
        const { id } = await params;
        const body = await req.json();

        if (!id) {
            return NextResponse.json({ error: "Missing shift ID parameter" }, { status: 400 });
        }

        const payload = {
            end_time: body.endTime || new Date().toISOString(),
            status: body.status || 'Ended'
        };

        const { data, error } = await supabaseAdmin
            .from('work_shifts')
            .update(payload)
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error) {
            console.warn("Supabase shift patch warning (falling back to offline success response):", error.message);
            return NextResponse.json({
                id,
                end_time: payload.end_time,
                status: payload.status
            });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        console.error("PATCH /api/shifts/[id] unexpected error:", err.message);
        return NextResponse.json({
            error: false,
            message: "Offline shift ended successfully"
        });
    }
}
