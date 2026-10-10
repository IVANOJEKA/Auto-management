import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../lib/supabase-server';
import { cookies } from 'next/headers';

async function checkPlatformAuth(): Promise<boolean> {
    try {
        const cookieStore = await cookies();
        return cookieStore.get('platform_admin_session')?.value === 'authenticated';
    } catch (e) {
        console.error('[checkPlatformAuth] Error reading cookies:', e);
        return false;
    }
}

// GET /api/platform/tenants/[id]/users — list all user profiles for a tenant
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        if (!await checkPlatformAuth()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

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

        if (error) {
            // Log actual error server-side for debugging but return graceful empty to client
            console.error(`[platform/users GET] DB error for tenant ${id}:`, error.code, error.message);
            // Return empty array so UI can still show the repair form
            return NextResponse.json([], { headers: { 'X-DB-Warning': String(error.message || '').slice(0, 120) } });
        }

        return NextResponse.json(data || []);
    } catch (err: any) {
        // Always return empty array (not 500) so the Staff tab can render the repair form
        console.error('[platform/users GET] Unexpected error:', err?.message);
        return NextResponse.json([]);
    }
}


// PATCH /api/platform/tenants/[id]/users — reset an existing user's password
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        if (!await checkPlatformAuth()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        if (!await checkPlatformAuth()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
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

        // Upsert the profile to guarantee it has the correct tenant_id, role, branch, and name
        const { error: profileErr } = await supabaseAdmin
            .from('user_profiles')
            .upsert({
                id: userId,
                tenant_id: id,
                name: name || (tenant?.name ? `${tenant.name} Admin` : 'Admin'),
                role: role || 'Admin',
                branch: branch || 'Main'
            });

        if (profileErr) {
            // Fallback to update if upsert fails
            const { error: updateErr } = await supabaseAdmin
                .from('user_profiles')
                .update({
                    tenant_id: id,
                    name: name || (tenant?.name ? `${tenant.name} Admin` : 'Admin'),
                    role: role || 'Admin',
                    branch: branch || 'Main'
                })
                .eq('id', userId);

            if (updateErr) {
                return NextResponse.json({ error: `Auth user created but profile sync failed: ${updateErr.message}` }, { status: 207 });
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
