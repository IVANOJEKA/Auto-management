import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';
import { verifyUserSession } from '../../../lib/auth-server';

export async function GET(req: NextRequest) {
    try {
        const user = await verifyUserSession(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = user.tenantId;

        // Fetch core data tables concurrently in a single server action
        const [
            vehicles,
            leads,
            clients,
            deals,
            compliance,
            repairOrders,
            invoices,
            shipments,
            parts,
            ledger,
            shifts,
            appointments,
            notices,
            suppliers,
            supplierTransactions,
            partsPurchaseOrders
        ] = await Promise.all([
            supabaseAdmin.from('vehicles').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
            supabaseAdmin.from('leads').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
            supabaseAdmin.from('clients').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
            supabaseAdmin.from('deals').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
            supabaseAdmin.from('compliance_records').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
            supabaseAdmin.from('repair_orders').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
            supabaseAdmin.from('invoices').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
            supabaseAdmin.from('shipments').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
            supabaseAdmin.from('parts_inventory').select('*').eq('tenant_id', tenantId).order('name', { ascending: true }),
            supabaseAdmin.from('ledger_entries').select('*').eq('tenant_id', tenantId).order('date', { ascending: false }),
            supabaseAdmin.from('work_shifts').select('*').eq('tenant_id', tenantId).order('start_time', { ascending: false }),
            supabaseAdmin.from('appointments').select('*').eq('tenant_id', tenantId).order('date', { ascending: false }),
            supabaseAdmin.from('notices').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
            supabaseAdmin.from('suppliers').select('*').eq('tenant_id', tenantId).order('name', { ascending: true }),
            supabaseAdmin.from('supplier_transactions').select('*').eq('tenant_id', tenantId).order('date', { ascending: false }),
            supabaseAdmin.from('parts_purchase_orders').select('*, parts_purchase_order_items(*)').eq('tenant_id', tenantId).order('created_at', { ascending: false })
        ]);

        // Validate if any critical database query failed (ignore missing table code PGRST205 / 42P01 for new tables)
        const isTableMissingError = (err: any) => err && (err.code === 'PGRST205' || err.code === '42P01');

        const errors = [
            { name: 'vehicles', error: vehicles.error },
            { name: 'leads', error: leads.error },
            { name: 'clients', error: clients.error },
            { name: 'deals', error: deals.error },
            { name: 'compliance', error: compliance.error },
            { name: 'repairOrders', error: repairOrders.error },
            { name: 'invoices', error: invoices.error },
            { name: 'shipments', error: shipments.error },
            { name: 'parts', error: parts.error },
            { name: 'ledger', error: ledger.error },
            { name: 'shifts', error: shifts.error },
            { name: 'appointments', error: appointments.error },
            { name: 'notices', error: notices.error },
            { name: 'suppliers', error: suppliers.error },
            { name: 'supplierTransactions', error: supplierTransactions.error },
            { name: 'partsPurchaseOrders', error: partsPurchaseOrders.error }
        ].filter(e => e.error && !isTableMissingError(e.error));

        if (errors.length > 0) {
            console.error('Error bootstrapping data:', errors);
            return NextResponse.json({ error: 'Failed to fetch bootstrap data', details: errors }, { status: 500 });
        }

        return NextResponse.json({
            vehicles: vehicles.data || [],
            leads: leads.data || [],
            clients: clients.data || [],
            deals: deals.data || [],
            compliance: compliance.data || [],
            repairOrders: repairOrders.data || [],
            invoices: invoices.data || [],
            shipments: shipments.data || [],
            parts: parts.data || [],
            ledger: ledger.data || [],
            shifts: shifts.data || [],
            appointments: (appointments.error ? null : appointments.data) || [],
            notices: (notices.error ? null : notices.data) || [],
            suppliers: (suppliers.error ? null : suppliers.data) || [],
            supplierTransactions: (supplierTransactions.error ? null : supplierTransactions.data) || [],
            partsPurchaseOrders: (partsPurchaseOrders.error ? null : partsPurchaseOrders.data) || []
        });
    } catch (err: any) {
        console.error('Bootstrap API Exception:', err?.message || err);
        return NextResponse.json({ error: err?.message || 'Unknown bootstrapping error' }, { status: 500 });
    }
}
