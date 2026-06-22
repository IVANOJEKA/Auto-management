import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';
import { verifyUserSession } from '../../../lib/auth-server';

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
        const user = await verifyUserSession(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (user.role !== 'Admin') {
            return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
        }
        const tenantId = user.tenantId;

        const body = await req.json().catch(() => ({}));
        const { confirmToken } = body;

        // Require explicit confirmation token to prevent accidental resets
        if (confirmToken !== 'RESET_ALL_DATA') {
            return NextResponse.json(
                { error: 'Invalid confirmation token. Send confirmToken: "RESET_ALL_DATA" to proceed.' },
                { status: 400 }
            );
        }

        const results: Record<string, { deleted: number | null; error?: string }> = {};
        let hasError = false;

        for (const table of RESET_TABLES) {
            try {
                const { error, count } = await supabaseAdmin
                    .from(table)
                    .delete({ count: 'exact' })
                    .eq('tenant_id', tenantId);

                if (error) {
                    results[table] = { deleted: null, error: error.message };
                    hasError = true;
                } else {
                    results[table] = { deleted: count ?? 0 };
                }
            } catch (tableErr: any) {
                results[table] = { deleted: null, error: tableErr.message };
                hasError = true;
            }
        }

        const totalDeleted = Object.values(results).reduce(
            (sum, r) => sum + (r.deleted ?? 0),
            0
        );

        return NextResponse.json({
            success: !hasError,
            message: hasError
                ? 'Data reset completed with some errors. See results for details.'
                : `Database reset complete. ${totalDeleted} records removed across ${RESET_TABLES.length} tables.`,
            tenantId,
            results,
            timestamp: new Date().toISOString(),
        }, { status: hasError ? 207 : 200 });

    } catch (err: any) {
        console.error('[Reset API Error]', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
