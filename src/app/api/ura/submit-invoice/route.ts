import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';
import { verifyUserSession } from '../../../../lib/auth-server';
import { calculateUgandaTaxes, simulateEfrisHandshake } from '../../../../lib/ura-client';

export async function POST(req: NextRequest) {
    try {
        const user = await verifyUserSession(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = user.tenantId;
        const body = await req.json().catch(() => ({}));
        
        const { 
            invoiceId, 
            clientTin, 
            vatApplicable = true, 
            whtApplicable = false, 
            simulateOffline = false,
            dealerTin = '1000293810' // Fallback dealer TIN
        } = body;

        if (!invoiceId) {
            return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
        }

        if (simulateOffline) {
            return NextResponse.json({ 
                error: 'EFRIS Gateway Timeout: Could not connect to URA EFRIS servers. Code: 504' 
            }, { status: 504 });
        }

        // Fetch invoice details from Supabase if live
        let amount = 0;
        let invoiceData: any = null;
        
        try {
            const { data, error } = await supabaseAdmin
                .from('invoices')
                .select('*')
                .eq('id', invoiceId)
                .eq('tenant_id', tenantId)
                .maybeSingle();

            if (data) {
                invoiceData = data;
                // Parse amount from string like "$114,000" or "$1,200"
                amount = parseFloat(data.amount.replace(/[^0-9.-]+/g, '')) || 0;
            }
        } catch (dbErr) {
            console.warn('[URA API] DB fetch failed, using mock client data:', dbErr);
        }

        // Fallback amount if DB query wasn't run/successful
        if (!amount && body.amount) {
            amount = parseFloat(String(body.amount).replace(/[^0-9.-]+/g, '')) || 0;
        }

        // 1. Calculate taxes
        const taxResult = calculateUgandaTaxes(amount, whtApplicable);

        // 2. Perform handshake simulation
        let efrisResult;
        try {
            efrisResult = await simulateEfrisHandshake(
                invoiceId,
                clientTin || '',
                dealerTin,
                amount,
                false
            );
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }

        // 3. Update database if invoice was found
        if (invoiceData) {
            try {
                const { error: updateError } = await supabaseAdmin
                    .from('invoices')
                    .update({
                        efris_status: 'Synced',
                        efris_fsdn: efrisResult.fsdn,
                        efris_fiscal_sign: efrisResult.fiscalSign,
                        efris_qr_code: efrisResult.qrCodeUrl,
                        client_tin: clientTin || null,
                        vat_amount: taxResult.vatUsd,
                        wht_amount: taxResult.whtUsd,
                        efris_synced_at: efrisResult.timestamp
                    })
                    .eq('id', invoiceId)
                    .eq('tenant_id', tenantId);

                if (updateError) {
                    console.error('[URA API] DB update failed:', updateError.message);
                }
            } catch (dbUpdateErr) {
                console.error('[URA API] DB update error:', dbUpdateErr);
            }
        }

        return NextResponse.json({
            success: true,
            invoiceId,
            efrisStatus: 'Synced',
            fsdn: efrisResult.fsdn,
            fiscalSign: efrisResult.fiscalSign,
            deviceId: efrisResult.deviceId,
            qrCodeUrl: efrisResult.qrCodeUrl,
            clientTin: clientTin || null,
            taxes: taxResult,
            timestamp: efrisResult.timestamp
        });

    } catch (err: any) {
        console.error('[URA Submit Invoice Error]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
