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

async function inspect() {
    const { data, error } = await supabase.from('vehicles').select('*').limit(1);
    if (error) {
        console.error("Error fetching vehicles:", error);
    } else if (data && data.length > 0) {
        console.log("Columns in 'vehicles':", Object.keys(data[0]));
    } else {
        // Table is empty, let's try to query table info or insert a dummy to see keys
        console.log("No rows in vehicles table. Let's inspect using postgrest schema query or try inserting.");
        // We can query schema details from postgrest if supported
        const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'vehicles' }).catch(() => ({}));
        console.log("RPC get_table_columns result:", cols, colError);
    }
}

inspect();
