import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, phone, email, message } = body;

        if (!name || !email || !message) {
            return NextResponse.json({ error: 'Name, email, and message are required.' }, { status: 400 });
        }

        // Try to save to Supabase if available
        try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            if (supabaseUrl && supabaseKey) {
                const supabase = createClient(supabaseUrl, supabaseKey);
                await supabase.from('contact_inquiries').insert([{
                    name,
                    phone: phone || null,
                    email,
                    message,
                    source: 'landing_page',
                    created_at: new Date().toISOString(),
                }]);
            }
        } catch {
            // Supabase unavailable or table doesn't exist — log and continue
            console.log('[Contact API] Supabase unavailable, logging inquiry locally:', { name, email, phone, message });
        }

        return NextResponse.json({ success: true, message: 'Inquiry received. We will get back to you within 24 hours.' });
    } catch (err) {
        console.error('[Contact API] Error:', err);
        return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
    }
}
