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
    console.log("Checking columns in 'user_profiles' table...");
    
    // Test selecting all columns first
    console.log("\n1. Selecting '*'");
    const { data: d1, error: e1 } = await supabaseAdmin.from('user_profiles').select('*').limit(1);
    console.log("Result:", d1, e1);

    // Test selecting 'email'
    console.log("\n2. Selecting 'email'");
    const { data: d2, error: e2 } = await supabaseAdmin.from('user_profiles').select('email').limit(1);
    console.log("Result:", d2, e2);

    // Test selecting 'active'
    console.log("\n3. Selecting 'active'");
    const { data: d3, error: e3 } = await supabaseAdmin.from('user_profiles').select('active').limit(1);
    console.log("Result:", d3, e3);
}

check();
