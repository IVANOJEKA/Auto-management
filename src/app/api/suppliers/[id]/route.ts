import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';
import { verifyUserSession } from '../../../../lib/auth-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const user = await verifyUserSession(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = user.tenantId;
        const body = await req.json();
        
        // Build dynamic updates
        const updates: any = {};
        if (body.name !== undefined) updates.name = body.name;
        if (body.contactPerson !== undefined) updates.contact_person = body.contactPerson;
        if (body.phone !== undefined) updates.phone = body.phone;
        if (body.email !== undefined) updates.email = body.email;
        if (body.address !== undefined) updates.address = body.address;
        if (body.country !== undefined) updates.country = body.country;
        if (body.type !== undefined) updates.type = body.type;
        if (body.rating !== undefined) updates.rating = Number(body.rating);
        if (body.outstandingBalance !== undefined) updates.outstanding_balance = Number(body.outstandingBalance);
        if (body.creditTerms !== undefined) updates.credit_terms = body.creditTerms;
        if (body.notes !== undefined) updates.notes = body.notes;
        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabaseAdmin
            .from('suppliers')
            .update(updates)
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

export async function DELETE(req: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const user = await verifyUserSession(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = user.tenantId;

        const { error } = await supabaseAdmin
            .from('suppliers')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
