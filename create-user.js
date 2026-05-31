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
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('Usage: node create-user.js <email> <password> [name] [role] [branch]');
        console.log('Roles: Admin, Sales, Finance, Service, Logistics');
        console.log('Branches: Kampala Main, Jinja Showroom, Entebbe Hub');
        process.exit(0);
    }

    const email = args[0];
    const password = args[1];
    const name = args[2] || email.split('@')[0];
    const role = args[3] || 'Admin';
    const branch = args[4] || 'Kampala Main';

    console.log(`Creating user: ${email} (${name}) with role: ${role}, branch: ${branch}...`);

    // Create user in auth.users
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role, branch }
    });

    if (createError) {
        console.error('Error creating user:', createError.message);
        process.exit(1);
    }

    console.log('✓ Auth user created successfully inside Supabase auth.users!');
    
    // Now verify profile is inserted (the trigger handles this, but let's double check or insert it manually to be safe)
    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.user.id)
        .single();

    if (profileError || !profile) {
        console.log('Warning: Profile not found. Trigger might not have fired or is missing. Inserting manually...');
        const { error: insertError } = await supabase
            .from('user_profiles')
            .insert({
                id: user.user.id,
                name,
                role,
                branch
            });

        if (insertError) {
            console.error('Error inserting profile manually:', insertError.message);
            process.exit(1);
        }
        console.log('✓ Profile inserted manually into user_profiles.');
    } else {
        console.log('✓ Profile verified in user_profiles table (auto-created by trigger).');
    }

    console.log('\nSuccess! You can now log in with:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
}

main().catch(err => {
    console.error('Unhandled exception:', err);
});
