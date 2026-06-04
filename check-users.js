const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

async function run() {
    console.log("Listing all users from Supabase Auth and matching them with Profiles...");
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error("Auth error:", authError.message);
        return;
    }

    const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('*');
    if (profileError) {
        console.error("Profiles error:", profileError.message);
        return;
    }

    console.log("\n--- Supabase Auth Users ---");
    users.forEach(u => {
        const p = profiles.find(profile => profile.id === u.id);
        console.log(`Email: ${u.email}`);
        console.log(`  ID:   ${u.id}`);
        if (p) {
            console.log(`  Name: ${p.name}`);
            console.log(`  Role: ${p.role}`);
            console.log(`  Branch: ${p.branch}`);
        } else {
            console.log(`  Profile: NOT FOUND`);
        }
        console.log("-".repeat(30));
    });
}

run();
