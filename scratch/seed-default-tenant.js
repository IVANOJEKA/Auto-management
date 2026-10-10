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

async function seed() {
    console.log("Seeding default tenant in 'tenants' table...");
    try {
        const { data, error } = await supabaseAdmin.from('tenants').upsert([{
            id: '00000000-0000-0000-0000-000000000000',
            name: 'GariSphere Group',
            subdomain: 'garisphere',
            plan: 'enterprise',
            status: 'active',
            branches: ["Kampala Main", "Jinja Showroom", "Entebbe Hub"]
        }]);
        if (error) {
            console.error("❌ Error seeding default tenant:", error);
        } else {
            console.log("✅ Success! Default tenant seeded.");
        }
    } catch (err) {
        console.error("Exception:", err);
    }
}

seed();
