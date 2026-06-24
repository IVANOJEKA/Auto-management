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

// PATCH /api/platform/tenants/[id]/users — reset an existing user's password
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
            return NextResponse.json({ success: true, message: 'Password updated successfully (mock).' });
        }

        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'User password updated successfully.' });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/platform/tenants/[id]/users — create or repair an auth user + profile for a tenant
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    if (!await checkPlatformAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await context.params;
        const body = await req.json();
        const { email, password, name, role, branch } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
        }

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
            return NextResponse.json({ success: true, message: 'User provisioned (mock).' });
        }

        // Fetch the tenant to get its name
        const { data: tenant } = await supabaseAdmin
            .from('tenants')
            .select('name, owner_email')
            .eq('id', id)
            .maybeSingle();

        // Check if auth user already exists
        const listRes = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const allUsers: any[] = listRes.data?.users || [];
        const existingAuthUser = allUsers.find((u: any) => (u.email as string)?.toLowerCase() === email.toLowerCase());

        let userId: string;

        if (existingAuthUser) {
            userId = existingAuthUser.id;
            // Update their password
            await supabaseAdmin.auth.admin.updateUserById(userId, { password }).catch(() => null);
        } else {
            // Create new auth user
            const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
            });
            if (createErr) {
                return NextResponse.json({ error: `Failed to create auth user: ${createErr.message}` }, { status: 500 });
            }
            userId = newUser.user.id;
        }

        // Check if profile already exists for this user
        const { data: existingProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

        if (!existingProfile) {
            const { error: profileErr } = await supabaseAdmin.from('user_profiles').insert([{
                id: userId,
                tenant_id: id,
                name: name || (tenant?.name ? `${tenant.name} Admin` : 'Admin'),
                email,
                role: role || 'Admin',
                branch: branch || 'Main',
                active: true,
            }]);
            if (profileErr) {
                return NextResponse.json({ error: `Auth user created but profile failed: ${profileErr.message}` }, { status: 207 });
            }
        }

        // Generate a login magic link for the owner
        let magicLink: string | null = null;
        const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        try {
            const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
                type: 'recovery',
                email,
                options: { redirectTo: `${appUrl}/login` }
            });
            if (linkData?.properties?.action_link) magicLink = linkData.properties.action_link;
        } catch { /* non-fatal */ }

        return NextResponse.json({
            success: true,
            message: existingAuthUser ? 'Existing auth account found — password updated and profile linked.' : 'Auth account created and profile set up successfully.',
            userId,
            magicLink: magicLink || undefined,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
