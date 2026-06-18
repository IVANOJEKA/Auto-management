import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';

type RouteContext = { params: Promise<{ clientId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
    try {
        const { clientId } = await context.params;

        // 1. Fetch client details
        const { data: client, error: clientError } = await supabaseAdmin
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .maybeSingle();

        if (clientError || !client) {
            return NextResponse.json({ error: 'Client portal not found' }, { status: 404 });
        }

        const clientName = client.name;
        const tenantId = client.tenant_id;

        // 2. Fetch tenant name
        const { data: tenant } = await supabaseAdmin
            .from('tenants')
            .select('name')
            .eq('id', tenantId)
            .maybeSingle();

        // 3. Fetch related invoices
        const { data: invoices } = await supabaseAdmin
            .from('invoices')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('client', clientName)
            .order('date', { ascending: false });

        // 4. Fetch related deals
        const { data: deals } = await supabaseAdmin
            .from('deals')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('client', clientName)
            .order('date', { ascending: false });

        // 5. Fetch related repair orders
        const { data: repairOrders } = await supabaseAdmin
            .from('repair_orders')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('client', clientName)
            .order('due', { ascending: false });

        // 6. Fetch related ledger deposit entries
        // Filter ledger entries on account_id = '2100' and description matching client name
        const { data: ledger } = await supabaseAdmin
            .from('ledger_entries')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('account_id', '2100');

        const depositEntries = (ledger || []).filter(entry => 
            entry.description && entry.description.toLowerCase().includes(clientName.toLowerCase())
        );

        // 7. Fetch active shipments matching vehicles in the client's deals
        const { data: shipments } = await supabaseAdmin
            .from('shipments')
            .select('*')
            .eq('tenant_id', tenantId);

        // Match shipment vehicle label with the client's deal vehicles
        const dealVehicles = (deals || []).map(d => d.vehicle.toLowerCase());
        const matchedShipments = (shipments || []).filter(ship => 
            dealVehicles.some(vLabel => vLabel.includes(ship.vehicle.toLowerCase()) || ship.vehicle.toLowerCase().includes(vLabel))
        );

        return NextResponse.json({
            clientName,
            branch: client.branch,
            tenantName: tenant?.name || 'GariSphere DMS',
            deals: deals || [],
            invoices: invoices || [],
            repairOrders: repairOrders || [],
            deposits: depositEntries,
            shipments: matchedShipments
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
