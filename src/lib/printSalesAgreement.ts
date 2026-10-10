import { BusinessConfig } from '../context/BusinessContext';

export interface SalesAgreementData {
    docNo?: string;
    agreementDate?: string;
    // Vehicle info
    regNo?: string;
    type?: string;
    colour?: string;
    chassisNo?: string;
    engineNo?: string;
    logBookNo?: string;
    vehicleName?: string;
    // Seller details
    sellerName?: string;
    sellerAddress?: string;
    sellerPhone?: string;
    // Buyer details
    buyerName?: string;
    buyerAddress?: string;
    buyerPhone?: string;
    buyerWorkplace?: string;
    nextOfKin?: string;
    // Financial consideration
    agreedPrice?: number | string;
    amountPaid?: number | string;
    chequeNo?: string;
    balance?: number | string;
    balanceDueDate?: string;
    interestRate?: string;
    // Currency formatting
    currencySymbol?: string;
    formatCurrencyFn?: (val: any) => string;
    // Witnesses
    witness1Name?: string;
    witness1Phone?: string;
    witness2Name?: string;
    witness2Phone?: string;
    witness3Name?: string;
    witness3Phone?: string;
    witness4Name?: string;
    witness4Phone?: string;
}

export function printSalesAgreement(business: BusinessConfig, data: SalesAgreementData) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const symbol = data.currencySymbol || 'UGX';

    const formatCurrency = (val?: number | string) => {
        if (val === undefined || val === null || val === '') return '........................';
        if (data.formatCurrencyFn) {
            return data.formatCurrencyFn(val);
        }
        if (typeof val === 'number') {
            return `${symbol} ${val.toLocaleString()}`;
        }
        const str = String(val).trim();
        if (str.startsWith('$')) {
            const cleaned = str.replace(/[^0-9.-]+/g, '');
            const num = parseFloat(cleaned);
            if (!isNaN(num) && num > 0) {
                return `${symbol} ${num.toLocaleString()}`;
            }
        }
        if (str.match(/^[0-9,.]+$/)) {
            return `${symbol} ${str}`;
        }
        return str;
    };

    const docNo = data.docNo || '048';
    const agreementDate = data.agreementDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const dealerName = business.name || 'GARISPHERE MOTORS';
    const dealerTagline = business.tagline || 'IMPORTERS AND EXPORTERS OF NEW AND USED VEHICLES';
    const dealerAddress = business.address || 'Kampala, Uganda';
    const dealerPhone = business.phone || '+256 754 479891';
    const dealerEmail = business.email || 'sales@garisphere.com';
    const country = business.country ? business.country.toUpperCase() : 'UGANDA';

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>SALES AGREEMENT FOR MOTOR VEHICLE - ${dealerName}</title>
            <style>
                @page {
                    size: A4 portrait;
                    margin: 12mm 15mm;
                }
                * {
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Times New Roman', Times, serif, sans-serif;
                    color: #000;
                    margin: 0;
                    padding: 10px;
                    line-height: 1.35;
                    font-size: 13.5px;
                }
                .dealer-header {
                    text-align: center;
                    border-bottom: 2.5px solid #000;
                    padding-bottom: 6px;
                    margin-bottom: 8px;
                    position: relative;
                }
                .dealer-name {
                    font-size: 26px;
                    font-weight: 900;
                    font-family: Impact, 'Arial Black', sans-serif;
                    letter-spacing: 1.5px;
                    color: #1e3a8a;
                    text-transform: uppercase;
                    margin: 0;
                    line-height: 1.1;
                }
                .dealer-tagline {
                    font-size: 11px;
                    font-weight: bold;
                    color: #b91c1c;
                    text-transform: uppercase;
                    margin-top: 3px;
                    letter-spacing: 0.5px;
                }
                .dealer-contacts {
                    font-size: 11px;
                    color: #111827;
                    margin-top: 3px;
                    font-weight: 600;
                }
                .meta-bar {
                    display: flex;
                    justify-content: space-between;
                    font-weight: bold;
                    font-size: 14px;
                    margin-top: 8px;
                    margin-bottom: 6px;
                }
                .meta-no {
                    color: #b91c1c;
                    font-weight: 900;
                    font-size: 15px;
                }
                .republic-header {
                    text-align: center;
                    font-size: 12px;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-top: 4px;
                }
                .doc-title {
                    text-align: center;
                    font-size: 17px;
                    font-weight: 900;
                    text-decoration: underline;
                    text-transform: uppercase;
                    margin: 4px 0 12px 0;
                    color: #0f172a;
                    letter-spacing: 0.8px;
                }
                .field-row {
                    display: flex;
                    align-items: baseline;
                    margin-bottom: 4px;
                    font-size: 13px;
                }
                .field-label {
                    font-weight: bold;
                    white-space: nowrap;
                    margin-right: 6px;
                }
                .field-dots {
                    flex: 1;
                    border-bottom: 1px dotted #333;
                    padding-left: 6px;
                    font-weight: 700;
                    min-height: 18px;
                    color: #0f172a;
                }
                .grid-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }
                .section-header {
                    font-weight: 900;
                    text-transform: uppercase;
                    font-size: 12.5px;
                    margin-top: 8px;
                    margin-bottom: 4px;
                    text-decoration: underline;
                    color: #000;
                }
                .agreement-clause-header {
                    font-weight: 900;
                    text-transform: uppercase;
                    font-size: 13px;
                    margin-top: 10px;
                    margin-bottom: 6px;
                    text-decoration: underline;
                }
                ol.terms-list {
                    margin: 0;
                    padding-left: 20px;
                }
                ol.terms-list li {
                    margin-bottom: 6px;
                    font-size: 12.5px;
                    text-align: justify;
                }
                .inline-dots {
                    border-bottom: 1px dotted #333;
                    padding: 0 8px;
                    font-weight: bold;
                    display: inline-block;
                    min-width: 120px;
                    text-align: center;
                }
                .signatures-container {
                    margin-top: 24px;
                    display: flex;
                    justify-content: space-between;
                    padding: 0 10px;
                }
                .sig-block {
                    width: 42%;
                    text-align: left;
                }
                .sig-line-box {
                    border-bottom: 1px dashed #000;
                    height: 25px;
                    margin-bottom: 4px;
                }
                .sig-title {
                    font-weight: bold;
                    font-size: 13px;
                }
                .witness-section {
                    margin-top: 16px;
                }
                .witness-title {
                    font-weight: 900;
                    text-transform: uppercase;
                    font-size: 12.5px;
                    margin-bottom: 6px;
                    text-decoration: underline;
                }
                .witness-row {
                    display: flex;
                    align-items: baseline;
                    margin-bottom: 5px;
                    font-size: 12px;
                }
                .witness-col-name {
                    flex: 2;
                    display: flex;
                    align-items: baseline;
                }
                .witness-col-sign {
                    flex: 1.5;
                    display: flex;
                    align-items: baseline;
                    margin: 0 10px;
                }
                .witness-col-tel {
                    flex: 1.5;
                    display: flex;
                    align-items: baseline;
                }
                @media print {
                    body {
                        padding: 0;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            </style>
        </head>
        <body>
            <!-- DEALER BRANDING HEADER -->
            <div class="dealer-header">
                <div class="dealer-name">${dealerName}</div>
                <div class="dealer-tagline">${dealerTagline}</div>
                <div class="dealer-contacts">
                    Tel: ${dealerPhone} &nbsp;|&nbsp; Address: ${dealerAddress} &nbsp;|&nbsp; Email: ${dealerEmail}
                </div>
            </div>

            <!-- DOCUMENT META HEADER -->
            <div class="meta-bar">
                <span class="meta-no">No. ${docNo}</span>
                <span>Date: ${agreementDate}</span>
            </div>

            <div class="republic-header">THE REPUBLIC OF ${country}</div>
            <div class="doc-title">SALES AGREEMENT FOR MOTOR VEHICLE</div>

            <!-- VEHICLE DETAILS -->
            <div class="grid-2">
                <div>
                    <div class="field-row">
                        <span class="field-label">Reg No:</span>
                        <span class="field-dots">${data.regNo || '........................................'}</span>
                    </div>
                    <div class="field-row">
                        <span class="field-label">Colour:</span>
                        <span class="field-dots">${data.colour || '........................................'}</span>
                    </div>
                    <div class="field-row">
                        <span class="field-label">Engine No:</span>
                        <span class="field-dots">${data.engineNo || '........................................'}</span>
                    </div>
                </div>
                <div>
                    <div class="field-row">
                        <span class="field-label">Type:</span>
                        <span class="field-dots">${data.type || data.vehicleName || '........................................'}</span>
                    </div>
                    <div class="field-row">
                        <span class="field-label">Chassis No:</span>
                        <span class="field-dots">${data.chassisNo || '........................................'}</span>
                    </div>
                    <div class="field-row">
                        <span class="field-label">Log Book No:</span>
                        <span class="field-dots">${data.logBookNo || '........................................'}</span>
                    </div>
                </div>
            </div>

            <!-- SELLER'S DETAILS -->
            <div class="section-header">SELLER'S DETAILS</div>
            <div class="field-row">
                <span class="field-label">Full names:</span>
                <span class="field-dots">${data.sellerName || dealerName}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Address:</span>
                <span class="field-dots">${data.sellerAddress || dealerAddress}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Phone:</span>
                <span class="field-dots">${data.sellerPhone || dealerPhone}</span>
            </div>

            <!-- BUYER'S DETAILS -->
            <div class="section-header">BUYER'S DETAILS</div>
            <div class="field-row">
                <span class="field-label">Full names:</span>
                <span class="field-dots">${data.buyerName || '....................................................................................................'}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Address:</span>
                <span class="field-dots">${data.buyerAddress || '....................................................................................................'}</span>
            </div>
            <div class="grid-2">
                <div class="field-row">
                    <span class="field-label">Phone:</span>
                    <span class="field-dots">${data.buyerPhone || '........................................'}</span>
                </div>
                <div class="field-row">
                    <span class="field-label">Place of work / Residence:</span>
                    <span class="field-dots">${data.buyerWorkplace || '........................................'}</span>
                </div>
            </div>
            <div class="field-row">
                <span class="field-label">Next of Kin:</span>
                <span class="field-dots">${data.nextOfKin || '....................................................................................................'}</span>
            </div>

            <!-- AGREEMENT TERMS -->
            <div class="agreement-clause-header">IT IS HEREBY AGREED AS FOLLOWS:</div>
            <ol class="terms-list">
                <li>
                    That the vendor has agreed to sell the said and the purchaser has checked / tested and agreed to buy the said vehicle in the condition of <strong>"As Is"</strong>.
                </li>
                <li>
                    <strong>Consideration:</strong> The agreed purchase price is
                    <span class="inline-dots">${formatCurrency(data.agreedPrice)}</span>.
                    And the purchaser has paid a non-refundable amount of
                    <span class="inline-dots">${formatCurrency(data.amountPaid)}</span>.
                    Cheque No: <span class="inline-dots" style="min-width:90px">${data.chequeNo || 'N/A'}</span>.
                    Balance is <span class="inline-dots">${formatCurrency(data.balance)}</span>
                    will be paid on <span class="inline-dots">${data.balanceDueDate || '........................'}</span>.
                    Failure to pay the balance within the specific period will be liable to pay a monthly interest of <strong>${data.interestRate || '10%'}</strong> of the balance or the vehicle will be impounded by the seller.
                </li>
                <li>
                    Log books and Transfer forms will be given to the buyer only after completion of payment.
                </li>
                <li>
                    If the vehicle is sold on credit basis the buyer has to deposit postdated cheque with the vendor and these cheques shall be banked on due date.
                </li>
                <li>
                    Upon impounding the vehicle, the buyer shall be given 14 days within which to pay the balance of the purchase price together with the cost of impounding storage and security for the vehicle.
                </li>
            </ol>

            <!-- SIGNATURES -->
            <div class="signatures-container">
                <div class="sig-block">
                    <div class="sig-title">Seller</div>
                    <div class="sig-line-box"></div>
                    <div style="font-size:11px; color:#444;">Name: ${data.sellerName || dealerName}</div>
                </div>
                <div class="sig-block">
                    <div class="sig-title">Buyer</div>
                    <div class="sig-line-box"></div>
                    <div style="font-size:11px; color:#444;">Name: ${data.buyerName || '........................................'}</div>
                </div>
            </div>

            <!-- WITNESSES -->
            <div class="witness-section">
                <div class="witness-title">WITNESSES</div>
                
                <div class="witness-row">
                    <div class="witness-col-name">
                        <span class="field-label">1. Name:</span>
                        <span class="field-dots">${data.witness1Name || ''}</span>
                    </div>
                    <div class="witness-col-sign">
                        <span class="field-label">Sign:</span>
                        <span class="field-dots"></span>
                    </div>
                    <div class="witness-col-tel">
                        <span class="field-label">Tel:</span>
                        <span class="field-dots">${data.witness1Phone || ''}</span>
                    </div>
                </div>

                <div class="witness-row">
                    <div class="witness-col-name">
                        <span class="field-label">2. Name:</span>
                        <span class="field-dots">${data.witness2Name || ''}</span>
                    </div>
                    <div class="witness-col-sign">
                        <span class="field-label">Sign:</span>
                        <span class="field-dots"></span>
                    </div>
                    <div class="witness-col-tel">
                        <span class="field-label">Tel:</span>
                        <span class="field-dots">${data.witness2Phone || ''}</span>
                    </div>
                </div>

                <div class="witness-row">
                    <div class="witness-col-name">
                        <span class="field-label">3. Name:</span>
                        <span class="field-dots">${data.witness3Name || ''}</span>
                    </div>
                    <div class="witness-col-sign">
                        <span class="field-label">Sign:</span>
                        <span class="field-dots"></span>
                    </div>
                    <div class="witness-col-tel">
                        <span class="field-label">Tel:</span>
                        <span class="field-dots">${data.witness3Phone || ''}</span>
                    </div>
                </div>

                <div class="witness-row">
                    <div class="witness-col-name">
                        <span class="field-label">4. Name:</span>
                        <span class="field-dots">${data.witness4Name || ''}</span>
                    </div>
                    <div class="witness-col-sign">
                        <span class="field-label">Sign:</span>
                        <span class="field-dots"></span>
                    </div>
                    <div class="witness-col-tel">
                        <span class="field-label">Tel:</span>
                        <span class="field-dots">${data.witness4Phone || ''}</span>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 300);
}
