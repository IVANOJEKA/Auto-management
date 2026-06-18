import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';
import { verifyUserSession } from '../../../../lib/auth-server';

const BUCKET = 'documents';

export async function DELETE(req: NextRequest) {
    try {
        const user = await verifyUserSession(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { url } = await req.json();
        if (!url) {
            return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
        }

        // Extract the file path from the public URL
        // URL format: https://<project>.supabase.co/storage/v1/object/public/documents/<filename>
        const marker = `/object/public/${BUCKET}/`;
        const idx = url.indexOf(marker);
        if (idx === -1) {
            // URL is not from our Supabase bucket — just skip storage deletion
            return NextResponse.json({ ok: true, skipped: true });
        }
        const filePath = url.slice(idx + marker.length);

        const { error } = await supabaseAdmin.storage.from(BUCKET).remove([filePath]);
        if (error) {
            console.error('Supabase storage delete error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('Deleted file from storage:', filePath);
        return NextResponse.json({ ok: true });
    } catch (err: any) {
        console.error('Delete handler exception:', err?.message);
        return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
    }
}
