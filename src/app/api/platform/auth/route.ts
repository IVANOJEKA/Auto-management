import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
    try {
        const { key } = await req.json();
        const adminKey = process.env.PLATFORM_ADMIN_KEY;

        if (!adminKey) {
            return NextResponse.json({ error: 'Platform admin not configured' }, { status: 503 });
        }

        if (key.trim() !== adminKey.trim()) {
            return NextResponse.json({ error: 'Invalid admin key' }, { status: 401 });
        }

        const response = NextResponse.json({ success: true });
        response.cookies.set('platform_admin_session', 'authenticated', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 8, // 8 hours
            path: '/',
        });
        return response;
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE() {
    const response = NextResponse.json({ success: true });
    response.cookies.set('platform_admin_session', '', { maxAge: 0, path: '/' });
    return response;
}

export async function GET() {
    const cookieStore = await cookies();
    const session = cookieStore.get('platform_admin_session');
    const isAuthenticated = session?.value === 'authenticated';
    return NextResponse.json({ authenticated: isAuthenticated });
}
