const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
    console.error('Error: .env.local file not found.');
    process.exit(1);
}

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

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env.local.');
    process.exit(1);
}

const supabase = createClient(url, serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function main() {
    console.log('Fetching all users from Supabase Auth...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error('Error fetching users:', listError.message);
        process.exit(1);
    }

    console.log(`Found ${users.length} users in Auth. Syncing profiles...`);

    for (const user of users) {
        const metadata = user.user_metadata || {};
        const name = metadata.name || user.email.split('@')[0];
        const role = metadata.role || 'Admin';
        const branch = metadata.branch || 'Kampala Main';

        const { data: profile, error: fetchError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (fetchError || !profile) {
            console.log(`Syncing profile for ${user.email} (ID: ${user.id})...`);
            const { error: insertError } = await supabase
                .from('user_profiles')
                .insert({
                    id: user.id,
                    name,
                    role,
                    branch
                });

            if (insertError) {
                console.error(`Failed to sync profile for ${user.email}:`, insertError.message);
            } else {
                console.log(`✓ Profile created for ${user.email} (Role: ${role}, Branch: ${branch})`);
            }
        } else {
            console.log(`✓ Profile already exists for ${user.email} (Role: ${profile.role}, Branch: ${profile.branch})`);
        }
    }

    console.log('Sync complete!');
}

main().catch(err => {
    console.error('Unhandled exception:', err);
});
