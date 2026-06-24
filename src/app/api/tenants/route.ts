import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';
import { getTenantSlug } from '../../../lib/tenant-server';
import { cookies } from 'next/headers';

// GET /api/tenants — returns info about the current tenant workspace
export async function GET(req: NextRequest) {
    const slug = getTenantSlug(req);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
        return NextResponse.json({
            id: '00000000-0000-0000-0000-000000000000',
            name: 'GariSphere Demo',
            subdomain: slug,
            plan: 'free',
            status: 'active',
            modules: ["dashboard", "inventory", "logistics", "crm", "sales", "appointments", "quotes", "suppliers", "compliance", "service", "parts", "notifications", "finance", "reports"],
            billing: { billing_plan: "free", billing_status: "active", billing_cycle: "monthly", billing_amount: "$0", next_bill_date: "2026-07-19", invoices: [] },
            isDefault: slug === 'garisphere'
        });
    }

    try {
        const { data: tenant, error } = await supabaseAdmin
            .from('tenants')
            .select('*')
            .eq('subdomain', slug)
            .maybeSingle();

        if (error) throw error;

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found', subdomain: slug }, { status: 404 });
        }

        return NextResponse.json({
            ...tenant,
            isDefault: slug === 'garisphere'
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

async function checkPlatformAuth(): Promise<boolean> {
    const cookieStore = await cookies();
    return cookieStore.get('platform_admin_session')?.value === 'authenticated';
}

// POST /api/tenants — provision a new tenant workspace
export async function POST(req: NextRequest) {
    if (!await checkPlatformAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
        return NextResponse.json({ error: 'Service client not configured' }, { status: 503 });
    }

    try {
        const body = await req.json();
        const { name, subdomain, plan, status, owner_email, owner_password } = body;

        if (!name || !subdomain) {
            return NextResponse.json({ error: 'name and subdomain are required' }, { status: 400 });
        }

        // Validate subdomain format
        const slugRegex = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;
        if (!slugRegex.test(subdomain)) {
            return NextResponse.json({
                error: 'Subdomain must be 3-32 lowercase alphanumeric characters or hyphens, and must not start/end with a hyphen.'
            }, { status: 400 });
        }

        // Reserved subdomains
        const RESERVED = ['www', 'api', 'app', 'admin', 'mail', 'smtp', 'ftp', 'static', 'cdn', 'autosphere-dms-cyan', 'garisphere'];
        if (RESERVED.includes(subdomain)) {
            return NextResponse.json({ error: `Subdomain "${subdomain}" is reserved.` }, { status: 409 });
        }

        // Check if already taken
        const { data: existing } = await supabaseAdmin
            .from('tenants')
            .select('id')
            .eq('subdomain', subdomain)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: `Subdomain "${subdomain}" is already taken.` }, { status: 409 });
        }

        // 1. Create tenant record
        const insertPayload: any = { name, subdomain };
        if (plan) insertPayload.plan = plan;
        if (status) insertPayload.status = status;
        if (owner_email) insertPayload.owner_email = owner_email;

        const { data: newTenant, error: createError } = await supabaseAdmin
            .from('tenants')
            .insert([insertPayload])
            .select()
            .single();

        if (createError) throw createError;

        // 2. Create owner auth user if email is provided
        let authUserCreated = false;
        let authWarning: string | null = null;
        let magicLink: string | null = null; // copyable link for admin to share

        const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

        if (owner_email) {
            try {
                // Helper: find an existing Supabase auth user by email
                const findExistingUser = async (email: string) => {
                    const res = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
                    const users: any[] = res.data?.users || [];
                    return users.find((u: any) => (u.email as string)?.toLowerCase() === email.toLowerCase()) || null;
                };

                if (owner_password) {
                    // Try to create user with password
                    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
                        email: owner_email,
                        password: owner_password,
                        email_confirm: true,
                    });

                    let userId: string | null = authUser?.user?.id || null;

                    if (authErr) {
                        // Gracefully handle duplicate / DB error by checking if user already exists
                        const existingUser = await findExistingUser(owner_email);
                        if (existingUser) {
                            userId = existingUser.id;
                            // Update their password
                            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password: owner_password }).catch(() => null);
                        } else {
                            authWarning = `Tenant created but user account failed: ${authErr.message}`;
                        }
                    }

                    if (userId) {
                        // Check if profile already exists
                        const { data: existingProfile } = await supabaseAdmin
                            .from('user_profiles')
                            .select('id')
                            .eq('id', userId)
                            .maybeSingle();

                        if (!existingProfile) {
                            const { error: profileErr } = await supabaseAdmin
                                .from('user_profiles')
                                .insert([{
                                    id: userId,
                                    tenant_id: newTenant.id,
                                    name: name + ' Admin',
                                    email: owner_email,
                                    role: 'Admin',
                                    branch: 'Main',
                                    active: true,
                                }]);
                            if (profileErr) {
                                authWarning = `User created but profile setup failed: ${profileErr.message}`;
                            } else {
                                authUserCreated = true;
                            }
                        } else {
                            authUserCreated = true; // Profile already exists — consider it success
                        }

                        // Generate a recovery link for the admin to share
                        if (authUserCreated) {
                            try {
                                const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
                                    type: 'recovery',
                                    email: owner_email,
                                    options: { redirectTo: `${appUrl}/login` }
                                });
                                if (linkData?.properties?.action_link) {
                                    magicLink = linkData.properties.action_link;
                                }
                            } catch { /* non-fatal */ }
                        }
                    }
                } else {
                    // No password — create user then generate a magic sign-in link
                    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
                        email: owner_email,
                        email_confirm: true,
                    });

                    let userId: string | null = authUser?.user?.id || null;

                    if (authErr) {
                        const existingUser = await findExistingUser(owner_email);
                        if (existingUser) {
                            userId = existingUser.id;
                        } else {
                            authWarning = `Tenant created but user account failed: ${authErr.message}`;
                        }
                    }

                    if (userId) {
                        const { data: existingProfile } = await supabaseAdmin
                            .from('user_profiles')
                            .select('id')
                            .eq('id', userId)
                            .maybeSingle();

                        if (!existingProfile) {
                            await supabaseAdmin.from('user_profiles').insert([{
                                id: userId,
                                tenant_id: newTenant.id,
                                name: name + ' Admin',
                                email: owner_email,
                                role: 'Admin',
                                branch: 'Main',
                                active: true,
                            }]);
                        }

                        // Generate magic link
                        try {
                            const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
                                type: 'recovery',
                                email: owner_email,
                                options: { redirectTo: `${appUrl}/login` }
                            });
                            if (linkErr) {
                                authWarning = `User ready but link generation failed: ${linkErr.message}`;
                            } else if (linkData?.properties?.action_link) {
                                magicLink = linkData.properties.action_link;
                                authUserCreated = true;
                            }
                        } catch (linkEx: any) {
                            authWarning = `User ready but link generation failed: ${linkEx.message}`;
                        }
                    }
                }
            } catch (authEx: any) {
                authWarning = `Tenant created but user setup failed: ${authEx.message}`;
            }
        }


        return NextResponse.json({
            ...newTenant,
            authUserCreated,
            authWarning: authWarning || undefined,
            magicLink: magicLink || undefined,
        }, { status: 201 });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
