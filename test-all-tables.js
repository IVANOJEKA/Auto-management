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
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        env[match[1]] = val.trim();
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const tables = [
    'vehicles', 'leads', 'clients', 'deals', 'compliance_records',
    'repair_orders', 'invoices', 'shipments', 'parts_inventory',
    'ledger_entries', 'user_profiles', 'appointments', 'notices',
    'suppliers', 'supplier_transactions', 'parts_purchase_orders', 'parts_purchase_order_items'
];

async function check() {
    console.log('Checking tables in Supabase database...');
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`❌ Table '${table}': ERROR - ${error.message} (Code: ${error.code})`);
        } else {
            console.log(`✅ Table '${table}': EXISTS`);
        }
    }
}

check();
