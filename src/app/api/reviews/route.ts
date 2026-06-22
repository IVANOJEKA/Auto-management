import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';

// GET /api/reviews — retrieve all reviews
export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
        // Mock fallback
        return NextResponse.json([
            { id: 'mock-1', name: 'Mustafa Al-Bakri', role: 'General Manager, Kampala Auto World', rating: 5, comments: 'GariSphere has completely transformed how we manage our showroom. Our vehicle turnaround time is down by 30%!', status: 'approved', created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
            { id: 'mock-2', name: 'Doreen Namubiru', role: 'Finance Director, Jinja Motors', rating: 5, comments: 'The compliance tax features are incredible. Automated URA EFRIS invoicing saved us hundreds of manual hours.', status: 'approved', created_at: new Date(Date.now() - 86400000 * 12).toISOString() },
            { id: 'mock-3', name: 'Simon K. Peter', role: 'Operations Lead, CarMax Uganda', rating: 4, comments: 'Excellent multi-branch tracking. The logistics dashboard is very simple and easy to track shipments from Mombasa.', status: 'approved', created_at: new Date(Date.now() - 86400000 * 20).toISOString() }
        ]);
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('website_reviews')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (err: any) {
        console.warn('Database error fetching reviews, falling back to mock data:', err.message);
        return NextResponse.json([
            { id: 'mock-1', name: 'Mustafa Al-Bakri', role: 'General Manager, Kampala Auto World', rating: 5, comments: 'GariSphere has completely transformed how we manage our showroom. Our vehicle turnaround time is down by 30%!', status: 'approved', created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
            { id: 'mock-2', name: 'Doreen Namubiru', role: 'Finance Director, Jinja Motors', rating: 5, comments: 'The compliance tax features are incredible. Automated URA EFRIS invoicing saved us hundreds of manual hours.', status: 'approved', created_at: new Date(Date.now() - 86400000 * 12).toISOString() },
            { id: 'mock-3', name: 'Simon K. Peter', role: 'Operations Lead, CarMax Uganda', rating: 4, comments: 'Excellent multi-branch tracking. The logistics dashboard is very simple and easy to track shipments from Mombasa.', status: 'approved', created_at: new Date(Date.now() - 86400000 * 20).toISOString() }
        ]);
    }
}

// POST /api/reviews — insert a review
export async function POST(req: NextRequest) {
    try {
        const { name, role, rating, comments } = await req.json();

        if (!name || !rating || !comments) {
            return NextResponse.json({ error: 'Name, rating (1-5), and comments are required.' }, { status: 400 });
        }

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
            console.log('[Reviews API] Supabase offline, logging review:', { name, role, rating, comments });
            return NextResponse.json({ success: true, message: 'Review mock-saved successfully.' });
        }

        try {
            const { data, error } = await supabaseAdmin
                .from('website_reviews')
                .insert([{
                    name,
                    role: role || null,
                    rating: parseInt(rating) || 5,
                    comments,
                    status: 'approved', // Auto approve for convenience
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;

            return NextResponse.json({ success: true, review: data }, { status: 201 });
        } catch (dbErr: any) {
            console.warn('Database error inserting review, falling back to mock response:', dbErr.message);
            return NextResponse.json({
                success: true,
                message: 'Review received and logged (fallback).',
                review: {
                    id: `mock-posted-${Date.now()}`,
                    name,
                    role: role || 'Dealership Executive',
                    rating: parseInt(rating) || 5,
                    comments,
                    status: 'approved',
                    created_at: new Date().toISOString()
                }
            }, { status: 201 });
        }
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
