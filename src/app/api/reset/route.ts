import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';
import { verifyUserSession } from '../../../lib/auth-server';
import { getTenantId } from '../../../lib/tenant-server';

// Tables to wipe, in dependency order (children before parents)
const RESET_TABLES = [
    'parts_purchase_orders',
    'supplier_transactions',
    'suppliers',
    'appointments',
    'notices',
    'ledger_entries',
    'invoices',
    'deals',
    'compliance_records',
    'repair_orders',
    'shipments',
    'leads',
    'clients',
    'parts_inventory',
    'work_shifts',
    'vehicles',
];

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const { confirmToken } = body;

        // Require explicit confirmation token to prevent accidental resets
        if (confirmToken !== 'RESET_ALL_DATA') {
            return NextResponse.json(
                { error: 'Invalid confirmation token. Send confirmToken: "RESET_ALL_DATA" to proceed.' },
                { status: 400 }
            );
        }

        // Verify session if bearer token is supplied
        const authUser = await verifyUserSession(req);
        if (authUser && authUser.role !== 'Admin') {
            return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
        }

        // Resolve host tenant ID (e.g. for joanrides.garisphere.com)
        const hostTenantId = await getTenantId(req);
        const userTenantId = authUser?.tenantId;

        const targetTenantIds = Array.from(
            new Set([
                hostTenantId,
                userTenantId,
                '00000000-0000-0000-0000-000000000000'
            ].filter(Boolean) as string[])
        );

        const results: Record<string, { deleted: number | null; error?: string }> = {};
        let totalDeleted = 0;

        for (const table of RESET_TABLES) {
            try {
                // Delete records matching target tenant IDs
                const { error, count } = await supabaseAdmin
                    .from(table)
                    .delete({ count: 'exact' })
                    .in('tenant_id', targetTenantIds);

                if (error) {
                    // Try fallback without tenant_id filter if column missing
                    const { count: fallbackCount } = await supabaseAdmin
                        .from(table)
                        .delete({ count: 'exact' })
                        .gte('created_at', '1970-01-01');

                    results[table] = { deleted: fallbackCount ?? 0, error: error.message };
                    totalDeleted += fallbackCount ?? 0;
                } else {
                    results[table] = { deleted: count ?? 0 };
                    totalDeleted += count ?? 0;
                }
            } catch (tableErr: any) {
                results[table] = { deleted: null, error: tableErr.message };
            }
        }

        return NextResponse.json({
            success: true,
            message: `Database reset complete. ${totalDeleted} records removed across ${RESET_TABLES.length} tables.`,
            tenantId: hostTenantId,
            results,
            timestamp: new Date().toISOString(),
        }, { status: 200 });

    } catch (err: any) {
        console.error('[Reset API Error]', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

