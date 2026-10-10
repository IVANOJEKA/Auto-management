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
    console.log('Updating user_profiles for admin@garisphere.com to role Admin...');
    const { data, error } = await s
        .from('user_profiles')
        .update({ role: 'Admin' })
        .eq('id', 'c3ce5c46-7e22-4e9b-9e21-ae9e26f466e4')
        .select();

    if (error) {
        console.error('Error updating profile:', error);
    } else {
        console.log('Successfully updated profile:', data);
    }
}

main().catch(console.error);
