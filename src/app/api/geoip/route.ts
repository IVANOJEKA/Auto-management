import { NextResponse } from 'next/server';

/**
 * Server-side GeoIP proxy.
 * ipapi.co does NOT send CORS headers to browser requests, so we proxy
 * the call through Next.js so the fetch happens server-to-server.
 */
export async function GET() {
    try {
        const res = await fetch('https://ipapi.co/json/', {
            headers: { 'User-Agent': 'GariSphere-DMS/1.0' },
            next: { revalidate: 0 }, // never cache — each visitor has a different IP
        });

        if (!res.ok) {
            return NextResponse.json({ error: 'GeoIP lookup failed' }, { status: res.status });
        }

        const data = await res.json();

        // Forward only the fields we actually need
        return NextResponse.json({
            ip: data.ip || '',
            city: data.city || '',
            country_name: data.country_name || '',
            country_code: data.country_code || '',
        });
    } catch (err: any) {
        console.error('GeoIP proxy error:', err?.message || err);
        return NextResponse.json({ error: 'GeoIP service unreachable' }, { status: 503 });
    }
}
