const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let supabaseUrl = '';
let supabaseServiceKey = '';

try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
            const [key, ...valueParts] = trimmed.split('=');
            const val = valueParts.join('=').trim();
            if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
            if (key.trim() === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = val;
        }
    }
} catch (e) {
    console.error("Failed to read .env.local:", e.message);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    console.log("Checking if appointments table exists...");
    const { data: apts, error: aptErr } = await supabase.from('appointments').select('*').limit(1);
    console.log("appointments table result:", { data: apts, error: aptErr });

    console.log("Checking if team_notices or notices table exists...");
    const { data: notes, error: notesErr } = await supabase.from('notices').select('*').limit(1);
    console.log("notices table result:", { data: notes, error: notesErr });
}

check();
