const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
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

const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log("Querying all tenants in 'tenants' table...");
    try {
        const { data, error } = await supabaseAdmin.from('tenants').select('*');
        if (error) {
            console.error("❌ Error fetching tenants:", error);
        } else {
            console.log("✅ Success! Tenants count:", data.length);
            console.log("Tenants:");
            data.forEach(t => {
                console.log(`- ID: ${t.id}, Name: ${t.name}, Subdomain: ${t.subdomain}`);
            });
        }
    } catch (err) {
        console.error("Exception:", err);
    }
}

check();
