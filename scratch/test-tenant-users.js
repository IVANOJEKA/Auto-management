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
const tenantId = 'c2ac2a1a-504a-4f74-9059-e0c986cdf16a';

async function test() {
    console.log("=== Supabase Connection Test ===");
    console.log("URL:", env.NEXT_PUBLIC_SUPABASE_URL);

    // 1. Check if we can fetch user_profiles
    console.log("\n1. Querying first row of user_profiles to inspect schema:");
    const { data: firstProfile, error: profileErr } = await supabase.from('user_profiles').select('*').limit(1);
    if (profileErr) {
        console.error("❌ Error fetching user_profiles:", profileErr);
    } else {
        console.log("✅ Success! Sample profile:", firstProfile);
        if (firstProfile && firstProfile.length > 0) {
            console.log("Columns:", Object.keys(firstProfile[0]));
        } else {
            console.log("No profiles exist yet.");
        }
    }

    // 2. Query user_profiles by tenant_id
    console.log(`\n2. Querying user_profiles for tenant_id = ${tenantId}:`);
    const { data: tenantProfiles, error: tenantProfilesErr } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('tenant_id', tenantId);
    if (tenantProfilesErr) {
        console.error("❌ Error fetching tenant profiles:", tenantProfilesErr);
    } else {
        console.log("✅ Success! Tenant profiles count:", tenantProfiles.length);
        console.log("Profiles:", tenantProfiles);
    }

    // 3. Query tenants table
    console.log(`\n3. Querying tenant details:`);
    const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .maybeSingle();
    if (tenantErr) {
        console.error("❌ Error fetching tenant:", tenantErr);
    } else {
        console.log("✅ Success! Tenant details:", tenant);
    }
}

test();
