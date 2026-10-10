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

async function inspect() {
    console.log("=== Inspecting DB Triggers on auth.users ===");
    try {
        console.log("Calling inspect_triggers RPC...");
        try {
            const { data, error } = await supabaseAdmin.rpc('inspect_triggers');
            console.log("inspect_triggers RPC result:", data, error);
        } catch (e) {
            console.log("inspect_triggers RPC error:", e.message);
        }

        console.log("\nTrying to query pg_trigger directly...");
        try {
            const { data, error } = await supabaseAdmin.from('pg_trigger').select('*').limit(1);
            console.log("pg_trigger query result:", data, error);
        } catch (e) {
            console.log("pg_trigger query error:", e.message);
        }

    } catch (err) {
        console.error("Exception:", err);
    }
}

inspect();
