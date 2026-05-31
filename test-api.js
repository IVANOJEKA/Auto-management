const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        let val = match[2] || '';
        env[match[1]] = val.trim();
    }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const BASE = 'http://localhost:3000';

async function req(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    try {
        const res = await fetch(BASE + path, opts);
        const json = await res.json().catch(() => ({}));
        return { status: res.status, data: json };
    } catch (e) {
        return { status: 0, error: e.message };
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('  AutoSphere DMS — Full API Module Test');
    console.log('='.repeat(60));
    let pass = 0, fail = 0;

    const test = (name, ok, detail) => {
        if (ok) { console.log(`  ✅ ${name}`); pass++; }
        else { console.log(`  ❌ ${name}: ${detail}`); fail++; }
    };

    // ── VEHICLES ───────────────────────────────────────────────
    console.log('\n📦 Vehicles');
    let r = await req('GET', '/api/vehicles');
    test('GET /api/vehicles', r.status === 200 && Array.isArray(r.data), JSON.stringify(r));

    r = await req('POST', '/api/vehicles', {
        vin: 'TEST-VIN-001', make: 'Tesla', model: 'Model S', year: 2024,
        color: 'Pearl White', price: '$90,000', cost: '$75,000', mileage: 0,
        status: 'In Stock', branch: 'Kampala Main', source: 'Shipped'
    });
    const vehicleId = r.data?.id;
    test('POST /api/vehicles', r.status === 201 && vehicleId, JSON.stringify(r));

    if (vehicleId) {
        r = await req('PATCH', `/api/vehicles/${vehicleId}`, { status: 'Reserved' });
        test('PATCH /api/vehicles/[id]', r.status === 200, JSON.stringify(r));
        r = await req('DELETE', `/api/vehicles/${vehicleId}`, {});
        test('DELETE /api/vehicles/[id]', r.status === 200, JSON.stringify(r));
    }

    // ── LEADS ───────────────────────────────────────────────────
    console.log('\n👤 Leads');
    r = await req('GET', '/api/leads');
    test('GET /api/leads', r.status === 200 && Array.isArray(r.data), JSON.stringify(r));

    r = await req('POST', '/api/leads', {
        name: 'Test Lead', phone: '+256700000000', email: 'test@lead.com',
        interest: 'BMW X5', status: 'Hot', branch: 'Kampala Main'
    });
    const leadId = r.data?.id;
    test('POST /api/leads', r.status === 201 && leadId, JSON.stringify(r));

    if (leadId) {
        r = await req('PATCH', `/api/leads/${leadId}`, { status: 'Cold' });
        test('PATCH /api/leads/[id]', r.status === 200, JSON.stringify(r));
        // cleanup
        await supabase.from('leads').delete().eq('id', leadId);
    }

    // ── CLIENTS ─────────────────────────────────────────────────
    console.log('\n🧑 Clients');
    r = await req('GET', '/api/clients');
    test('GET /api/clients', r.status === 200 && Array.isArray(r.data), JSON.stringify(r));

    r = await req('POST', '/api/clients', {
        name: 'Test Client', phone: '+256700000001', email: 'test@client.com',
        purchases: 0, tv: '$0', kyc: 'Pending', branch: 'Kampala Main'
    });
    const clientId = r.data?.id;
    test('POST /api/clients', r.status === 201 && clientId, JSON.stringify(r));

    if (clientId) {
        r = await req('PATCH', `/api/clients/${clientId}`, { kyc: 'Verified' });
        test('PATCH /api/clients/[id]', r.status === 200, JSON.stringify(r));
        await supabase.from('clients').delete().eq('id', clientId);
    }

    // ── DEALS ───────────────────────────────────────────────────
    console.log('\n💰 Deals');
    r = await req('GET', '/api/deals');
    test('GET /api/deals', r.status === 200 && Array.isArray(r.data), JSON.stringify(r));

    r = await req('POST', '/api/deals', {
        date: 'Today', client: 'Test Client', vehicle: '2024 Tesla Model S',
        salePrice: '$90,000', margin: '$15,000', commission: '$1,500',
        agent: 'Test Agent', status: 'Closed', branch: 'Kampala Main'
    });
    const dealId = r.data?.id;
    test('POST /api/deals', r.status === 201 && dealId, JSON.stringify(r));
    if (dealId) await supabase.from('deals').delete().eq('id', dealId);

    // ── INVOICES ────────────────────────────────────────────────
    console.log('\n🧾 Invoices');
    r = await req('GET', '/api/invoices');
    test('GET /api/invoices', r.status === 200 && Array.isArray(r.data), JSON.stringify(r));

    r = await req('POST', '/api/invoices', {
        date: 'Today', client: 'Test Client', amount: '$90,000',
        type: 'Vehicle Sale', status: 'Pending Finance', branch: 'Kampala Main'
    });
    const invoiceId = r.data?.id;
    test('POST /api/invoices', r.status === 201 && invoiceId, JSON.stringify(r));
    if (invoiceId) {
        r = await req('PATCH', `/api/invoices/${invoiceId}`, { status: 'Paid' });
        test('PATCH /api/invoices/[id]', r.status === 200, JSON.stringify(r));
        await supabase.from('invoices').delete().eq('id', invoiceId);
    }

    // ── SHIPMENTS ───────────────────────────────────────────────
    console.log('\n🚢 Shipments');
    r = await req('GET', '/api/shipments');
    test('GET /api/shipments', r.status === 200 && Array.isArray(r.data), JSON.stringify(r));

    r = await req('POST', '/api/shipments', {
        vehicle: '2024 Tesla Model S', from: 'Yokohama, JP', eta: '2026-08-01',
        status: 'Awaiting Vessel', cost: '$4,200', vessel: 'Test Vessel',
        branch: 'Entebbe Hub'
    });
    const shipmentId = r.data?.id;
    test('POST /api/shipments', r.status === 201 && shipmentId, JSON.stringify(r));
    if (shipmentId) {
        r = await req('PATCH', `/api/shipments/${shipmentId}`, { status: 'At Sea' });
        test('PATCH /api/shipments/[id]', r.status === 200, JSON.stringify(r));
        await supabase.from('shipments').delete().eq('id', shipmentId);
    }

    // ── REPAIR ORDERS ───────────────────────────────────────────
    console.log('\n🔧 Repair Orders');
    r = await req('GET', '/api/repair-orders');
    test('GET /api/repair-orders', r.status === 200 && Array.isArray(r.data), JSON.stringify(r));

    r = await req('POST', '/api/repair-orders', {
        vehicle: '2023 Porsche 911', client: 'Test Client', issue: 'AC not working',
        technician: 'Mike R.', status: 'In Bay', due: 'Today, 5:00 PM',
        laborHours: 2.5, parts: 'AC compressor', cost: '$850', branch: 'Kampala Main'
    });
    const roId = r.data?.ro;
    test('POST /api/repair-orders', r.status === 201 && roId, JSON.stringify(r));
    if (roId) {
        r = await req('PATCH', `/api/repair-orders/${roId}`, { status: 'Completed' });
        test('PATCH /api/repair-orders/[ro]', r.status === 200, JSON.stringify(r));
        await supabase.from('repair_orders').delete().eq('ro', roId);
    }

    // ── COMPLIANCE ──────────────────────────────────────────────
    console.log('\n📋 Compliance');
    r = await req('GET', '/api/compliance');
    test('GET /api/compliance', r.status === 200 && Array.isArray(r.data), JSON.stringify(r));

    // ── PARTS ───────────────────────────────────────────────────
    console.log('\n🔩 Parts Inventory');
    r = await req('GET', '/api/parts');
    test('GET /api/parts', r.status === 200 && Array.isArray(r.data), JSON.stringify(r));

    // ── LEDGER ──────────────────────────────────────────────────
    console.log('\n📊 Ledger');
    r = await req('GET', '/api/ledger');
    test('GET /api/ledger', r.status === 200 && Array.isArray(r.data), JSON.stringify(r));

    r = await req('POST', '/api/ledger', {
        entries: [{
            accountId: '4000', accountName: 'Test Revenue', type: 'Revenue',
            amount: 1000, entryType: 'Credit', description: 'API test entry',
            branch: 'Kampala Main'
        }]
    });
    test('POST /api/ledger', r.status === 201, JSON.stringify(r));
    // cleanup
    await supabase.from('ledger_entries').delete().eq('description', 'API test entry');

    // ── SUMMARY ─────────────────────────────────────────────────
    console.log('\n' + '='.repeat(60));
    const total = pass + fail;
    console.log(`  Results: ${pass}/${total} tests passed`);
    if (fail === 0) {
        console.log('  🎉 ALL MODULES FULLY FUNCTIONAL!');
    } else {
        console.log(`  ⚠️  ${fail} test(s) failed — check above for details`);
    }
    console.log('='.repeat(60));
}

main().catch(err => console.error('Test runner error:', err));
