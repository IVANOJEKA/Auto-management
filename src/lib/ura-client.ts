/**
 * Uganda Revenue Authority (URA) Helper Library for GariSphere DMS
 * Handles TIN validation, VAT (18%) and WHT (6%) calculation, and EFRIS protocol simulation.
 */

export interface TaxCalculationResult {
    amountUsd: number;
    amountUgx: number;
    vatUsd: number;
    vatUgx: number;
    whtUsd: number;
    whtUgx: number;
    totalBillUsd: number;
    totalBillUgx: number;
}

/**
 * Validates a Uganda Tax Identification Number (TIN).
 * Modern Uganda TINs are exactly 10 digits.
 */
export function validateUgandaTIN(tin: string): boolean {
    const cleanTin = tin.replace(/\s+/g, '');
    return /^\d{10}$/.test(cleanTin);
}

/**
 * Calculates standard Uganda VAT (18%) and optional WHT (6%) on a USD amount.
 * Dynamic UGX conversion uses the currency exchange rate.
 */
export function calculateUgandaTaxes(
    amountUsd: number,
    applyWht: boolean,
    exchangeRate: number = 3700
): TaxCalculationResult {
    const amountUgx = amountUsd * exchangeRate;
    
    // VAT is 18% of the pre-tax amount
    const vatUsd = amountUsd * 0.18;
    const vatUgx = amountUgx * 0.18;
    
    // Withholding Tax is typically 6% of the gross taxable supply
    const whtUsd = applyWht ? amountUsd * 0.06 : 0;
    const whtUgx = applyWht ? amountUgx * 0.06 : 0;
    
    // Total invoice bill amount (Amount + VAT - WHT)
    // Note: WHT is withheld by the payer, so the dealer receives Amount + VAT - WHT, 
    // while the client files WHT certificate. Let's compute total invoice bill.
    const totalBillUsd = amountUsd + vatUsd;
    const totalBillUgx = amountUgx + vatUgx;

    return {
        amountUsd,
        amountUgx: Math.round(amountUgx),
        vatUsd: parseFloat(vatUsd.toFixed(2)),
        vatUgx: Math.round(vatUgx),
        whtUsd: parseFloat(whtUsd.toFixed(2)),
        whtUgx: Math.round(whtUgx),
        totalBillUsd: parseFloat(totalBillUsd.toFixed(2)),
        totalBillUgx: Math.round(totalBillUgx)
    };
}

/**
 * Simulates the EFRIS Public Key Infrastructure (PKI) signing handshake and invoice registration.
 * Handles simulated connection latency and network offline scenarios.
 */
export async function simulateEfrisHandshake(
    invoiceId: string,
    clientTin: string,
    dealerTin: string,
    amountUsd: number,
    simulateOffline: boolean = false
): Promise<{
    fsdn: string;
    fiscalSign: string;
    deviceId: string;
    qrCodeUrl: string;
    timestamp: string;
}> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (simulateOffline) {
        throw new Error('EFRIS Gateway Timeout: Could not connect to URA EFRIS servers. Code: 504');
    }

    if (clientTin && !validateUgandaTIN(clientTin)) {
        throw new Error('EFRIS Invoice Reject: Invalid Client TIN format. Must be exactly 10 digits.');
    }

    if (!validateUgandaTIN(dealerTin)) {
        throw new Error('EFRIS Initialization Fail: Invalid Dealer TIN. Verify company settings.');
    }

    const uniqueId = Math.random().toString(36).substring(2, 9).toUpperCase();
    const fsdn = `FDN${dealerTin}-${uniqueId}`;
    
    // Generate secure mock fiscal signature
    const signaturePayload = `${fsdn}|${amountUsd}|${new Date().toISOString()}`;
    const fiscalSign = Array.from(signaturePayload)
        .reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0)
        .toString(16)
        .toUpperCase() + Math.floor(Math.random() * 10000);

    const deviceId = `DEV-${dealerTin.slice(-4)}-${Math.floor(Math.random() * 900 + 100)}`;
    const qrCodeUrl = `https://efris.ura.go.ug/verify?fsdn=${fsdn}&sig=${fiscalSign}`;

    return {
        fsdn,
        fiscalSign,
        deviceId,
        qrCodeUrl,
        timestamp: new Date().toISOString()
    };
}
