const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
let supabaseUrl = '';
let supabaseServiceKey = '';

try {
    const envPath = path.join(__dirname, '.env.local');
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

console.log("Supabase URL parsed:", supabaseUrl);
console.log("Service Key parsed starts with:", supabaseServiceKey ? supabaseServiceKey.substring(0, 15) + "..." : "undefined");

if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('your_supabase')) {
    console.error("Missing or invalid credentials in .env.local!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
    try {
        console.log("Testing connection...");
        const { data, error } = await supabase.from('vehicles').select('*').limit(1);
        if (error) {
            console.error("Database connection error details:", error);
        } else {
            console.log("Successfully connected to Supabase! Data fetched:", data);
        }
    } catch (e) {
        console.error("Unexpected script execution error:", e.message);
    }
}

test();
