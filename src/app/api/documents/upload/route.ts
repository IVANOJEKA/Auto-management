import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        
        // Upload file to Supabase Storage bucket named 'documents'
        const { data, error } = await supabaseAdmin.storage
            .from('documents')
            .upload(filename, buffer, {
                contentType: file.type,
                duplex: 'half'
            });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from('documents')
            .getPublicUrl(filename);

        return NextResponse.json({
            name: file.name,
            url: urlData.publicUrl,
            path: data.path
        }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
