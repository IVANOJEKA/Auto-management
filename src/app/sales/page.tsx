'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useData, Deal } from '../../context/DataContext';
import Sidebar from '../../components/Sidebar';
import { BarChart } from '../../components/Charts';
import { useCurrency } from '../../context/CurrencyContext';
import { useBusiness } from '../../context/BusinessContext';
import '../globals.css';
import { usePageGuard } from '../../hooks/usePageGuard';

export default function SalesPage() {
    const { user, isAuthenticated } = useAuth();
    const { isAllowed } = usePageGuard('sales');
    if (!isAllowed) return null;
    const { deals, vehicles, clients, closeDeal, exportToCSV, addJournalEntry, selectedBranch, logDocumentPrint } = useData();
    const { formatCurrency: fmt, formatUSDToStore, formatRaw } = useCurrency();
    const { business } = useBusiness();
    const router = useRouter();

    useEffect(() => {
        if (!isAuthenticated) router.push('/login');
    }, [isAuthenticated, router]);

    const [showNewDealModal, setShowNewDealModal] = useState(false);
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
    const [showReport, setShowReport] = useState(false);

    const F_I_PACKAGES = [
        { id: 'warranty', name: 'Extended Warranty (3yr)', price: 2500 },
        { id: 'gap', name: 'GAP Insurance', price: 850 },
        { id: 'ceramic', name: 'Ceramic Coating', price: 1200 },
        { id: 'wheels', name: 'Wheel & Tire Protection', price: 699 }
    ];

    const [newDeal, setNewDeal] = useState({ 
        client: '', clientId: '', vehicleId: '', vehicleLabel: '', salePrice: '', agent: user?.name || 'Alex T.', notes: '',
        tradeInMake: '', tradeInModel: '', tradeInYear: '', tradeInMileage: '', tradeInValue: '',
        apr: '5.9', term: '60', downPayment: '0',
        selectedFiProducts: [] as string[]
    });

    if (!isAuthenticated || !user) return null;

    const availableVehicles = vehicles.filter(v => v.status === 'In Stock' || v.status === 'In Transit');

    const handleStartNewDeal = (e: React.FormEvent) => {
        e.preventDefault();
        const isOutsourced = newDeal.vehicleId === 'outsourced';
        const selectedCar = vehicles.find(v => v.id === newDeal.vehicleId);
        if ((!selectedCar && !isOutsourced) || !newDeal.client) return;
        if (isOutsourced && !newDeal.vehicleLabel.trim()) return;
        
        const originalCost = isOutsourced ? 0 : parseFloat(selectedCar!.cost?.replace(/[^0-9.-]+/g, '') || selectedCar!.price.replace(/[^0-9.-]+/g, '')) || 80000;
        const saleVal = parseFloat(newDeal.salePrice.replace(/[^0-9.-]+/g, '')) || (originalCost + 10000);
        const marginVal = isOutsourced ? saleVal : saleVal - originalCost;
        const commissionVal = Math.max(marginVal * 0.10, 0);
        
        const tradeInValue = parseFloat(newDeal.tradeInValue.replace(/[^0-9.-]+/g, '')) || 0;
        const downPayment = parseFloat(newDeal.downPayment.replace(/[^0-9.-]+/g, '')) || 0;
        const fiTotal = newDeal.selectedFiProducts.reduce((sum, id) => sum + (F_I_PACKAGES.find(p => p.id === id)?.price || 0), 0);
        const amountFinanced = saleVal + fiTotal - downPayment - tradeInValue;
        
        const r = (parseFloat(newDeal.apr) || 0) / 100 / 12;
        const n = parseInt(newDeal.term) || 60;
        const monthlyPayment = amountFinanced > 0 && r > 0 ? (amountFinanced * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : (amountFinanced / n);

        const fiProductsStr = newDeal.selectedFiProducts.map(id => F_I_PACKAGES.find(p => p.id === id)?.name).join(', ');

        closeDeal({
            client: newDeal.client,
            clientId: newDeal.clientId || undefined,
            vehicle: isOutsourced ? newDeal.vehicleLabel : `${selectedCar!.year} ${selectedCar!.make} ${selectedCar!.model}`,
            salePrice: formatUSDToStore(saleVal), margin: formatUSDToStore(marginVal), commission: formatUSDToStore(commissionVal),
            agent: newDeal.agent, status: 'Closed', fiProducts: fiProductsStr, notes: newDeal.notes,
            branch: selectedBranch !== 'All' ? selectedBranch as import('../../context/DataContext').Branch : user.branch,
            tradeIn: tradeInValue > 0 ? {
                make: newDeal.tradeInMake, model: newDeal.tradeInModel, year: parseInt(newDeal.tradeInYear),
                mileage: parseInt(newDeal.tradeInMileage), value: tradeInValue
            } : undefined,
            financing: {
                apr: parseFloat(newDeal.apr) || 0, term: n, downPayment, amountFinanced, monthlyPayment
            }
        });

        // Trigger GL Entries
        const dealId = `D-${800 + deals.length + 1}`;
        const entries: any[] = [];
        
        // 1. Revenue & Accounts Receivable
        entries.push({ accountId: '1200', accountName: 'Accounts Receivable', type: 'Asset', amount: amountFinanced + downPayment, entryType: 'Debit', description: `Vehicle Sale ${dealId}` });
        entries.push({ accountId: '4000', accountName: 'Vehicle Sales Revenue', type: 'Revenue', amount: saleVal, entryType: 'Credit', description: `Vehicle Sale ${dealId}` });
        
        // 2. F&I Revenue
        if (fiTotal > 0) {
            entries.push({ accountId: '4100', accountName: 'F&I Revenue', type: 'Revenue', amount: fiTotal, entryType: 'Credit', description: `F&I Products ${dealId}` });
        }
        
        // 3. Trade-In Inventory
        if (tradeInValue > 0) {
            entries.push({ accountId: '1300', accountName: 'Vehicle Inventory', type: 'Asset', amount: tradeInValue, entryType: 'Debit', description: `Trade-in ${dealId}` });
            entries.push({ accountId: '1200', accountName: 'Accounts Receivable', type: 'Asset', amount: tradeInValue, entryType: 'Credit', description: `Trade-in Applied ${dealId}` });
        }
        
        // 4. Cost of Goods Sold & Inventory Reduction
        entries.push({ accountId: '5000', accountName: 'Cost of Goods Sold', type: 'Expense', amount: originalCost, entryType: 'Debit', description: `COGS ${dealId}` });
        entries.push({ accountId: '1300', accountName: 'Vehicle Inventory', type: 'Asset', amount: originalCost, entryType: 'Credit', description: `Vehicle Sold ${dealId}` });

        if (addJournalEntry) {
            addJournalEntry(entries);
        }

        setShowNewDealModal(false);
        setNewDeal({ 
            client: '', clientId: '', vehicleId: '', vehicleLabel: '', salePrice: '', agent: user?.name || '', notes: '',
            tradeInMake: '', tradeInModel: '', tradeInYear: '', tradeInMileage: '', tradeInValue: '',
            apr: '5.9', term: '60', downPayment: '0', selectedFiProducts: []
        });
    };

    const handlePrintAgreement = (deal: any) => {
        // Prefer clientId lookup for reliability, fall back to name match
        const client = clients.find(c => (deal.clientId && c.id === deal.clientId) || c.name === deal.client);
        // deal.salePrice stored in USD format â†’ fmt() converts to local currency correctly
        const salePrice    = deal.salePrice   ? fmt(deal.salePrice)   : 'â€”';
        // financing amounts are stored in local currency â†’ formatRaw() to avoid double-conversion
        const downPayment  = deal.financing   ? formatRaw(deal.financing.downPayment)   : 'â€”';
        const balance      = deal.financing   ? formatRaw(deal.financing.amountFinanced) : 'â€”';
        const monthlyPayment = deal.financing ? formatRaw(deal.financing.monthlyPayment) : 'â€”';
        const agreedNo = deal.id || 'â€”';
        const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

        const isRegistered = business.isRegistered;
        const brandName = isRegistered ? (business.name || 'GariSphere').toUpperCase() : 'MOTOR VEHICLE DEALERSHIP';
        const brandSub = isRegistered ? business.tagline : 'STANDARD SALES AGREEMENT';
        const brandContact = isRegistered 
            ? `Tel: ${business.phone || 'â€”'} &nbsp;|&nbsp; ${business.address || 'â€”'} &nbsp;|&nbsp; Email: ${business.email || 'â€”'}`
            : 'Tel: ........................................ &nbsp;|&nbsp; Address: ........................................ &nbsp;|&nbsp; Email: ........................................';

        const brandLogo = isRegistered ? (business.logoEmoji || 'ðŸš™') : 'ðŸš™';
        const brandLogoSecond = isRegistered ? 'ðŸŽï¸' : 'ðŸš™';

        const brandLogoHtml = isRegistered && business.logoImage 
            ? `<img src="${business.logoImage}" style="max-height: 48px; max-width: 80px; object-fit: contain;" />` 
            : `<img src="/garisphere-logo.png" style="max-height: 48px; max-width: 80px; object-fit: contain;" />`;

        const brandLogoSecondHtml = isRegistered && business.logoImage 
            ? `<img src="${business.logoImage}" style="max-height: 48px; max-width: 80px; object-fit: contain;" />` 
            : `<img src="/garisphere-logo.png" style="max-height: 48px; max-width: 80px; object-fit: contain;" />`;

        const watermarkHtml = isRegistered && business.logoImage 
            ? `<img src="${business.logoImage}" style="max-width: 250px; max-height: 250px; opacity: 0.03; object-fit: contain;" />` 
            : `<img src="/garisphere-logo.png" style="max-width: 250px; max-height: 250px; opacity: 0.03; object-fit: contain;" />`;

        const crestEmoji = isRegistered ? (business.country === 'Uganda' ? 'ðŸ‡ºðŸ‡¬' : 'ðŸŒ') : 'ðŸŒ';
        const republicName = isRegistered ? `The Republic of ${business.country || 'Uganda'}` : 'STANDARD MOTOR VEHICLE DOCUMENT';

        const sellerName = isRegistered ? business.name : '......................................................................';
        const sellerAddress = isRegistered ? business.address : '......................................................................';
        const sellerPhone = isRegistered ? business.phone : '......................................................................';

        // Pre-compute conditional rows (avoids nested backtick TS errors)
        const tradeInRow = deal.tradeIn
            ? `<tr><td>Trade-In Deduction (${deal.tradeIn.year || ''} ${deal.tradeIn.make || ''} ${deal.tradeIn.model || ''})</td><td style="text-align:right; color:#c62828;">\u2212 ${formatRaw(deal.tradeIn.value || 0)}</td></tr>`
            : '';
        const depositRow = deal.financing && deal.financing.downPayment > 0
            ? `<tr><td>Initial Deposit / Down Payment</td><td style="text-align:right; color:#2e7d32;">${downPayment}</td></tr>`
            : '';
        const fiRow = deal.fiProducts
            ? `<tr><td>F&amp;I Products: ${deal.fiProducts}</td><td style="text-align:right;">Included</td></tr>`
            : '';
        const financingTable = deal.financing
            ? `<table><thead><tr><th>Financing Schedule</th><th style="text-align:right;">Amount</th></tr></thead><tbody><tr><td>Outstanding Balance (Amount Financed)</td><td style="text-align:right;">${balance}</td></tr><tr><td>Monthly Instalment \u2014 APR ${deal.financing.apr}% over ${deal.financing.term} months</td><td style="text-align:right;">${monthlyPayment}</td></tr></tbody></table>`
            : '';

        const pw = window.open('', '_blank');
        if (!pw) return;

        // Log document to archive before printing
        logDocumentPrint({
            type: 'Sales Agreement',
            client: deal.client,
            amount: salePrice,
            referenceId: deal.id,
            generatedBy: deal.agent || user?.name || 'System',
            branch: deal.branch,
        });

        pw.document.write(`<!DOCTYPE html><html><head><title>Sales Agreement - ${deal.client}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; font-size: 10pt; color: #111; background: #fff; padding: 30px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px double #1a237e; padding-bottom: 12px; margin-bottom: 16px; }
.brand-title { font-size: 20pt; font-weight: bold; color: #1a237e; }
.brand-sub { font-size: 8pt; color: #c62828; font-weight: bold; text-transform: uppercase; }
.brand-contact { font-size: 7.5pt; color: #555; margin-top: 3px; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.meta-block { border: 1px solid #ccc; padding: 10px; border-radius: 4px; }
.meta-head { font-weight: bold; font-size: 8pt; color: #1a237e; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
.meta-row { display: flex; justify-content: space-between; font-size: 9pt; margin-bottom: 3px; }
.section-title { font-size: 10.5pt; font-weight: bold; text-align: center; text-decoration: underline; text-transform: uppercase; margin: 14px 0 8px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
th { background: #1a237e; color: #fff; padding: 8px 12px; font-size: 8.5pt; text-align: left; }
td { border-bottom: 1px solid #eee; padding: 7px 12px; font-size: 9pt; }
tr:nth-child(even) td { background: #fafafa; }
.total-row td { font-weight: bold; font-size: 11pt; background: #1a237e !important; color: #fff; }
.clauses-head { font-size: 10.5pt; font-weight: bold; color: #c62828; text-transform: uppercase; text-decoration: underline; margin: 14px 0 8px; }
.clause { margin-bottom: 6px; font-size: 9.5pt; line-height: 1.55; }
.clause-num { font-weight: bold; margin-right: 4px; }
.clause-lbl { font-weight: bold; text-decoration: underline; }
.fline { display: inline-block; border-bottom: 1px dotted #555; min-width: 130px; margin: 0 3px; vertical-align: bottom; }
.form-line { display: flex; gap: 6px; margin-bottom: 5px; font-size: 9pt; align-items: flex-end; }
.form-lbl { white-space: nowrap; font-weight: 600; }
.dotted { flex: 1; border-bottom: 1px dotted #666; height: 16px; }
.sig-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 28px; }
.sig-box { text-align: center; }
.sig-line { border-bottom: 2px solid #000; margin-bottom: 6px; height: 36px; }
.notice { font-size: 7.5pt; color: #666; text-align: center; margin-top: 18px; border-top: 1px solid #eee; padding-top: 10px; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="header">
  <div>
    <div class="brand-title">${brandName}</div>
    <div class="brand-sub">${brandSub}</div>
    <div class="brand-contact">${brandContact}</div>
  </div>
  <div style="text-align:right;">
    <h2 style="color:#1a237e; font-size:14pt;">SALES AGREEMENT</h2>
    <p style="font-size:8pt; color:#777;">Agreement No: <strong>${agreedNo}</strong></p>
    <p style="font-size:8pt; color:#777;">Date: <strong>${dateStr}</strong></p>
    <p style="font-size:8pt; color:#777;">Sales Advisor: <strong>${deal.agent || '\u2014'}</strong></p>
  </div>
</div>
<div class="meta-grid">
  <div class="meta-block">
    <div class="meta-head">Buyer (Purchaser)</div>
    <div class="meta-row"><span>Name:</span><span>${deal.client || '\u2014'}</span></div>
    <div class="meta-row"><span>Phone:</span><span>${client?.phone || '\u2014'}</span></div>
    <div class="meta-row"><span>Email:</span><span>${client?.email || '\u2014'}</span></div>
    <div class="meta-row"><span>Address:</span><span>${client?.address || '\u2014'}</span></div>
    <div class="meta-row"><span>ID / TIN:</span><span>${client?.idPassport || client?.tinNo || '\u2014'}</span></div>
  </div>
  <div class="meta-block">
    <div class="meta-head">Seller (Vendor)</div>
    <div class="meta-row"><span>Name:</span><span>${sellerName}</span></div>
    <div class="meta-row"><span>Address:</span><span>${sellerAddress}</span></div>
    <div class="meta-row"><span>Phone:</span><span>${sellerPhone}</span></div>
    <div class="meta-row"><span>Vehicle:</span><span><strong>${deal.vehicle || '\u2014'}</strong></span></div>
    <div class="meta-row"><span>Reg No:</span><span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
  </div>
</div>
<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px 16px; margin-bottom:14px;">
  <div class="form-line"><span class="form-lbl">Chassis / Frame No:</span><span class="dotted"></span></div>
  <div class="form-line"><span class="form-lbl">Engine No:</span><span class="dotted"></span></div>
  <div class="form-line"><span class="form-lbl">Colour:</span><span class="dotted"></span></div>
  <div class="form-line"><span class="form-lbl">Log Book No:</span><span class="dotted"></span></div>
  <div class="form-line"><span class="form-lbl">Year of Manufacture:</span><span class="dotted"></span></div>
  <div class="form-line"><span class="form-lbl">Place of Registration:</span><span class="dotted"></span></div>
</div>
<div class="section-title">Agreed Pricing Breakdown</div>
<table>
  <thead><tr><th>Description</th><th style="text-align:right;">Amount</th></tr></thead>
  <tbody>
    <tr><td>Vehicle Purchase Price \u2014 ${deal.vehicle}</td><td style="text-align:right;">${salePrice}</td></tr>
    ${tradeInRow}
    ${depositRow}
    ${fiRow}
    <tr class="total-row"><td>TOTAL AGREED PURCHASE PRICE</td><td style="text-align:right;">${salePrice}</td></tr>
  </tbody>
</table>
${financingTable}
<div class="clauses-head">It is Hereby Agreed as Follows:</div>
<div class="clause"><span class="clause-num">1.</span> That the vendor has agreed to sell and the purchaser has checked, tested, and agreed to buy the said vehicle in the condition of &ldquo;As Is&rdquo; as described herein.</div>
<div class="clause"><span class="clause-num">2.</span> <span class="clause-lbl">Consideration:</span> The total agreed purchase price is <span class="fline">${salePrice}</span>. A non-refundable deposit of <span class="fline">${downPayment}</span> has been paid. The outstanding balance of <span class="fline">${balance}</span> shall be settled on or before <span class="fline">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>. Failure to pay within the agreed period attracts a monthly interest of <strong>10%</strong> on the outstanding amount, or the vehicle may be repossessed by the seller.</div>
<div class="clause"><span class="clause-num">3.</span> Log books and Transfer forms will be released to the buyer <strong>only after full and confirmed payment</strong> has been received.</div>
<div class="clause"><span class="clause-num">4.</span> If sold on a credit basis, the buyer shall deposit post-dated cheques with the vendor, which shall be presented on their respective due dates.</div>
<div class="clause"><span class="clause-num">5.</span> Upon repossession of the vehicle, the buyer shall be given <strong>14 days</strong> to settle all outstanding balances plus costs of repossession, storage, and security.</div>
<div class="clause"><span class="clause-num">6.</span> Both parties confirm they have read, understood, and agreed to the terms and conditions of this Sales Agreement.</div>
<div class="sig-grid">
  <div class="sig-box"><div class="sig-line"></div><div style="font-weight:700;">Buyer / Purchaser</div><div style="font-size:8pt; color:#555;">${deal.client || ''}</div></div>
  <div class="sig-box"><div class="sig-line"></div><div style="font-weight:700;">Authorized Seller</div><div style="font-size:8pt; color:#555;">${brandName}</div></div>
  <div class="sig-box"><div class="sig-line"></div><div style="font-weight:700;">Witness</div><div style="font-size:8pt; color:#555;">Name &amp; Signature</div></div>
</div>
<div class="notice">This is a legally binding Sales Agreement. Both parties retain a signed copy for their records. &nbsp;|&nbsp; Powered by GariSphere DMS</div>
</body></html>`);
        pw.document.close();
        setTimeout(() => { pw.focus(); pw.print(); }, 300);
    };

    // Stats
    const branchDeals = deals.filter(d => selectedBranch === 'All' || d.branch === selectedBranch);
    const closedDeals = branchDeals.filter(d => d.status === 'Closed');
    const pendingDeals = branchDeals.filter(d => d.status === 'Pending Finance');
    const totalMargin = closedDeals.reduce((acc, d) => acc + (parseFloat((d.margin ?? '0').replace(/[^0-9.-]+/g, '')) || 0), 0);
    const totalComm = closedDeals.reduce((acc, d) => acc + (parseFloat((d.commission ?? '0').replace(/[^0-9.-]+/g, '')) || 0), 0);
    const grossMarginTotal = 139900 + totalMargin;
    const commissionsTotal = 13990 + totalComm;
    const avgMarginPct = closedDeals.length ? ((totalMargin / (closedDeals.reduce((a, d) => a + (parseFloat((d.salePrice ?? '0').replace(/[^0-9.-]+/g, '')) || 100000), 0) || 1)) * 100).toFixed(1) : '12.5';

    // Leaderboard
    const leaderboard: Record<string, number> = { 'Alex T.': 11200, 'Sarah M.': 4520, 'Marcus J.': 2520 };
    branchDeals.filter(d => d.status === 'Closed').forEach(d => {
        const c = parseFloat((d.commission ?? '0').replace(/[^0-9.-]+/g, ''));
        if (!isNaN(c)) leaderboard[d.agent] = (leaderboard[d.agent] || 0) + c;
    });
    const sortedLeaderboard = Object.entries(leaderboard).map(([name, commission]) => ({ name, commission })).sort((a, b) => b.commission - a.commission);

    // Monthly bar data
    const monthlyData = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((label, i) => ({
        label, value: [5, 8, 6, 9, 11, 8, 13, 10, 14, 16 + closedDeals.length, 12, 15][i]
    }));

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto', position: 'relative' }}>

                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '1.9rem', marginBottom: '0.2rem' }}>Sales Desk</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage deals, commissions & pipeline</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn-outline" onClick={() => exportToCSV(deals.map(d => ({ ...d })), 'deals.csv')}>&#8659; Export CSV</button>
                        <button className="btn-outline" onClick={() => setShowReport(true)}>&#128202; Full Report</button>
                        <button className="btn-primary" onClick={() => setShowNewDealModal(true)}>+ Start New Deal</button>
                    </div>
                </header>

                {/* KPIs */}
                <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                    <StatCard label="Units Closed" value={`${45 + closedDeals.length}`} sub={`${pendingDeals.length} pending finance`} />
                    <StatCard label="Total Gross Margin" value={fmt(grossMarginTotal)} color="var(--success)" />
                    <StatCard label="Commissions Due" value={fmt(commissionsTotal)} color="var(--primary)" />
                    <StatCard label="Avg. Deal Margin %" value={`${avgMarginPct}%`} />
                </div>

                <div className="grid-2col-2-1" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>

                    {/* Deals Table */}
                    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                            <h3 style={{ fontSize: '1rem' }}>Active Deals Pipeline ({branchDeals.length})</h3>
                        </div>
                        <div className="table-responsive"><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                    {['Deal ID', 'Client / Vehicle', 'Sale Price', 'Margin', 'Comm.', 'Status', ''].map(h => (
                                        <th key={h} style={thStyle}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {branchDeals.map((deal, idx, arr) => (
                                    <tr key={deal.id} style={{ borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                                        <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{deal.id}</td>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: 600 }}>{deal.client}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{deal.vehicle}</div>
                                        </td>
                                        <td style={tdStyle}>{deal.salePrice ? fmt(deal.salePrice) : '—'}</td>
                                        <td style={{ ...tdStyle, color: 'var(--success)', fontWeight: 600 }}>{fmt(deal.margin)}</td>
                                        <td style={{ ...tdStyle, color: 'var(--primary)' }}>{fmt(deal.commission)}</td>
                                        <td style={tdStyle}>
                                            <span className={`badge ${deal.status === 'Closed' ? 'badge-success' : 'badge-warning'}`}>{deal.status}</span>
                                        </td>
                                        <td style={tdStyle}>
                                            <button onClick={() => setSelectedDeal(deal)} style={{ color: 'var(--secondary-accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem' }}>Details</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table></div>
                    </div>

                    {/* Leaderboard */}
                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>&#127942; Sales Leaderboard (MTD)</h3>
                        {sortedLeaderboard.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: idx === 0 ? 'var(--primary)' : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                    </div>
                                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                                </div>
                                <span style={{ fontWeight: 700, color: idx === 0 ? 'var(--primary)' : 'white' }}>{fmt(item.commission)}</span>
                            </div>
                        ))}

                        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Monthly Units Sold</h4>
                            <BarChart data={monthlyData.slice(6)} height={120} formatValue={v => `${v}u`} />
                        </div>
                    </div>
                </div>
            </main>

            {/* New Deal Modal */}
            {showNewDealModal && (
                <Modal title="Desking Console (F&I)" onClose={() => setShowNewDealModal(false)} wide>
                    <form onSubmit={handleStartNewDeal} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* Section: Deal Basics */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h4 style={{ color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', margin: 0 }}>1. Deal Basics</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Client</label>
                                    <select value={newDeal.client} onChange={e => {
                                        const selected = clients.find(c => c.name === e.target.value);
                                        setNewDeal({ ...newDeal, client: e.target.value, clientId: selected?.id || '' });
                                    }} required style={{ ...inputStyle, height: '45px' }}>
                                        <option value="">Select a Client...</option>
                                        {clients.map(c => <option key={c.id} value={c.name}>{c.name} ({c.email || c.phone})</option>)}
                                        <option value="Walk-in Customer">Walk-in Customer</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Vehicle</label>
                                    <select value={newDeal.vehicleId} onChange={e => {
                                        const val = e.target.value;
                                        const car = vehicles.find(v => v.id === val);
                                        setNewDeal({ ...newDeal, vehicleId: val, vehicleLabel: '', salePrice: car ? car.price : '' });
                                    }} required style={{ ...inputStyle, height: '45px' }}>
                                        <option value="">Select Vehicle...</option>
                                        {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model} &mdash; {v.price}</option>)}
                                        <option value="outsourced">&#129309; Outsourced / Custom Vehicle...</option>
                                    </select>
                                    {newDeal.vehicleId === 'outsourced' && (
                                        <input
                                            required
                                            value={newDeal.vehicleLabel}
                                            onChange={e => setNewDeal({ ...newDeal, vehicleLabel: e.target.value })}
                                            placeholder="Enter vehicle model (e.g. 2025 Toyota Land Cruiser 300)"
                                            style={{ ...inputStyle, marginTop: '0.5rem' }}
                                        />
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <LabelInput label="Negotiated Sale Price" value={newDeal.salePrice} onChange={(v: string) => setNewDeal({ ...newDeal, salePrice: v })} placeholder={fmt(120000)} required />
                                <LabelInput label="Sales Advisor" value={newDeal.agent} onChange={(v: string) => setNewDeal({ ...newDeal, agent: v })} required />
                            </div>
                        </div>

                        {/* Section: Trade-In */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h4 style={{ color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', margin: 0 }}>2. Trade-In Appraisal</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <LabelInput label="Year" value={newDeal.tradeInYear} onChange={(v: string) => setNewDeal({ ...newDeal, tradeInYear: v })} placeholder="e.g. 2020" />
                                <LabelInput label="Make" value={newDeal.tradeInMake} onChange={(v: string) => setNewDeal({ ...newDeal, tradeInMake: v })} placeholder="e.g. BMW" />
                                <LabelInput label="Model" value={newDeal.tradeInModel} onChange={(v: string) => setNewDeal({ ...newDeal, tradeInModel: v })} placeholder="e.g. X5" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <LabelInput label="Mileage" value={newDeal.tradeInMileage} onChange={(v: string) => setNewDeal({ ...newDeal, tradeInMileage: v })} placeholder="e.g. 45000" />
                                <LabelInput label="KBB Appraised Value" value={newDeal.tradeInValue} onChange={(v: string) => setNewDeal({ ...newDeal, tradeInValue: v })} placeholder={fmt(0)} />
                            </div>
                        </div>

                        {/* Section: F&I Products */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h4 style={{ color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', margin: 0 }}>3. F&I Packages</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {F_I_PACKAGES.map(pkg => (
                                    <label key={pkg.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', cursor: 'pointer', border: newDeal.selectedFiProducts.includes(pkg.id) ? '1px solid var(--primary)' : '1px solid transparent' }}>
                                        <input type="checkbox" checked={newDeal.selectedFiProducts.includes(pkg.id)} onChange={e => {
                                            const set = new Set(newDeal.selectedFiProducts);
                                            e.target.checked ? set.add(pkg.id) : set.delete(pkg.id);
                                            setNewDeal({ ...newDeal, selectedFiProducts: Array.from(set) });
                                        }} style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }} />
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{pkg.name}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+{fmt(pkg.price)}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Section: Payment Terms */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h4 style={{ color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', margin: 0 }}>4. Payment Terms</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <LabelInput label="Down Payment" value={newDeal.downPayment} onChange={(v: string) => setNewDeal({ ...newDeal, downPayment: v })} placeholder={fmt(0)} />
                                <LabelInput label="APR (%)" value={newDeal.apr} onChange={(v: string) => setNewDeal({ ...newDeal, apr: v })} placeholder="5.9" />
                                <div>
                                    <label style={labelStyle}>Term (Months)</label>
                                    <select value={newDeal.term} onChange={e => setNewDeal({ ...newDeal, term: e.target.value })} style={{ ...inputStyle, height: '45px' }}>
                                        <option value="24">24 Months</option>
                                        <option value="36">36 Months</option>
                                        <option value="48">48 Months</option>
                                        <option value="60">60 Months</option>
                                        <option value="72">72 Months</option>
                                        <option value="84">84 Months</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Summary Block */}
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Base Price:</span>
                                <span>{fmt(parseFloat(newDeal.salePrice.replace(/[^0-9.-]+/g, '')) || 0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Trade-In Allowance:</span>
                                <span style={{ color: 'var(--danger)' }}>-{fmt(parseFloat(newDeal.tradeInValue.replace(/[^0-9.-]+/g, '')) || 0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>F&I Products:</span>
                                <span>+{fmt(newDeal.selectedFiProducts.reduce((sum, id) => sum + (F_I_PACKAGES.find(p => p.id === id)?.price || 0), 0))}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Down Payment:</span>
                                <span style={{ color: 'var(--danger)' }}>-{fmt(parseFloat(newDeal.downPayment.replace(/[^0-9.-]+/g, '')) || 0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '1rem', fontWeight: 600 }}>Amount Financed:</span>
                                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
                                    {fmt((parseFloat(newDeal.salePrice.replace(/[^0-9.-]+/g, '')) || 0) + newDeal.selectedFiProducts.reduce((sum, id) => sum + (F_I_PACKAGES.find(p => p.id === id)?.price || 0), 0) - (parseFloat(newDeal.downPayment.replace(/[^0-9.-]+/g, '')) || 0) - (parseFloat(newDeal.tradeInValue.replace(/[^0-9.-]+/g, '')) || 0))}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                <span style={{ fontSize: '1rem', fontWeight: 600 }}>Est. Monthly Payment:</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                                    {(() => {
                                        const amt = (parseFloat(newDeal.salePrice.replace(/[^0-9.-]+/g, '')) || 0) + newDeal.selectedFiProducts.reduce((sum, id) => sum + (F_I_PACKAGES.find(p => p.id === id)?.price || 0), 0) - (parseFloat(newDeal.downPayment.replace(/[^0-9.-]+/g, '')) || 0) - (parseFloat(newDeal.tradeInValue.replace(/[^0-9.-]+/g, '')) || 0);
                                        const r = (parseFloat(newDeal.apr) || 0) / 100 / 12;
                                        const n = parseInt(newDeal.term) || 60;
                                        const p = amt > 0 && r > 0 ? (amt * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : (amt / n);
                                        return amt > 0 ? fmt(p) : fmt(0);
                                    })()}/mo
                                </span>
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Deal Notes</label>
                            <textarea value={newDeal.notes} onChange={e => setNewDeal({ ...newDeal, notes: e.target.value })} style={{ ...inputStyle, height: '70px', resize: 'none' }} placeholder="Trade-in details, special conditions..." />
                        </div>
                        <button type="submit" className="btn-primary" style={{ padding: '1rem', fontSize: '1rem' }}>&#10003; Submit Deal &amp; Bill to Ledger</button>
                    </form>
                </Modal>
            )}

            {/* Deal Detail Modal */}
            {selectedDeal && (
                <Modal title={`Deal Details — ${selectedDeal.id}`} onClose={() => setSelectedDeal(null)} wide>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <InfoBlock label="Client" value={selectedDeal.client} />
                            <InfoBlock label="Vehicle" value={selectedDeal.vehicle} />
                            <InfoBlock label="Sale Price" value={selectedDeal.salePrice ? fmt(selectedDeal.salePrice) : '—'} highlight="white" />
                            <InfoBlock label="Gross Margin" value={fmt(selectedDeal.margin)} highlight="var(--success)" />
                            <InfoBlock label="Commission" value={fmt(selectedDeal.commission)} highlight="var(--primary)" />
                            <InfoBlock label="Agent" value={selectedDeal.agent} />
                            <InfoBlock label="Status" value={selectedDeal.status} highlight={selectedDeal.status === 'Closed' ? 'var(--success)' : 'var(--warning)'} />
                            <InfoBlock label="Date" value={selectedDeal.date} />
                        </div>
                        
                        {(selectedDeal.tradeIn || selectedDeal.financing) && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)' }}>F&I & Trade-In Details</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    {selectedDeal.tradeIn && (
                                        <InfoBlock 
                                            label="Trade-In Details" 
                                            value={`${selectedDeal.tradeIn.year} ${selectedDeal.tradeIn.make} ${selectedDeal.tradeIn.model}`} 
                                            sub={`Valued at: ${fmt(selectedDeal.tradeIn.value)} (${selectedDeal.tradeIn.mileage} mi)`}
                                        />
                                    )}
                                    {selectedDeal.financing && (
                                        <InfoBlock 
                                            label="Financing Details" 
                                            value={`${fmt(selectedDeal.financing.monthlyPayment)} /mo for ${selectedDeal.financing.term} mos`} 
                                            sub={`${selectedDeal.financing.apr}% APR | Financed: ${fmt(selectedDeal.financing.amountFinanced)}`}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {selectedDeal.fiProducts && <InfoBlock label="Selected F&I Products" value={selectedDeal.fiProducts} />}
                        {selectedDeal.notes && <InfoBlock label="Notes" value={selectedDeal.notes} />}
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button
                                className="btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}
                                onClick={() => handlePrintAgreement(selectedDeal)}
                            >
                                ðŸ–¨ï¸ Print Sales Agreement
                            </button>
                            <button className="btn-outline" onClick={() => setSelectedDeal(null)}>Close</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Full Report Modal */}
            {showReport && (
                <Modal title="Sales Performance Report" onClose={() => setShowReport(false)} wide>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                            <InfoBlock label="Total Deals" value={`${branchDeals.length}`} />
                            <InfoBlock label="Closed Deals" value={`${closedDeals.length}`} highlight="var(--success)" />
                            <InfoBlock label="Pending Finance" value={`${pendingDeals.length}`} highlight="var(--warning)" />
                            <InfoBlock label="Total Gross Margin" value={fmt(grossMarginTotal)} highlight="var(--primary)" />
                            <InfoBlock label="Total Commissions" value={fmt(commissionsTotal)} highlight="var(--secondary-accent)" />
                            <InfoBlock label="Avg. Margin %" value={`${avgMarginPct}%`} />
                        </div>
                        <div>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Top Performer Breakdown</h4>
                            {sortedLeaderboard.map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                                    <span>{i + 1}. {item.name}</span>
                                    <span style={{ fontWeight: 600 }}>{fmt(item.commission)}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button className="btn-primary" onClick={() => { exportToCSV(deals.map(d => ({ ...d })), 'sales_report.csv'); setShowReport(false); }}>â¬‡ Download Report CSV</button>
                            <button className="btn-outline" onClick={() => setShowReport(false)}>Close</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function StatCard({ label, value, sub, color }: any) {
    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{label}</p>
            <h3 style={{ fontSize: '1.65rem', margin: 0, color: color || 'white' }}>{value}</h3>
            {sub && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</p>}
        </div>
    );
}

function Modal({ title, children, onClose, wide }: any) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ width: wide ? '640px' : '480px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.3rem' }}>{title}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>âœ•</button>
                </div>
                {children}
            </div>
        </div>
    );
}

function LabelInput({ label, value, onChange, placeholder, required }: any) {
    return (
        <div>
            <label style={labelStyle}>{label}</label>
            <input type="text" value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} placeholder={placeholder} required={required} style={inputStyle} />
        </div>
    );
}

function InfoBlock({ label, value, sub, highlight }: any) {
    return (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</p>
            <p style={{ fontWeight: 600, color: highlight || 'white', fontSize: '0.9rem' }}>{value}</p>
            {sub && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{sub}</p>}
        </div>
    );
}

const labelStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' };
const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-color)', padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box' };
const thStyle: React.CSSProperties = { padding: '0.85rem 1.25rem', fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle: React.CSSProperties = { padding: '0.9rem 1.25rem', verticalAlign: 'middle', fontSize: '0.9rem' };
