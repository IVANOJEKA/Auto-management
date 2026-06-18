import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';
import { verifyUserSession } from '../../../../lib/auth-server';

const BUCKET = 'documents';

async function ensureBucket() {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) {
        console.error('Error listing buckets:', listError);
        return false;
    }
    const exists = buckets?.some((b: any) => b.name === BUCKET);
    if (!exists) {
        console.log(`Bucket "${BUCKET}" not found. Creating...`);
        const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET, {
            public: true,
            fileSizeLimit: 20971520 // 20 MB
        });
        if (createError) {
            console.error('Error creating bucket:', createError);
            return false;
        }
        console.log(`Bucket "${BUCKET}" created successfully.`);
    }
    return true;
}

export async function POST(req: NextRequest) {
    try {
        const user = await verifyUserSession(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.log('Upload handler called. URL:', process.env.NEXT_PUBLIC_SUPABASE_URL, 'hasKey:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

        const formData = await req.formData();
        const file = formData.get('file') as File;
        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        console.log('Uploading file:', file.name, 'type:', file.type, 'size:', file.size);

        // Ensure the bucket exists before uploading
        const bucketReady = await ensureBucket();
        if (!bucketReady) {
            return NextResponse.json({ error: 'Storage bucket could not be initialized.' }, { status: 500 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        const { data, error } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(filename, buffer, {
                contentType: file.type,
                upsert: false
            });

        if (error) {
            console.error('Supabase storage upload error:', JSON.stringify(error));
            return NextResponse.json({ error: error.message, details: JSON.stringify(error) }, { status: 500 });
        }

        const { data: urlData } = supabaseAdmin.storage
            .from(BUCKET)
            .getPublicUrl(filename);

        console.log('Upload successful:', urlData.publicUrl);

        return NextResponse.json({
            name: file.name,
            url: urlData.publicUrl,
            path: data.path
        }, { status: 201 });

    } catch (err: any) {
        console.error('Upload handler exception:', err?.message, err?.stack);
        return NextResponse.json({ error: err?.message || 'Unknown error', stack: err?.stack }, { status: 500 });
    }
}
