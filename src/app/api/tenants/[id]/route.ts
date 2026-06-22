import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';
import { cookies } from 'next/headers';

async function checkPlatformAuth(): Promise<boolean> {
    const cookieStore = await cookies();
    return cookieStore.get('platform_admin_session')?.value === 'authenticated';
}

const CASCADE_TABLES = [
    'ledger_entries',
    'invoices',
    'deals',
    'compliance_records',
    'repair_orders',
    'shipments',
    'leads',
    'clients',
    'vehicles',
    'user_profiles'
];

// PATCH /api/tenants/[id] — Update a tenant's name, plan, status, or owner email
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    if (!await checkPlatformAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await context.params;
        const body = await req.json();
        const { name, plan, status, owner_email, modules, billing, branches } = body;

        // Build update payload dynamically
        const updatePayload: any = { updated_at: new Date().toISOString() };
        if (name !== undefined) updatePayload.name = name;
        if (plan !== undefined) updatePayload.plan = plan;
        if (status !== undefined) updatePayload.status = status;
        if (owner_email !== undefined) updatePayload.owner_email = owner_email;
        if (modules !== undefined) updatePayload.modules = modules;
        if (billing !== undefined) updatePayload.billing = billing;
        if (branches !== undefined) updatePayload.branches = branches;

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
            return NextResponse.json({
                id,
                name: name !== undefined ? name : 'Mock Dealership',
                subdomain: 'mock-subdomain',
                plan: plan !== undefined ? plan : 'starter',
                status: status !== undefined ? status : 'active',
                owner_email: owner_email !== undefined ? owner_email : 'owner@mock.com',
                modules: modules !== undefined ? modules : ["dashboard", "inventory", "logistics", "crm", "sales", "appointments", "quotes", "suppliers", "compliance", "service", "parts", "notifications", "finance", "reports"],
                billing: billing !== undefined ? billing : { billing_plan: plan || 'starter', billing_status: status || 'active', billing_cycle: 'monthly', billing_amount: '$49', next_bill_date: '2026-07-19', invoices: [] },
                updated_at: new Date().toISOString()
            });
        }

        const { data: updatedTenant, error } = await supabaseAdmin
            .from('tenants')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(updatedTenant);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE /api/tenants/[id] — Delete tenant and cascade wipe all its workspace data
export async function DELETE(
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
            console.log(`[Tenants API] Mock delete tenant ${id} successful.`);
            return NextResponse.json({
                success: true,
                message: 'Tenant and all associated data successfully deleted (mock).'
            });
        }

        // 1. Wipe all data for this tenant across all tables
        const results: Record<string, { deleted: number | null; error?: string }> = {};
        for (const table of CASCADE_TABLES) {
            try {
                const { error, count } = await supabaseAdmin
                    .from(table)
                    .delete({ count: 'exact' })
                    .eq('tenant_id', id);

                if (error) {
                    results[table] = { deleted: null, error: error.message };
                } else {
                    results[table] = { deleted: count ?? 0 };
                }
            } catch (tableErr: any) {
                results[table] = { deleted: null, error: tableErr.message };
            }
        }

        // 2. Delete the tenant record itself
        const { error: tenantDeleteError } = await supabaseAdmin
            .from('tenants')
            .delete()
            .eq('id', id);

        if (tenantDeleteError) {
            return NextResponse.json({
                error: `Workspace data wiped, but failed to delete tenant row: ${tenantDeleteError.message}`,
                results
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Tenant and all associated data successfully deleted.',
            results
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
