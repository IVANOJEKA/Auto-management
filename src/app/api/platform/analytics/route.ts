import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';
import { cookies } from 'next/headers';

async function checkPlatformAuth(): Promise<boolean> {
    const cookieStore = await cookies();
    return cookieStore.get('platform_admin_session')?.value === 'authenticated';
}

export async function GET(req: NextRequest) {
    if (!await checkPlatformAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Mock visitor generator for local development or fallback
    const mockVisitors = [
        { id: 'v-1', name: 'Anonymous (197.239.5.42)', location: 'Kampala, Uganda', device_type: 'Mobile', duration: '6m 15s', path: '/', created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
        { id: 'v-2', name: 'Sarah Namagembe', location: 'Entebbe, Uganda', device_type: 'Desktop', duration: '14m 20s', path: '/pricing', created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString() },
        { id: 'v-3', name: 'Anonymous (41.210.12.8)', location: 'Nairobi, Kenya', device_type: 'Tablet', duration: '2m 10s', path: '/', created_at: new Date(Date.now() - 1000 * 60 * 65).toISOString() },
        { id: 'v-4', name: 'Mustafa Al-Bakri', location: 'Kampala, Uganda', device_type: 'Desktop', duration: '32m 45s', path: '/features', created_at: new Date(Date.now() - 1000 * 3600 * 3).toISOString() },
        { id: 'v-5', name: 'Anonymous (102.89.2.17)', location: 'Lagos, Nigeria', device_type: 'Mobile', duration: '1m 40s', path: '/', created_at: new Date(Date.now() - 1000 * 3600 * 5).toISOString() },
        { id: 'v-6', name: 'John K. Orua', location: 'Mombasa, Kenya', device_type: 'Mobile', duration: '8m 12s', path: '/demo-hub', created_at: new Date(Date.now() - 1000 * 3600 * 12).toISOString() },
        { id: 'v-7', name: 'Anonymous (82.165.19.121)', location: 'London, United Kingdom', device_type: 'Desktop', duration: '12m 05s', path: '/pricing', created_at: new Date(Date.now() - 1000 * 3600 * 24).toISOString() },
        { id: 'v-8', name: 'Doreen Namubiru', location: 'Jinja, Uganda', device_type: 'Tablet', duration: '18m 50s', path: '/faq', created_at: new Date(Date.now() - 1000 * 3600 * 36).toISOString() }
    ];

    const mockDemoRequests = [
        { id: 'd-1', name: 'Patrick Lwanga', email: 'patrick@lwangamotors.com', phone: '+256 701 456789', message: 'Interested in professional plan with multi-branch synchronization for 3 branches in Kampala.', source: 'landing_page', status: 'Pending', created_at: new Date(Date.now() - 1000 * 3600 * 2).toISOString() },
        { id: 'd-2', name: 'Elizabeth K.', email: 'liz@premiumcars.ke', phone: '+254 712 987654', message: 'Would like a demo of the import logistics tracking and shipping calculation features.', source: 'landing_page', status: 'Contacted', created_at: new Date(Date.now() - 1000 * 3600 * 18).toISOString() },
        { id: 'd-3', name: 'Emma Watson', email: 'emma@watsonauto.ug', phone: '+256 772 333444', message: 'Testing GariSphere for our corporate fleet management office.', source: 'landing_page', status: 'Completed', created_at: new Date(Date.now() - 1000 * 3600 * 72).toISOString() }
    ];

    const mockReviews = [
        { id: 'r-1', name: 'Mustafa Al-Bakri', role: 'General Manager, Kampala Auto World', rating: 5, comments: 'GariSphere has completely transformed how we manage our showroom. Our vehicle turnaround time is down by 30%!', status: 'approved', created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
        { id: 'r-2', name: 'Doreen Namubiru', role: 'Finance Director, Jinja Motors', rating: 5, comments: 'The compliance tax features are incredible. Automated URA EFRIS invoicing saved us hundreds of manual hours.', status: 'approved', created_at: new Date(Date.now() - 86400000 * 12).toISOString() },
        { id: 'r-3', name: 'Simon K. Peter', role: 'Operations Lead, CarMax Uganda', rating: 4, comments: 'Excellent multi-branch tracking. The logistics dashboard is very simple and easy to track shipments from Mombasa.', status: 'approved', created_at: new Date(Date.now() - 86400000 * 20).toISOString() }
    ];

    if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
        return NextResponse.json({
            visitors: mockVisitors,
            demoRequests: mockDemoRequests,
            reviews: mockReviews,
            deviceDistribution: { Mobile: 3, Desktop: 3, Tablet: 2 },
            locationDistribution: { Uganda: 5, Kenya: 2, Nigeria: 1 }
        });
    }

    try {
        // Query Supabase tables with error handling fallback to mock data
        let visitors = [];
        let demoRequests = [];
        let reviews = [];

        // 1. Fetch visitors
        try {
            const { data, error } = await supabaseAdmin
                .from('website_visitors')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            if (!error && data) {
                visitors = data;
            } else {
                visitors = mockVisitors;
            }
        } catch {
            visitors = mockVisitors;
        }

        // 2. Fetch demo requests (contact_inquiries)
        try {
            const { data, error } = await supabaseAdmin
                .from('contact_inquiries')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error && data) {
                demoRequests = data.map(d => ({
                    ...d,
                    status: d.status || 'Pending' // fallback status
                }));
            } else {
                demoRequests = mockDemoRequests;
            }
        } catch {
            demoRequests = mockDemoRequests;
        }

        // 3. Fetch reviews
        try {
            const { data, error } = await supabaseAdmin
                .from('website_reviews')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error && data) {
                reviews = data;
            } else {
                reviews = mockReviews;
            }
        } catch {
            reviews = mockReviews;
        }

        // Compute distributions dynamically from visitors
        const deviceDistribution: Record<string, number> = {};
        const locationDistribution: Record<string, number> = {};

        visitors.forEach(v => {
            const dev = v.device_type || 'Desktop';
            deviceDistribution[dev] = (deviceDistribution[dev] || 0) + 1;

            const loc = v.location ? v.location.split(', ').pop() || 'Other' : 'Other';
            locationDistribution[loc] = (locationDistribution[loc] || 0) + 1;
        });

        return NextResponse.json({
            visitors,
            demoRequests,
            reviews,
            deviceDistribution,
            locationDistribution
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PATCH /api/platform/analytics — update demo status or review status
export async function PATCH(req: NextRequest) {
    if (!await checkPlatformAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { type, id, status } = body; // type is 'demo' or 'review'

        if (!type || !id || !status) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
            return NextResponse.json({ success: true, message: 'Mock updated successfully.' });
        }

        if (type === 'demo') {
            const { data, error } = await supabaseAdmin
                .from('contact_inquiries')
                .update({ status })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return NextResponse.json({ success: true, data });
        } else if (type === 'review') {
            const { data, error } = await supabaseAdmin
                .from('website_reviews')
                .update({ status })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return NextResponse.json({ success: true, data });
        }

        return NextResponse.json({ error: 'Invalid operation type' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
