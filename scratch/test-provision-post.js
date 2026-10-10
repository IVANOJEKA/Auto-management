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
const id = 'dc076357-77eb-4cfd-b904-f71ed9cfce9c';
const email = 'testowner_' + Date.now().toString().slice(-4) + '@garisphere.com';
const password = 'testpassword123';
const name = 'Test Owner';
const role = 'Admin';
const branch = 'Main';

async function test() {
    console.log("Starting mock POST handler run...");
    console.log("Email:", email);

    try {
        // Step 1: Fetch tenant
        console.log("\n1. Fetching tenant details...");
        const { data: tenant, error: tenantErr } = await supabaseAdmin
            .from('tenants')
            .select('name, owner_email')
            .eq('id', id)
            .maybeSingle();
        if (tenantErr) {
            console.error("❌ Error fetching tenant:", tenantErr);
        } else {
            console.log("✅ Success! Tenant:", tenant);
        }

        // Step 2: List users to check if exists
        console.log("\n2. Checking existing users...");
        const listRes = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const allUsers = listRes.data?.users || [];
        const existingAuthUser = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
        console.log("✅ Success! Existing user found:", !!existingAuthUser);

        // Step 3: Create user
        console.log("\n3. Creating auth user...");
        let userId;
        if (existingAuthUser) {
            userId = existingAuthUser.id;
            console.log("Updating existing user...");
            await supabaseAdmin.auth.admin.updateUserById(userId, { password });
        } else {
            console.log("Creating new user...");
            const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: {
                    name: name || 'Admin',
                    role: role || 'Admin',
                    branch: branch || 'Main'
                }
            });
            if (createErr) {
                console.error("❌ Error creating auth user:", createErr);
                return;
            }
            userId = newUser.user.id;
            console.log("✅ Auth user created successfully. ID:", userId);
        }

        // Step 4: Check if profile exists
        console.log("\n4. Checking if profile exists...");
        const { data: existingProfile, error: profileGetErr } = await supabaseAdmin
            .from('user_profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();
        if (profileGetErr) {
            console.error("❌ Error querying user_profiles:", profileGetErr);
        } else {
            console.log("✅ Success! Existing profile:", existingProfile);
        }

        // Step 5: Insert profile if not exists
        if (!existingProfile) {
            console.log("\n5. Inserting user profile...");
            const { data: profileInsert, error: profileErr } = await supabaseAdmin.from('user_profiles').insert([{
                id: userId,
                tenant_id: id,
                name: name || (tenant?.name ? `${tenant.name} Admin` : 'Admin'),
                email,
                role: role || 'Admin',
                branch: branch || 'Main',
                active: true,
            }]).select();
            if (profileErr) {
                console.error("❌ Error inserting user profile:", profileErr);
            } else {
                console.log("✅ Success! Inserted profile:", profileInsert);
            }
        }

        // Step 6: Generate recovery magic link
        console.log("\n6. Generating recovery magic link...");
        let magicLink = null;
        try {
            const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
                type: 'recovery',
                email,
                options: { redirectTo: 'https://garisphere.com/login' }
            });
            if (linkErr) {
                console.error("❌ Error generating recovery link:", linkErr);
            } else if (linkData?.properties?.action_link) {
                magicLink = linkData.properties.action_link;
                console.log("✅ Success! Magic link:", magicLink);
            }
        } catch (e) {
            console.error("Exception during generateLink:", e);
        }

    } catch (err) {
        console.error("❌ Unexpected exception in handler logic:", err);
    }
}

test();
