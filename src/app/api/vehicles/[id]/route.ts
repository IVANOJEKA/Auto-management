import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';
import { verifyUserSession, hasRoleAccess } from '../../../../lib/auth-server';
import { logAuditEvent } from '../../../../lib/audit-logger';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await verifyUserSession(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { id } = await params;
        const body = await req.json();

        const { data: oldVehicle } = await supabaseAdmin
            .from('vehicles')
            .select('*')
            .eq('id', id)
            .eq('tenant_id', user.tenantId)
            .maybeSingle();

        const { data, error } = await supabaseAdmin
            .from('vehicles')
            .update({ ...body, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('tenant_id', user.tenantId)
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        const isStatusChange = oldVehicle && body.status && oldVehicle.status !== body.status;
        const actionName = isStatusChange ? 'VEHICLE_STATUS_CHANGED' : 'VEHICLE_UPDATED';

        await logAuditEvent(req, {
            action: actionName,
            category: 'VEHICLES',
            entityType: 'Vehicle',
            entityId: id,
            entityName: `${data.year || ''} ${data.make || ''} ${data.model || ''} (${data.vin || id})`.trim(),
            description: isStatusChange
                ? `Vehicle status changed from ${oldVehicle.status} to ${body.status}`
                : `Updated details for vehicle ${data.make} ${data.model}`,
            oldValues: oldVehicle || null,
            newValues: data || null,
            severity: isStatusChange && body.status === 'Sold' ? 'HIGH' : 'MEDIUM',
            userOverride: user
        });

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
        if (!hasRoleAccess(user, ['Admin', 'Sales Manager'])) {
            return NextResponse.json({ error: 'Forbidden: Insufficient privileges to delete vehicle' }, { status: 403 });
        }
        const { id } = await params;

        const { data: vehicle } = await supabaseAdmin
            .from('vehicles')
            .select('*')
            .eq('id', id)
            .eq('tenant_id', user.tenantId)
            .maybeSingle();

        const { error } = await supabaseAdmin
            .from('vehicles')
            .delete()
            .eq('id', id)
            .eq('tenant_id', user.tenantId);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        await logAuditEvent(req, {
            action: 'VEHICLE_DELETED',
            category: 'VEHICLES',
            entityType: 'Vehicle',
            entityId: id,
            entityName: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : id,
            description: `Deleted vehicle record ${id}`,
            oldValues: vehicle || null,
            severity: 'HIGH',
            userOverride: user
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
