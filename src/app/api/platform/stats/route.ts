import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';
import { cookies } from 'next/headers';

async function checkPlatformAuth(): Promise<boolean> {
    const cookieStore = await cookies();
    return cookieStore.get('platform_admin_session')?.value === 'authenticated';
}

export async function GET(req: NextRequest) {
    if (!await checkPlatformAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
        return NextResponse.json({
            tenants: [
                { id: 'demo-1', name: 'GariSphere Demo', subdomain: 'garisphere', plan: 'enterprise', status: 'active', created_at: new Date().toISOString(), userCount: 5, vehicleCount: 42, dealCount: 18 },
                { id: 'demo-2', name: 'Tesla Auto Group', subdomain: 'tesla', plan: 'professional', status: 'active', created_at: new Date(Date.now() - 86400000 * 10).toISOString(), userCount: 3, vehicleCount: 28, dealCount: 9 },
                { id: 'demo-3', name: 'Toyota Dealership', subdomain: 'toyota', plan: 'starter', status: 'active', created_at: new Date(Date.now() - 86400000 * 5).toISOString(), userCount: 2, vehicleCount: 15, dealCount: 4 },
            ],
            summary: { totalTenants: 3, totalUsers: 10, totalVehicles: 85, totalDeals: 31, newThisMonth: 2 },
            health: { database: 'offline', api: 'ok', uptime: '99.9%' }
        });
    }

    try {
        // Fetch all tenants
        const { data: tenants, error: tenantsError } = await supabaseAdmin
            .from('tenants')
            .select('*')
            .order('created_at', { ascending: false });

        if (tenantsError) throw tenantsError;

        // Cross-tenant aggregate counts
        const [
            { count: totalUsers },
            { count: totalVehicles },
            { count: totalDeals },
        ] = await Promise.all([
            supabaseAdmin.from('user_profiles').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('vehicles').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('deals').select('*', { count: 'exact', head: true }),
        ]);

        // Enrich each tenant with its own counts
        const enrichedTenants = await Promise.all(
            (tenants || []).map(async (tenant) => {
                const [{ count: userCount }, { count: vehicleCount }, { count: dealCount }] = await Promise.all([
                    supabaseAdmin.from('user_profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
                    supabaseAdmin.from('vehicles').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
                    supabaseAdmin.from('deals').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
                ]);
                return { ...tenant, userCount: userCount || 0, vehicleCount: vehicleCount || 0, dealCount: dealCount || 0 };
            })
        );

        const thisMonthStart = new Date();
        thisMonthStart.setDate(1);
        thisMonthStart.setHours(0, 0, 0, 0);
        const newThisMonth = (tenants || []).filter(t => new Date(t.created_at) >= thisMonthStart).length;

        return NextResponse.json({
            tenants: enrichedTenants,
            summary: {
                totalTenants: tenants?.length || 0,
                totalUsers: totalUsers || 0,
                totalVehicles: totalVehicles || 0,
                totalDeals: totalDeals || 0,
                newThisMonth,
            },
            health: { database: 'connected', api: 'ok', uptime: '99.9%' }
        });
    } catch (err: any) {
        const errMsg = err.message || '';
        if (
            errMsg.includes('relation "tenants" does not exist') ||
            errMsg.includes('Could not find the table') ||
            errMsg.includes('tenant_id does not exist') ||
            errMsg.includes('tenant_id')
        ) {
            const sqlMigration = `-- ============================================================
-- AutoSphere DMS — Multi-Tenant Migration SQL
-- Run this script in the Supabase SQL Editor to enable tenant management
-- ============================================================

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'enterprise')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    owner_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Seed default tenant
INSERT INTO tenants (id, name, subdomain, plan, status)
VALUES ('00000000-0000-0000-0000-000000000000', 'GariSphere Group', 'garisphere', 'enterprise', 'active')
ON CONFLICT (id) DO NOTHING;

-- 3. Add tenant_id column to existing tables (with default linking to GariSphere Group)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE compliance_records ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE repair_orders ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE parts_inventory ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000';
`;
            return NextResponse.json({
                migrationRequired: true,
                sql: sqlMigration,
                error: errMsg
            });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
