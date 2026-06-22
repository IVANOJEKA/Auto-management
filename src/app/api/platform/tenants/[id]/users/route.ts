import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../lib/supabase-server';
import { cookies } from 'next/headers';

async function checkPlatformAuth(): Promise<boolean> {
    const cookieStore = await cookies();
    return cookieStore.get('platform_admin_session')?.value === 'authenticated';
}

// GET /api/platform/tenants/[id]/users — list all user profiles for a tenant
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    if (!await checkPlatformAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await context.params;

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
            // Mock fallback
            return NextResponse.json([
                { id: 'usr-1', name: 'John Doe', email: 'owner@garisphere.com', role: 'Admin', branch: 'Kampala Main', created_at: new Date().toISOString() },
                { id: 'usr-2', name: 'Jane Smith', email: 'sales@garisphere.com', role: 'Sales', branch: 'Kampala Main', created_at: new Date().toISOString() }
            ]);
        }

        const { data, error } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('tenant_id', id)
            .order('name', { ascending: true });

        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PATCH /api/platform/tenants/[id]/users — edit user password
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    if (!await checkPlatformAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { userId, password } = body;

        if (!userId || !password) {
            return NextResponse.json({ error: 'User ID and password are required.' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
        }

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
            console.log(`[Platform Users API] Mock password update for user ${userId} successful.`);
            return NextResponse.json({ success: true, message: 'Password updated successfully (mock).' });
        }

        // Update password using Supabase Auth Admin API
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: password
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'User password updated successfully.' });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
