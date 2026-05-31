import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getServiceClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) return null;
    return createClient(url, key);
};

// GET /api/users — list all user profiles
export async function GET() {
    const supabase = getServiceClient();
    if (!supabase) {
        return NextResponse.json([
            { id: 'demo-1', name: 'Admin User', email: 'admin@garisphere.com', role: 'Admin', branch: 'Kampala Main', active: true },
            { id: 'demo-2', name: 'Alex T.', email: 'alex@garisphere.com', role: 'Sales', branch: 'Kampala Main', active: true },
            { id: 'demo-3', name: 'Sarah M.', email: 'sarah@garisphere.com', role: 'Sales', branch: 'Jinja Showroom', active: true },
            { id: 'demo-4', name: 'James O.', email: 'james@garisphere.com', role: 'Finance', branch: 'Kampala Main', active: true },
            { id: 'demo-5', name: 'Mike R.', email: 'mike@garisphere.com', role: 'Service', branch: 'Entebbe Hub', active: false },
        ]);
    }
    try {
        const { data, error } = await supabase.from('user_profiles').select('*').order('name');
        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PATCH /api/users/:id — update role/branch/name
export async function PATCH(req: NextRequest) {
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'Service client not configured' }, { status: 503 });
    try {
        const body = await req.json();
        const { id, ...updates } = body;
        if (!id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
        const { data, error } = await supabase.from('user_profiles').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
