import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, location, device_type, duration, path } = body;

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
            console.log('[Visitors API] Mock visitor logged:', body);
            return NextResponse.json({ success: true, message: 'Mock visitor logged successfully.' });
        }

        const { data, error } = await supabaseAdmin
            .from('website_visitors')
            .insert([{
                name: name || 'Anonymous',
                location: location || 'Unknown',
                device_type: device_type || 'Desktop',
                duration: duration || '1m',
                path: path || '/',
                created_at: new Date().toISOString()
            }])
            .select();

        if (error) {
            console.error('Error inserting visitor telemetry:', error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: data?.[0] }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
