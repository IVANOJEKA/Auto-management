const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split('\n').forEach(l => {
    const m = l.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m) env[m[1]] = (m[2]||'').replace(/^['"]|['"]$/g, '').trim();
});

const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: usersData } = await s.auth.admin.listUsers();
    const { data: profiles } = await s.from('user_profiles').select('*');
    const { data: vehicles } = await s.from('vehicles').select('*');

    console.log('=== AUTH USERS ===');
    console.log(usersData?.users?.map(u => ({ id: u.id, email: u.email })));

    console.log('=== USER PROFILES ===');
    console.log(profiles);

    console.log('=== VEHICLES COUNT ===');
    console.log(vehicles?.length, 'vehicles');
    if (vehicles?.length) {
        console.log('Sample vehicle:', vehicles[0]);
    }
}

main().catch(console.error);
