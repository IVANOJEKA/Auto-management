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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    console.log("Calling supabase.auth.admin.listUsers...");
    try {
        const res = await supabase.auth.admin.listUsers({ perPage: 1000 });
        if (res.error) {
            console.error("❌ Error listing users:", res.error);
        } else {
            console.log("✅ Success listing users! Total users in auth:", res.data?.users?.length);
            console.log("Sample user:", res.data?.users?.[0]);
        }
    } catch (err) {
        console.error("❌ Exception during listUsers:", err);
    }
}

test();
