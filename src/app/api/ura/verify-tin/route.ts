import { NextRequest, NextResponse } from 'next/server';
import { validateUgandaTIN } from '../../../../lib/ura-client';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const { tin } = body;

        if (!tin) {
            return NextResponse.json({ error: 'TIN is required' }, { status: 400 });
        }

        const cleanTin = tin.replace(/\s+/g, '');

        if (!validateUgandaTIN(cleanTin)) {
            return NextResponse.json({ error: 'Invalid TIN format. Must be exactly 10 digits.' }, { status: 400 });
        }

        // Simulate network latency
        await new Promise(resolve => setTimeout(resolve, 600));

        // Mock lookup behavior
        if (cleanTin.startsWith('9')) {
            return NextResponse.json({ 
                valid: false, 
                error: 'Taxpayer details not found. Please verify the TIN with URA.' 
            }, { status: 404 });
        }

        // Taxpayers based on TIN prefix
        let taxpayerName = 'Mock Taxpayer Uganda';
        let address = 'Kampala Main Street, Plot 45';
        
        if (cleanTin.startsWith('1')) {
            taxpayerName = 'Uganda Vehicle Imports Ltd';
            address = 'Plot 12, Jinja Road, Kampala';
        } else if (cleanTin.startsWith('2')) {
            taxpayerName = 'East African Freight Logistics Ltd';
            address = 'Entebbe Airport Rd, Block B';
        } else if (cleanTin.startsWith('3')) {
            taxpayerName = 'Kampala Auto Dealers Association';
            address = 'Plot 78, Kampala Road, Kampala';
        } else if (cleanTin.startsWith('5')) {
            taxpayerName = 'Horizon Trading Co.';
            address = 'Jinja Showroom Plaza, Shop 3';
        }

        return NextResponse.json({
            valid: true,
            tin: cleanTin,
            taxpayerName,
            address,
            taxpayerType: cleanTin.startsWith('1') ? 'Company' : 'Individual',
            status: 'ACTIVE'
        });

    } catch (err: any) {
        console.error('[URA TIN Verify Error]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
