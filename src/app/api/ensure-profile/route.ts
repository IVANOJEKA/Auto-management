import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';
import { getTenantId } from '../../../lib/tenant-server';

export async function POST(req: NextRequest) {
    try {
        const tenantId = await getTenantId(req);
        const { userId, email } = await req.json();

        if (!userId || !email) {
            return NextResponse.json({ error: 'userId and email are required' }, { status: 400 });
        }

        // Check if profile already exists for this tenant
        const { data: existing } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .eq('tenant_id', tenantId)
            .maybeSingle();

        if (existing) {
            return NextResponse.json(existing);
        }

        // Determine role: if email matches admin pattern, assign Admin role
        const isAdmin = email.includes('admin') || email.includes('manager');
        const defaultRole = isAdmin ? 'Admin' : 'Sales';
        const defaultName = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

        const { data, error } = await supabaseAdmin
            .from('user_profiles')
            .insert([{
                id: userId,
                tenant_id: tenantId,
                name: defaultName,
                role: defaultRole,
                branch: 'Kampala Main'
            }])
            .select()
            .single();

        if (error) {
            console.error('ensure-profile insert error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
