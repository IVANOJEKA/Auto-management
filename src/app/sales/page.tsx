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

export default function SalesPage() {
    const { user, isAuthenticated } = useAuth();
    const { deals, vehicles, clients, closeDeal, exportToCSV, addJournalEntry, selectedBranch } = useData();
    const { formatCurrency: fmt, formatUSDToStore } = useCurrency();
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
        client: '', vehicleId: '', salePrice: '', agent: user?.name || 'Alex T.', notes: '',
        tradeInMake: '', tradeInModel: '', tradeInYear: '', tradeInMileage: '', tradeInValue: '',
        apr: '5.9', term: '60', downPayment: '0',
        selectedFiProducts: [] as string[]
    });

    if (!isAuthenticated || !user) return null;

    const availableVehicles = vehicles.filter(v => v.status === 'In Stock' || v.status === 'In Transit');

    const handleStartNewDeal = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedCar = vehicles.find(v => v.id === newDeal.vehicleId);
        if (!selectedCar || !newDeal.client) return;
        
        const originalCost = parseFloat(selectedCar.cost?.replace(/[^0-9.-]+/g, '') || selectedCar.price.replace(/[^0-9.-]+/g, '')) || 80000;
        const saleVal = parseFloat(newDeal.salePrice.replace(/[^0-9.-]+/g, '')) || (originalCost + 10000);
        const marginVal = saleVal - originalCost;
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
            client: newDeal.client, vehicle: `${selectedCar.year} ${selectedCar.make} ${selectedCar.model}`,
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
            client: '', vehicleId: '', salePrice: '', agent: user?.name || '', notes: '',
            tradeInMake: '', tradeInModel: '', tradeInYear: '', tradeInMileage: '', tradeInValue: '',
            apr: '5.9', term: '60', downPayment: '0', selectedFiProducts: []
        });
    };

    const handlePrintAgreement = (deal: any) => {
        const client = clients.find(c => c.name === deal.client);
        const salePrice = deal.salePrice || '—';
        const downPayment = deal.financing ? fmt(deal.financing.downPayment) : '—';
        const balance = deal.financing ? fmt(deal.financing.amountFinanced) : '—';
        const monthlyPayment = deal.financing ? fmt(deal.financing.monthlyPayment) : '—';
        const agreedNo = deal.id || '—';
        const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

        const isRegistered = business.isRegistered;
        const brandName = isRegistered ? (business.name || 'GariSphere').toUpperCase() : 'MOTOR VEHICLE DEALERSHIP';
        const brandSub = isRegistered ? business.tagline : 'STANDARD SALES AGREEMENT';
        const brandContact = isRegistered 
            ? `Tel: ${business.phone || '—'} &nbsp;|&nbsp; ${business.address || '—'} &nbsp;|&nbsp; Email: ${business.email || '—'}`
            : 'Tel: ........................................ &nbsp;|&nbsp; Address: ........................................ &nbsp;|&nbsp; Email: ........................................';

        const brandLogo = isRegistered ? (business.logoEmoji || '🚙') : '🚙';
        const brandLogoSecond = isRegistered ? '🏎️' : '🚙';

        const crestEmoji = isRegistered ? (business.country === 'Uganda' ? '🇺🇬' : '🌐') : '🌐';
        const republicName = isRegistered ? `The Republic of ${business.country || 'Uganda'}` : 'STANDARD MOTOR VEHICLE DOCUMENT';

        const sellerName = isRegistered ? business.name : '......................................................................';
        const sellerAddress = isRegistered ? business.address : '......................................................................';
        const sellerPhone = isRegistered ? business.phone : '......................................................................';

        const pw = window.open('', '_blank');
        if (!pw) return;
        pw.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>Sales Agreement - ${deal.client}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #000; background: #fff; padding: 0; }
    .page { max-width: 760px; margin: 0 auto; padding: 20px 30px 40px; }

    /* HEADER */
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
    .brand-name { font-size: 28pt; font-weight: 900; color: #1a237e; letter-spacing: 2px; text-transform: uppercase; font-family: Impact, 'Arial Narrow', Arial, sans-serif; }
    .brand-sub { color: #c62828; font-weight: 700; font-size: 8.5pt; letter-spacing: 0.5px; text-transform: uppercase; }
    .brand-contact { font-size: 7.5pt; color: #333; margin-top: 3px; }
    .header-cars { display: flex; gap: 8px; align-items: center; }
    .car-icon { font-size: 32pt; }

    /* DIVIDER */
    .divider-blue { border: none; border-top: 3px solid #1a237e; margin: 4px 0 2px; }
    .divider-red  { border: none; border-top: 2px solid #c62828; margin: 0 0 8px; }

    /* DOC META */
    .doc-meta { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .doc-no { font-weight: 700; font-size: 10pt; }
    .doc-date { font-size: 10pt; }
    .date-line { display: inline-block; min-width: 120px; border-bottom: 1px solid #000; margin-left: 4px; }

    /* CREST */
    .crest-wrap { text-align: center; margin: 6px 0; }
    .crest { font-size: 26pt; }
    .republic { font-size: 8pt; font-weight: 700; letter-spacing: 1px; color: #333; text-transform: uppercase; }

    /* TITLE */
    .agreement-title { text-align: center; font-size: 14pt; font-weight: 900; text-decoration: underline; text-transform: uppercase; letter-spacing: 1px; margin: 6px 0 12px; color: #000; }

    /* VEHICLE META ROW */
    .vehicle-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin-bottom: 10px; font-size: 10pt; }
    .field-row { display: flex; gap: 4px; border-bottom: 1px dotted #555; padding-bottom: 2px; }
    .field-label { font-weight: 700; white-space: nowrap; min-width: 80px; }
    .field-val { flex: 1; }

    /* SECTION HEADING */
    .section-head { font-weight: 900; text-decoration: underline; font-size: 10.5pt; color: #1a237e; margin: 10px 0 4px; text-transform: uppercase; }

    /* FORM LINES */
    .form-line { display: flex; gap: 6px; margin-bottom: 5px; font-size: 10pt; align-items: flex-end; }
    .form-line-label { white-space: nowrap; font-weight: 600; }
    .dotted-line { flex: 1; border-bottom: 1px dotted #666; min-width: 60px; height: 16px; }

    /* AGREEMENT CLAUSES */
    .agreement-head { font-weight: 900; text-decoration: underline; font-size: 10.5pt; color: #c62828; margin: 12px 0 6px; text-transform: uppercase; }
    .clause { margin-bottom: 5px; font-size: 10pt; line-height: 1.5; }
    .clause-num { font-weight: 700; margin-right: 4px; }
    .clause-label { font-weight: 700; text-decoration: underline; }
    .inline-line { display: inline-block; min-width: 100px; border-bottom: 1px dotted #555; margin: 0 4px; vertical-align: bottom; }
    .inline-line-sm { display: inline-block; min-width: 60px; border-bottom: 1px dotted #555; margin: 0 4px; vertical-align: bottom; }

    /* SIGNATURES */
    .sig-section { margin-top: 18px; }
    .buyer-sig { display: flex; gap: 40px; align-items: flex-end; margin-bottom: 16px; }
    .sig-label { font-weight: 700; font-size: 10pt; }
    .sig-line-long { flex: 1; border-bottom: 2px solid #000; margin-top: 24px; }

    .witnesses-head { font-weight: 900; text-decoration: underline; font-size: 10.5pt; margin: 10px 0 6px; text-transform: uppercase; }
    .witness-row { display: grid; grid-template-columns: 2fr 2fr 1fr; gap: 8px; margin-bottom: 8px; font-size: 10pt; align-items: flex-end; }
    .witness-no { font-weight: 700; }
    .witness-field { display: flex; flex-direction: column; gap: 2px; }
    .witness-field-label { font-size: 8pt; color: #555; }
    .witness-line { border-bottom: 1px dotted #555; height: 18px; }

    /* VEHICLE WATERMARK */
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-15deg); font-size: 80pt; opacity: 0.04; pointer-events: none; z-index: 0; white-space: nowrap; font-weight: 900; color: #000; }

    @media print {
      body { -webkit-print-color-adjust: exact; }
      .page { padding: 15px 25px 30px; }
    }
  </style>
</head>
<body>
<div class="watermark">${brandLogo}</div>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="header-cars"><span class="car-icon">${brandLogo}</span></div>
    <div style="text-align:center; flex:1;">
      <div class="brand-name">${brandName}</div>
      <div class="brand-sub">${brandSub}</div>
      <div class="brand-contact">${brandContact}</div>
    </div>
    <div class="header-cars"><span class="car-icon">${brandLogoSecond}</span></div>
  </div>

  <hr class="divider-blue">
  <hr class="divider-red">

  <!-- DOC META -->
  <div class="doc-meta">
    <div class="doc-no">No. <span style="border-bottom:1px solid #000; padding: 0 20px;">${agreedNo}</span></div>
    <div class="crest-wrap">
      <div class="crest">${crestEmoji}</div>
      <div class="republic">${republicName}</div>
    </div>
    <div class="doc-date">Date: <span class="date-line">${dateStr}</span></div>
  </div>

  <!-- TITLE -->
  <div class="agreement-title">Sales Agreement for Motor Vehicle</div>

  <!-- VEHICLE DETAILS -->
  <div class="vehicle-meta">
    <div class="field-row"><span class="field-label">Reg No:</span><span class="field-val">&nbsp;</span></div>
    <div class="field-row"><span class="field-label">Type:</span><span class="field-val">${deal.vehicle || '&nbsp;'}</span></div>
    <div class="field-row"><span class="field-label">Colour:</span><span class="field-val">&nbsp;</span></div>
    <div class="field-row"><span class="field-label">Chassis No:</span><span class="field-val">&nbsp;</span></div>
    <div class="field-row"><span class="field-label">Engine No:</span><span class="field-val">&nbsp;</span></div>
    <div class="field-row"><span class="field-label">Log Book No:</span><span class="field-val">&nbsp;</span></div>
  </div>

  <!-- SELLER DETAILS -->
  <div class="section-head">Seller's Details</div>
  <div class="form-line"><span class="form-line-label">Full names:</span><span class="dotted-line">${sellerName}</span></div>
  <div class="form-line"><span class="form-line-label">Address:</span><span class="dotted-line">${sellerAddress}</span></div>
  <div class="form-line"><span class="form-line-label">Phone:</span><span class="dotted-line">${sellerPhone}</span></div>

  <!-- BUYER DETAILS -->
  <div class="section-head">Buyer's Details</div>
  <div class="form-line"><span class="form-line-label">Full names:</span><span class="dotted-line">${deal.client || '&nbsp;'}</span></div>
  <div class="form-line"><span class="form-line-label">Address:</span><span class="dotted-line">${client?.email ? client.email : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span></div>
  <div class="form-line"><span class="form-line-label">Phone:</span><span class="dotted-line">${client?.phone || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span></div>
  <div class="form-line"><span class="form-line-label">Place of work / Residence:</span><span class="dotted-line">&nbsp;</span></div>
  <div class="form-line"><span class="form-line-label">Next of Kin:</span><span class="dotted-line">&nbsp;</span></div>

  <!-- AGREEMENT CLAUSES -->
  <div class="agreement-head">It is Hereby Agreed as Follows:</div>

  <div class="clause">
    <span class="clause-num">1.</span> That the vendor has agreed to sell the said and the purchaser has checked / tested and agreed to buy the said vehicle in the condition of &ldquo;As Is&rdquo;.
  </div>

  <div class="clause">
    <span class="clause-num">2.</span> <span class="clause-label">Consideration:</span> The agreed purchase price is
    <span class="inline-line" style="min-width:160px;">${salePrice}</span>
    And the purchaser has paid a none-refundable amount of
    <span class="inline-line" style="min-width:140px;">${downPayment}</span>
    Cheque No. <span class="inline-line" style="min-width:100px;">&nbsp;</span>
    <br>Balance is <span class="inline-line" style="min-width:140px;">${balance}</span>
    will be paid on <span class="inline-line" style="min-width:120px;">&nbsp;</span>
    <br>Failure to pay the balance within the specific period will be liable to pay a monthly interest of 10% of the balance or the vehicle will be impounded by the seller.
  </div>

  <div class="clause">
    <span class="clause-num">3.</span> Log books and Transfer forms will be given to the buyer only after completion of payment.
  </div>

  <div class="clause">
    <span class="clause-num">4.</span> If the vehicle is sold on credit basis the buyer has to deposit postdated cheque with the vendor and these cheques shall be banked on due date.
  </div>

  <div class="clause">
    <span class="clause-num">5.</span> Upon impounding the vehicle, the buyer shall be given 14 days within which to pay the balance of the purchase price together with the cost of impounding storage and security for the vehicle.
  </div>

  <!-- BUYER SIGNATURE -->
  <div class="sig-section">
    <div class="buyer-sig">
      <div>
        <div class="sig-label">Buyer</div>
        <div class="sig-line-long" style="min-width:200px;">&nbsp;</div>
      </div>
      <div style="flex:1;">
        <div class="sig-line-long">&nbsp;</div>
      </div>
    </div>

    <!-- WITNESSES -->
    <div class="witnesses-head">Witnesses</div>
    ${[1,2,3,4].map(n => `
    <div class="witness-row">
      <div class="witness-field">
        <span class="witness-field-label">${n}. Name</span>
        <div class="witness-line"></div>
      </div>
      <div class="witness-field">
        <span class="witness-field-label">Sign</span>
        <div class="witness-line"></div>
      </div>
      <div class="witness-field">
        <span class="witness-field-label">Tel</span>
        <div class="witness-line"></div>
      </div>
    </div>`).join('')}
  </div>

</div>
</body>
</html>`);
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
                        <button className="btn-outline" onClick={() => exportToCSV(deals.map(d => ({ ...d })), 'deals.csv')}>⬇ Export CSV</button>
                        <button className="btn-outline" onClick={() => setShowReport(true)}>📊 Full Report</button>
                        <button className="btn-primary" onClick={() => setShowNewDealModal(true)}>+ Start New Deal</button>
                    </div>
                </header>

                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                    <StatCard label="Units Closed" value={`${45 + closedDeals.length}`} sub={`${pendingDeals.length} pending finance`} />
                    <StatCard label="Total Gross Margin" value={fmt(grossMarginTotal)} color="var(--success)" />
                    <StatCard label="Commissions Due" value={fmt(commissionsTotal)} color="var(--primary)" />
                    <StatCard label="Avg. Deal Margin %" value={`${avgMarginPct}%`} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>

                    {/* Deals Table */}
                    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                            <h3 style={{ fontSize: '1rem' }}>Active Deals Pipeline ({branchDeals.length})</h3>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
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
                                        <td style={tdStyle}>{deal.salePrice || '—'}</td>
                                        <td style={{ ...tdStyle, color: 'var(--success)', fontWeight: 600 }}>{deal.margin}</td>
                                        <td style={{ ...tdStyle, color: 'var(--primary)' }}>{deal.commission}</td>
                                        <td style={tdStyle}>
                                            <span className={`badge ${deal.status === 'Closed' ? 'badge-success' : 'badge-warning'}`}>{deal.status}</span>
                                        </td>
                                        <td style={tdStyle}>
                                            <button onClick={() => setSelectedDeal(deal)} style={{ color: 'var(--secondary-accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem' }}>Details</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Leaderboard */}
                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>🏆 Sales Leaderboard (MTD)</h3>
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
                                    <select value={newDeal.client} onChange={e => setNewDeal({ ...newDeal, client: e.target.value })} required style={{ ...inputStyle, height: '45px' }}>
                                        <option value="">Select a Client...</option>
                                        {clients.map(c => <option key={c.id} value={c.name}>{c.name} ({c.email || c.phone})</option>)}
                                        <option value="Walk-in Customer">Walk-in Customer</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Vehicle</label>
                                    <select value={newDeal.vehicleId} onChange={e => {
                                        const car = vehicles.find(v => v.id === e.target.value);
                                        setNewDeal({ ...newDeal, vehicleId: e.target.value, salePrice: car ? car.price : '' });
                                    }} required style={{ ...inputStyle, height: '45px' }}>
                                        <option value="">Select Vehicle...</option>
                                        {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model} — {v.price}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <LabelInput label="Negotiated Sale Price" value={newDeal.salePrice} onChange={(v: string) => setNewDeal({ ...newDeal, salePrice: v })} placeholder="$120,000" required />
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
                                <LabelInput label="KBB Appraised Value" value={newDeal.tradeInValue} onChange={(v: string) => setNewDeal({ ...newDeal, tradeInValue: v })} placeholder="$0" />
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
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+${pkg.price}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Section: Payment Terms */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h4 style={{ color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', margin: 0 }}>4. Payment Terms</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <LabelInput label="Down Payment" value={newDeal.downPayment} onChange={(v: string) => setNewDeal({ ...newDeal, downPayment: v })} placeholder="$0" />
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
                                        return amt > 0 ? fmt(p) : '$0';
                                    })()}/mo
                                </span>
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Deal Notes</label>
                            <textarea value={newDeal.notes} onChange={e => setNewDeal({ ...newDeal, notes: e.target.value })} style={{ ...inputStyle, height: '70px', resize: 'none' }} placeholder="Trade-in details, special conditions..." />
                        </div>
                        <button type="submit" className="btn-primary" style={{ padding: '1rem', fontSize: '1rem' }}>✓ Submit Deal & Bill to Ledger</button>
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
                            <InfoBlock label="Sale Price" value={selectedDeal.salePrice || '—'} highlight="white" />
                            <InfoBlock label="Gross Margin" value={selectedDeal.margin} highlight="var(--success)" />
                            <InfoBlock label="Commission" value={selectedDeal.commission} highlight="var(--primary)" />
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
                                🖨️ Print Sales Agreement
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
                            <button className="btn-primary" onClick={() => { exportToCSV(deals.map(d => ({ ...d })), 'sales_report.csv'); setShowReport(false); }}>⬇ Download Report CSV</button>
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
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
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
