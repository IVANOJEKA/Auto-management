'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { usePageGuard } from '../../hooks/usePageGuard';
import { useData, Invoice } from '../../context/DataContext';
import Sidebar from '../../components/Sidebar';
import { ProgressBar } from '../../components/Charts';
import { useCurrency } from '../../context/CurrencyContext';
import { useBusiness } from '../../context/BusinessContext';
import { validateUgandaTIN } from '../../lib/ura-client';
import '../globals.css';

export default function FinancePage() {
    const { user, isAuthenticated } = useAuth();
    const { isAllowed } = usePageGuard('finance');
    const { invoices, clients, deals, repairOrders, vehicles, createInvoice, updateInvoiceStatus, syncInvoiceWithEfris, exportToCSV, ledgerEntries, recordExpense, recordDeposit, payCommission, recordURATax, selectedBranch } = useData();
    const { formatCurrency: fmt, formatUSDToStore } = useCurrency();
    const { business } = useBusiness();
    const router = useRouter();

    useEffect(() => {
        if (!isAuthenticated) router.push('/login');
    }, [isAuthenticated, router]);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [newInvoice, setNewInvoice] = useState({ client: '', amount: '', type: 'Vehicle Sale', status: 'Pending Finance' as Invoice['status'] });
    const [activeTab, setActiveTab] = useState<'Invoices' | 'Ledger' | 'Statements' | 'Documents'>('Invoices');
    const [selectedClient, setSelectedClient] = useState<string>('');

    // Extended Finance Modals
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showCommissionModal, setShowCommissionModal] = useState(false);
    const [showURAModal, setShowURAModal] = useState(false);

    // Process Payment Modal
    const [showPayModal, setShowPayModal] = useState(false);
    const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
    const [payForm, setPayForm] = useState({ method: 'Cash' as 'Cash' | 'Mobile Money' | 'Bank Transfer', option: 'Full Payment' as 'Full Payment' | 'Installment' });

    const [newExpense, setNewExpense] = useState({ category: 'Utilities', amount: '', description: '' });
    const [newDeposit, setNewDeposit] = useState({ client: '', amount: '', method: 'Bank Transfer', notes: '' });
    const [newCommission, setNewCommission] = useState({ agent: 'Alex T.', amount: '', notes: '' });
    const [newURATax, setNewURATax] = useState({ vehicleId: '', taxType: 'Import Duty', amount: '', notes: '' });

    // URA EFRIS states
    const [showEfrisModal, setShowEfrisModal] = useState(false);
    const [efrisInvoice, setEfrisInvoice] = useState<Invoice | null>(null);
    const [clientTinInput, setClientTinInput] = useState('');
    const [whtApplicable, setWhtApplicable] = useState(false);
    const [syncingInvoice, setSyncingInvoice] = useState(false);
    const [localOffline, setLocalOffline] = useState(false);
    const [syncingAll, setSyncingAll] = useState(false);

    useEffect(() => {
        try {
            const val = localStorage.getItem('simulate_ura_offline') === 'true';
            setTimeout(() => setLocalOffline(val), 0);
        } catch {}
    }, []);

    const queuedCount = invoices.filter(i => i.efrisStatus === 'Offline Queue').length;

    const handleSyncAllQueued = async () => {
        setSyncingAll(true);
        const queued = invoices.filter(i => i.efrisStatus === 'Offline Queue');
        for (const inv of queued) {
            try {
                await syncInvoiceWithEfris(inv.id, inv.clientTin || '', !!inv.whtAmount);
            } catch (err) {
                console.error('Batch sync error for invoice ' + inv.id, err);
            }
        }
        setSyncingAll(false);
    };

    const handleTriggerEfrisSync = (inv: Invoice) => {
        setEfrisInvoice(inv);
        setClientTinInput(inv.clientTin || '');
        setWhtApplicable(!!inv.whtAmount);
        setShowEfrisModal(true);
    };

    const handleExecuteEfrisSync = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!efrisInvoice) return;
        setSyncingInvoice(true);
        await syncInvoiceWithEfris(efrisInvoice.id, clientTinInput, whtApplicable);
        setSyncingInvoice(false);
        setShowEfrisModal(false);
        setEfrisInvoice(null);
    };

    if (!isAuthenticated || !user || !isAllowed) return null;

    const handleCreateInvoice = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newInvoice.client || !newInvoice.amount) return;
        const amt = formatUSDToStore(newInvoice.amount);
        createInvoice({ client: newInvoice.client, amount: amt, type: newInvoice.type, status: newInvoice.status });
        setShowInvoiceModal(false);
        setNewInvoice({ client: '', amount: '', type: 'Vehicle Sale', status: 'Pending Finance' });
    };

    const handleExportLedger = () => {
        exportToCSV(invoices.map(inv => ({
            'Invoice ID': inv.id, 'Date': inv.date, 'Client': inv.client,
            'Amount': inv.amount, 'Type': inv.type, 'Status': inv.status, 'Paid Date': inv.paidDate || ''
        })), 'financial_ledger.csv');
    };

    const handleRecordExpense = (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(newExpense.amount.replace(/[^0-9.-]+/g, ''));
        if (!amt) return;
        recordExpense(newExpense.category, amt, newExpense.description);
        setShowExpenseModal(false);
        setNewExpense({ category: 'Utilities', amount: '', description: '' });
    };

    const handleRecordDeposit = (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(newDeposit.amount.replace(/[^0-9.-]+/g, ''));
        if (!amt || !newDeposit.client) return;
        recordDeposit(newDeposit.client, amt, newDeposit.method, newDeposit.notes);
        setShowDepositModal(false);
        setNewDeposit({ client: '', amount: '', method: 'Bank Transfer', notes: '' });
    };

    const handlePayCommission = (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(newCommission.amount.replace(/[^0-9.-]+/g, ''));
        if (!amt || !newCommission.agent) return;
        payCommission(newCommission.agent, amt, newCommission.notes);
        setShowCommissionModal(false);
        setNewCommission({ agent: 'Alex T.', amount: '', notes: '' });
    };

    const openPayModal = (invoiceId: string) => {
        setPayingInvoiceId(invoiceId);
        setPayForm({ method: 'Cash', option: 'Full Payment' });
        setShowPayModal(true);
    };

    const handleProcessPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!payingInvoiceId) return;
        updateInvoiceStatus(payingInvoiceId, 'Paid', payForm.method, payForm.option === 'Full Payment' ? 'Full' : 'Installment');
        setShowPayModal(false);
        setPayingInvoiceId(null);
        // Close the detail modal too if it was open for this invoice
        setSelectedInvoice(prev => prev && prev.id === payingInvoiceId ? null : prev);
    };

    const handleRecordURATax = (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(newURATax.amount.replace(/[^0-9.-]+/g, ''));
        if (!amt || !newURATax.vehicleId) return;
        recordURATax(newURATax.vehicleId, newURATax.taxType, amt, newURATax.notes);
        setShowURAModal(false);
        setNewURATax({ vehicleId: '', taxType: 'Import Duty', amount: '', notes: '' });
    };

    const handleGeneratePL = () => {
        const paid = invoices.filter(i => i.status === 'Paid');
        const paidTotal = paid.reduce((a, i) => a + (parseFloat(i.amount.replace(/[^0-9.-]+/g, '')) || 0), 0);
        const expenses = invoices.filter(i => i.type.includes('(Out)') || i.type.includes('Logistics'));
        const expTotal = expenses.reduce((a, i) => a + (parseFloat(i.amount.replace(/[^0-9.-]+/g, '')) || 0), 0);
        const rows = [
            { Category: 'INCOME', Item: 'Vehicle Sales', Amount: fmt(paidTotal * 0.82) },
            { Category: 'INCOME', Item: 'Service & Parts', Amount: fmt(paidTotal * 0.12) },
            { Category: 'INCOME', Item: 'F&I Products', Amount: fmt(paidTotal * 0.06) },
            { Category: 'EXPENSE', Item: 'Logistics / Freight', Amount: fmt(expTotal) },
            { Category: 'EXPENSE', Item: 'Staff Commissions', Amount: fmt(paidTotal * 0.04) },
            { Category: 'NET', Item: 'Net Profit', Amount: fmt(paidTotal - expTotal - paidTotal * 0.04) },
        ];
        exportToCSV(rows, 'PL_Statement.csv');
    };

    const handlePrintStatement = (clientName: string) => {
        if (!clientName) return;
        const client = clients.find(c => c.name === clientName);
        const clientInvoices = branchInvoices.filter(i => i.client === clientName);
        const clientDeals = deals.filter(d => d.client === clientName);
        
        // Deposits
        const depEntries = branchLedger.filter(e => e.accountId === '2100' && e.description.toLowerCase().includes(clientName.toLowerCase()));
        const creditSum = depEntries.filter(e => e.entryType === 'Credit').reduce((sum, e) => sum + e.amount, 0);
        const debitSum = depEntries.filter(e => e.entryType === 'Debit').reduce((sum, e) => sum + e.amount, 0);
        const netDeposits = Math.max(creditSum - debitSum, 0);

        const totalCars = clientDeals.length;
        const totalPaid = clientInvoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + getNum(i.amount), 0);
        const totalDebt = clientInvoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + getNum(i.amount), 0);

        // Timeline items
        const timelineItems: any[] = [];
        clientDeals.forEach(d => {
            timelineItems.push({
                date: d.date || 'Today',
                type: 'Purchase',
                label: `Purchased ${d.vehicle}`,
                reference: d.id,
                amount: d.salePrice,
            });
        });
        clientInvoices.forEach(inv => {
            timelineItems.push({
                date: inv.date,
                type: 'Invoice',
                label: `Invoice: ${inv.type} (${inv.status})`,
                reference: inv.id,
                amount: inv.amount,
            });
        });
        depEntries.forEach(entry => {
            timelineItems.push({
                date: new Date(entry.date).toLocaleDateString(),
                type: entry.entryType === 'Credit' ? 'Deposit' : 'Deposit Out',
                label: entry.description,
                reference: entry.id.split('-')[1] || entry.id,
                amount: fmt(entry.amount),
            });
        });
        
        // Clean simple date parser
        const parseDate = (dStr: string) => {
            if (dStr === 'Today' || !dStr) return new Date();
            const parts = dStr.split(' ');
            if (parts.length === 2) {
                // e.g. "Oct 15" -> mock current year
                return new Date(`${dStr} ${new Date().getFullYear()}`);
            }
            const dateParts = dStr.split('/');
            if (dateParts.length === 3) return new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
            const hyphenParts = dStr.split('-');
            if (hyphenParts.length === 3) return new Date(dStr);
            return new Date(dStr);
        };

        timelineItems.sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

        const isRegistered = business.isRegistered;
        const brandName = isRegistered ? (business.name || 'GariSphere').toUpperCase() : 'MOTOR VEHICLE DEALERSHIP';
        const brandSub = isRegistered ? business.tagline : 'CLIENT ACCOUNT STATEMENT';
        const brandContact = isRegistered 
            ? `Tel: ${business.phone || '—'} &nbsp;|&nbsp; ${business.address || '—'} &nbsp;|&nbsp; Email: ${business.email || '—'}`
            : 'Tel: ........................................ &nbsp;|&nbsp; Address: ........................................ &nbsp;|&nbsp; Email: ........................................';

        const pw = window.open('', '_blank');
        if (!pw) return;
        pw.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>Statement of Account - ${clientName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; background: #fff; padding: 30px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #1a237e; padding-bottom: 10px; margin-bottom: 20px; }
    .brand-title { font-size: 22pt; font-weight: bold; color: #1a237e; }
    .brand-sub { font-size: 9pt; color: #c62828; font-weight: bold; text-transform: uppercase; }
    .brand-contact { font-size: 8pt; color: #555; margin-top: 3px; }
    
    .title { text-align: center; font-size: 14pt; font-weight: bold; text-decoration: underline; margin-bottom: 20px; text-transform: uppercase; }
    
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .meta-block { border: 1px solid #ccc; padding: 10px; border-radius: 4px; }
    .meta-title { font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid #eee; padding-bottom: 3px; color: #1a237e; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
    
    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 25px; }
    .kpi-card { border: 1px solid #1a237e; padding: 10px; text-align: center; border-radius: 4px; background: #f8fafd; }
    .kpi-label { font-size: 7.5pt; color: #555; text-transform: uppercase; font-weight: bold; }
    .kpi-val { font-size: 12pt; font-weight: bold; color: #1a237e; margin-top: 3px; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #1a237e; color: #fff; padding: 8px 12px; font-size: 8.5pt; text-transform: uppercase; text-align: left; }
    td { border-bottom: 1px solid #eee; padding: 8px 12px; font-size: 9pt; }
    tr:nth-child(even) { background: #fafafa; }
    
    .footer-sigs { display: flex; justify-content: space-between; margin-top: 50px; }
    .sig-box { width: 220px; text-align: center; }
    .sig-line { border-bottom: 1px solid #000; margin-bottom: 5px; height: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-title">${brandName}</div>
      <div class="brand-sub">${brandSub}</div>
      <div class="brand-contact">${brandContact}</div>
    </div>
    <div style="text-align: right;">
      <h2 style="color: #1a237e;">STATEMENT OF ACCOUNT</h2>
      <p style="font-size: 8.5pt; color: #777;">Date Generated: ${new Date().toLocaleDateString()}</p>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-block">
      <div class="meta-title">Client Information</div>
      <div class="meta-row"><strong>Name:</strong> <span>${clientName}</span></div>
      <div class="meta-row"><strong>Email:</strong> <span>${client?.email || '—'}</span></div>
      <div class="meta-row"><strong>Phone:</strong> <span>${client?.phone || '—'}</span></div>
    </div>
    <div class="meta-block">
      <div class="meta-title">System Reference</div>
      <div class="meta-row"><strong>Platform:</strong> <span>GariSphere DMS</span></div>
      <div class="meta-row"><strong>Status:</strong> <span>Active Account</span></div>
      <div class="meta-row"><strong>Verification:</strong> <span>AC-CLEARED</span></div>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi-card"><div class="kpi-label">Vehicles Purchased</div><div class="kpi-val">${totalCars}</div></div>
    <div class="kpi-card"><div class="kpi-label">Total Deposits Held</div><div class="kpi-val" style="color: #2e7d32;">${fmt(netDeposits)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Payments Cleared</div><div class="kpi-val">${fmt(totalPaid)}</div></div>
    <div class="kpi-card"><div class="kpi-card-inner"><div class="kpi-label" style="color: #c62828;">Outstanding Debt</div><div class="kpi-val" style="color: #c62828;">${fmt(totalDebt)}</div></div></div>
  </div>

  <div class="title">Chronological Transaction History</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Event / Event Type</th>
        <th>Transaction Details</th>
        <th>Reference ID</th>
        <th>Value / Amount</th>
      </tr>
    </thead>
    <tbody>
      ${timelineItems.map(item => `
        <tr>
          <td>${item.date}</td>
          <td><strong>${item.type.toUpperCase()}</strong></td>
          <td>${item.label}</td>
          <td style="font-family: monospace;">${item.reference}</td>
          <td style="font-weight: bold;">${item.amount}</td>
        </tr>
      `).join('')}
      ${timelineItems.length === 0 ? `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #888;">No transactions registered.</td></tr>` : ''}
    </tbody>
  </table>

  <div class="footer-sigs">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div>Prepared By (Finance Office)</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div>Authorized Seal</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div>Client Acknowledgment</div>
    </div>
  </div>
</body>
</html>
        `);
        pw.document.close();
        setTimeout(() => { pw.focus(); pw.print(); }, 250);
    };

    // Calculations
    const getNum = (s: string) => parseFloat(s.replace(/[^0-9.-]+/g, '')) || 0;
    const branchInvoices = invoices.filter(i => selectedBranch === 'All' || i.branch === selectedBranch);
    const branchLedger = (ledgerEntries || []).filter(e => selectedBranch === 'All' || (e as any).branch === selectedBranch);
    const paidSum = branchInvoices.filter(i => i.status === 'Paid').reduce((a, i) => a + getNum(i.amount), 0);
    const pendingSum = branchInvoices.filter(i => i.status === 'Pending Finance').reduce((a, i) => a + getNum(i.amount), 0);
    const overdueSum = branchInvoices.filter(i => i.status === 'Overdue').reduce((a, i) => a + getNum(i.amount), 0);

    const cashFlow = 213800 + paidSum - overdueSum;
    const netProfitPct = 14.2;

    // Revenue mix (dynamic from real invoices)
    const saleRev = branchInvoices.filter(i => i.type === 'Vehicle Sale' && i.status === 'Paid').reduce((a, i) => a + getNum(i.amount), 0) + 1150000;
    const svcRev = branchInvoices.filter(i => i.type.includes('Service') && i.status === 'Paid').reduce((a, i) => a + getNum(i.amount), 0) + 168000;
    const fiRev = 82000;
    const totalRev = saleRev + svcRev + fiRev;

    const filteredInvoices = branchInvoices
        .filter(inv =>
            (statusFilter === 'All' || inv.status === statusFilter) &&
            (inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
             inv.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
             inv.type.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => {
            const order = { 'Overdue': 0, 'Pending Finance': 1, 'Paid': 2 };
            return (order[a.status] ?? 9) - (order[b.status] ?? 9);
        });

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto', position: 'relative' }}>

                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '1.9rem', marginBottom: '0.2rem' }}>Finance & Accounting</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Ledgers, Cash Flow & Invoicing</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '60%' }}>
                        <button className="btn-outline" onClick={handleExportLedger}>⬇ Ledger</button>
                        <button className="btn-outline" onClick={handleGeneratePL}>📄 P&L</button>
                        <button className="btn-primary" style={{ background: 'var(--secondary-accent)', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setShowExpenseModal(true)}>+ Expense</button>
                        <button className="btn-primary" style={{ background: 'var(--success)', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setShowDepositModal(true)}>+ Deposit</button>
                        <button className="btn-primary" style={{ background: 'var(--warning)', color: 'black', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setShowCommissionModal(true)}>+ Commission</button>
                        <button className="btn-primary" style={{ background: 'var(--danger)', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setShowURAModal(true)}>+ URA Tax</button>
                        <button className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setShowInvoiceModal(true)}>+ Invoice</button>
                    </div>
                </header>

                {business.uraEnabled && (
                    <div style={{ 
                        background: 'rgba(249,115,22,0.06)', 
                        border: '1px solid rgba(249,115,22,0.15)', 
                        borderRadius: 'var(--radius-sm)', 
                        padding: '0.85rem 1.25rem', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        marginTop: '-0.25rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '1.4rem' }}>🇺🇬</span>
                            <div>
                                <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    URA EFRIS e-Invoicing Integration Active
                                    <span style={{ fontSize: '0.7rem', padding: '1px 6px', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '4px', fontWeight: 600 }}>
                                        {business.uraSandboxMode ? 'Sandbox Mode' : 'Production'}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    Dealer TIN: <strong style={{ color: 'white' }}>{business.tin || 'Not Set'}</strong> &nbsp;·&nbsp; Device: {business.efrisDeviceNumber || 'N/A'}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer', margin: 0 }}>
                                <input 
                                    type="checkbox" 
                                    checked={localOffline} 
                                    onChange={(e) => {
                                        setLocalOffline(e.target.checked);
                                        localStorage.setItem('simulate_ura_offline', e.target.checked ? 'true' : 'false');
                                    }} 
                                    style={{ cursor: 'pointer', width: '14px', height: '14px' }}
                                />
                                Simulate URA Network Offline Fallback
                            </label>
                            
                            {queuedCount > 0 && (
                                <button 
                                    onClick={handleSyncAllQueued}
                                    disabled={syncingAll}
                                    className="btn-primary" 
                                    style={{ background: 'var(--warning)', color: 'black', fontSize: '0.75rem', padding: '0.4rem 0.8rem', fontWeight: 600 }}
                                >
                                    {syncingAll ? '⏳ Syncing...' : `🔁 Sync Offline Queue (${queuedCount})`}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* KPIs */}
                <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                    <StatCard label="Operating Cash Flow" value={fmt(cashFlow)} color="var(--success)" />
                    <StatCard label="Accounts Receivable" value={fmt(pendingSum)} />
                    <StatCard label="Accounts Payable / Overdue" value={fmt(8200 + overdueSum)} color="var(--warning)" />
                    <StatCard label="Net Profit Margin" value={`${netProfitPct}%`} />
                </div>

                <div className="grid-2col-2-1" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>

                    {/* Main Content Area */}
                    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <h3 
                                    style={{ fontSize: '1rem', cursor: 'pointer', color: activeTab === 'Invoices' ? 'white' : 'var(--text-muted)', borderBottom: activeTab === 'Invoices' ? '2px solid var(--primary)' : '2px solid transparent', paddingBottom: '0.25rem' }} 
                                    onClick={() => setActiveTab('Invoices')}
                                >
                                    Accounts Receivable
                                </h3>
                                <h3 
                                    style={{ fontSize: '1rem', cursor: 'pointer', color: activeTab === 'Ledger' ? 'white' : 'var(--text-muted)', borderBottom: activeTab === 'Ledger' ? '2px solid var(--primary)' : '2px solid transparent', paddingBottom: '0.25rem' }} 
                                    onClick={() => setActiveTab('Ledger')}
                                >
                                    General Ledger
                                </h3>
                                <h3 
                                    style={{ fontSize: '1rem', cursor: 'pointer', color: activeTab === 'Statements' ? 'white' : 'var(--text-muted)', borderBottom: activeTab === 'Statements' ? '2px solid var(--primary)' : '2px solid transparent', paddingBottom: '0.25rem' }} 
                                    onClick={() => setActiveTab('Statements')}
                                >
                                    Client Statements
                                </h3>
                                <h3 
                                    style={{ fontSize: '1rem', cursor: 'pointer', color: activeTab === 'Documents' ? 'white' : 'var(--text-muted)', borderBottom: activeTab === 'Documents' ? '2px solid var(--primary)' : '2px solid transparent', paddingBottom: '0.25rem' }} 
                                    onClick={() => setActiveTab('Documents')}
                                >
                                    &#128196; Document Archive
                                </h3>
                            </div>
                            
                            {activeTab === 'Invoices' && (
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <input type="text" placeholder="🔍 Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                        style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none', fontSize: '0.85rem' }} />
                                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                                        style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border-color)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none', fontSize: '0.85rem' }}>
                                        <option value="All">All Status</option>
                                        <option value="Paid">Paid</option>
                                        <option value="Pending Finance">Pending</option>
                                        <option value="Overdue">Overdue</option>
                                    </select>
                                </div>
                            )}

                            {activeTab === 'Statements' && (
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Choose Client Statement:</label>
                                    <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
                                        style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none', fontSize: '0.85rem', width: '220px', height: '38px', cursor: 'pointer' }}>
                                        <option value="">Choose a Client...</option>
                                        {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        
                        {activeTab === 'Invoices' && (
                        <div className="table-responsive"><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                    {['Invoice', 'Client', 'Type', 'Amount', 'Status', ...(business.uraEnabled ? ['URA EFRIS'] : []), 'Actions'].map(h => (
                                        <th key={h} style={thStyle}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.map((inv, idx, arr) => (
                                    <tr key={inv.id} style={{ borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: 600, color: 'var(--secondary-accent)', fontSize: '0.8rem' }}>{inv.id}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{inv.date}</div>
                                        </td>
                                        <td style={{ ...tdStyle, fontWeight: 500 }}>{inv.client}</td>
                                        <td style={tdStyle}>
                                            <span style={{ fontSize: '0.82rem', color: inv.type.includes('(Out)') ? 'var(--warning)' : 'var(--text-main)' }}>{inv.type}</span>
                                        </td>
                                        <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(inv.amount)}</td>
                                        <td style={tdStyle}>
                                            <span className={`badge ${inv.status === 'Paid' ? 'badge-success' : inv.status === 'Overdue' ? 'badge-danger' : 'badge-warning'}`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        {business.uraEnabled && (
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <span style={{
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontSize: '0.74rem',
                                                        fontWeight: 600,
                                                        background: inv.efrisStatus === 'Synced' ? 'rgba(16,185,129,0.1)' :
                                                                    inv.efrisStatus === 'Offline Queue' ? 'rgba(245,158,11,0.1)' :
                                                                    inv.efrisStatus === 'Failed' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                                                        color: inv.efrisStatus === 'Synced' ? 'var(--success)' :
                                                               inv.efrisStatus === 'Offline Queue' ? 'var(--warning)' :
                                                               inv.efrisStatus === 'Failed' ? 'var(--danger)' : 'var(--text-muted)',
                                                        border: inv.efrisStatus === 'Synced' ? '1px solid rgba(16,185,129,0.2)' :
                                                                inv.efrisStatus === 'Offline Queue' ? '1px solid rgba(245,158,11,0.2)' :
                                                                inv.efrisStatus === 'Failed' ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.1)'
                                                    }}>
                                                        {inv.efrisStatus || 'Not Synced'}
                                                    </span>
                                                    {inv.efrisStatus !== 'Synced' && (
                                                        <button 
                                                            onClick={() => handleTriggerEfrisSync(inv)} 
                                                            style={{ ...actionBtn, color: 'var(--primary)', padding: '2px 6px', fontSize: '0.74rem' }}
                                                        >
                                                            Sync
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                        <td style={tdStyle}>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                <button onClick={() => setSelectedInvoice(inv)} style={actionBtn}>View</button>
                                                {inv.status !== 'Paid' && (
                                                    <button onClick={() => openPayModal(inv.id)} style={{ ...actionBtn, color: 'var(--success)' }}>✓ Pay</button>
                                                )}
                                                {inv.status === 'Pending Finance' && (
                                                    <button onClick={() => updateInvoiceStatus(inv.id, 'Overdue')} style={{ ...actionBtn, color: 'var(--danger)' }}>⚠ Overdue</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredInvoices.length === 0 && (
                                    <tr><td colSpan={business.uraEnabled ? 7 : 6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No invoices found.</td></tr>
                                )}
                            </tbody>
                        </table></div>
                        )}

                        {activeTab === 'Ledger' && (
                        <div className="table-responsive"><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                    {['Ref / Date', 'Account', 'Description', 'Debit', 'Credit'].map(h => (
                                        <th key={h} style={thStyle}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[...branchLedger].reverse().map((entry, idx, arr) => (
                                    <tr key={entry.id} style={{ borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: 600, color: 'var(--secondary-accent)', fontSize: '0.8rem' }}>{entry.id.split('-')[1] || entry.id}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(entry.date).toLocaleDateString()} {new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: 600 }}>{entry.accountId} - {entry.accountName}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{entry.type}</div>
                                        </td>
                                        <td style={{ ...tdStyle, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{entry.description}</td>
                                        <td style={{ ...tdStyle, fontWeight: entry.entryType === 'Debit' ? 600 : 400, color: entry.entryType === 'Debit' ? 'white' : 'transparent' }}>
                                            {entry.entryType === 'Debit' ? fmt(entry.amount) : '—'}
                                        </td>
                                        <td style={{ ...tdStyle, fontWeight: entry.entryType === 'Credit' ? 600 : 400, color: entry.entryType === 'Credit' ? 'var(--primary)' : 'transparent' }}>
                                            {entry.entryType === 'Credit' ? fmt(entry.amount) : '—'}
                                        </td>
                                    </tr>
                                ))}
                                {branchLedger.length === 0 && (
                                    <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No journal entries found.</td></tr>
                                )}
                            </tbody>
                        </table></div>
                        )}

                        {activeTab === 'Statements' && (() => {
                            if (!selectedClient) {
                                return (
                                    <div style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{ fontSize: '3rem' }}>📊</span>
                                        <h4 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>No Client Selected</h4>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '380px' }}>
                                            Please choose a client from the dropdown menu above to dynamically generate their complete financial statement.
                                        </p>
                                    </div>
                                );
                            }

                            const client = clients.find(c => c.name === selectedClient);
                            const clientInvoices = branchInvoices.filter(i => i.client === selectedClient);
                            const clientDeals = deals.filter(d => d.client === selectedClient);
                            const depEntries = branchLedger.filter(e => e.accountId === '2100' && e.description.toLowerCase().includes(selectedClient.toLowerCase()));
                            
                            const creditSum = depEntries.filter(e => e.entryType === 'Credit').reduce((sum, e) => sum + e.amount, 0);
                            const debitSum = depEntries.filter(e => e.entryType === 'Debit').reduce((sum, e) => sum + e.amount, 0);
                            const netDeposits = Math.max(creditSum - debitSum, 0);

                            const totalPaid = clientInvoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + getNum(i.amount), 0);
                            const totalDebt = clientInvoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + getNum(i.amount), 0);

                            // Master timeline list
                            const timeline: any[] = [];
                            clientDeals.forEach(d => {
                                timeline.push({
                                    date: d.date || 'Today',
                                    type: 'Purchase',
                                    label: `Acquired Vehicle: ${d.vehicle}`,
                                    ref: d.id,
                                    amount: d.salePrice,
                                    color: 'var(--primary)',
                                    icon: '🏎️'
                                });
                            });
                            clientInvoices.forEach(inv => {
                                const methodTag = inv.paymentMethod ? ` · ${inv.paymentMethod}` : '';
                                const optionTag = inv.paymentOption ? ` [${inv.paymentOption}]` : '';
                                timeline.push({
                                    date: inv.date,
                                    type: 'Invoice',
                                    label: `${inv.type} (${inv.status}${methodTag}${optionTag})`,
                                    ref: inv.id,
                                    amount: inv.amount,
                                    color: inv.status === 'Paid' ? 'var(--success)' : inv.status === 'Overdue' ? 'var(--danger)' : 'var(--warning)',
                                    icon: '📋'
                                });
                            });
                            depEntries.forEach(e => {
                                timeline.push({
                                    date: new Date(e.date).toLocaleDateString(),
                                    type: e.entryType === 'Credit' ? 'Deposit' : 'Deposit Out',
                                    label: e.description,
                                    ref: e.id.split('-')[1] || e.id,
                                    amount: fmt(e.amount),
                                    color: e.entryType === 'Credit' ? 'var(--success)' : 'var(--secondary-accent)',
                                    icon: e.entryType === 'Credit' ? '💰' : '💸'
                                });
                            });

                            const parseDate = (dStr: string) => {
                                if (dStr === 'Today' || !dStr) return new Date();
                                const parts = dStr.split(' ');
                                if (parts.length === 2) return new Date(`${dStr} ${new Date().getFullYear()}`);
                                const dateParts = dStr.split('/');
                                if (dateParts.length === 3) return new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
                                return new Date(dStr);
                            };
                            timeline.sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

                            return (
                                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {/* Client Header Info */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'rgba(255,255,255,0.02)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                        <div>
                                            <h4 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>{selectedClient}</h4>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>
                                                📧 {client?.email || 'No email registered'} &nbsp;·&nbsp; 📞 {client?.phone || 'No phone registered'}
                                            </p>
                                        </div>
                                        <button className="btn-primary" style={{ fontSize: '0.82rem', padding: '0.4rem 0.9rem' }} onClick={() => handlePrintStatement(selectedClient)}>
                                            🖨️ Print Statement
                                        </button>
                                    </div>

                                    {/* Client Mini-KPI blocks */}
                                    <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.85rem 1rem' }}>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>VEHICLES BOUGHT</span>
                                            <h4 style={{ fontSize: '1.3rem', margin: '4px 0 0 0', color: 'white' }}>{clientDeals.length} units</h4>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.85rem 1rem' }}>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>DEPOSITS HELD</span>
                                            <h4 style={{ fontSize: '1.3rem', margin: '4px 0 0 0', color: 'var(--success)' }}>{fmt(netDeposits)}</h4>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.85rem 1rem' }}>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>TOTAL PAYMENTS</span>
                                            <h4 style={{ fontSize: '1.3rem', margin: '4px 0 0 0', color: 'white' }}>{fmt(totalPaid)}</h4>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.85rem 1rem' }}>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>OUTSTANDING DEBT</span>
                                            <h4 style={{ fontSize: '1.3rem', margin: '4px 0 0 0', color: totalDebt > 0 ? 'var(--danger)' : 'white' }}>{fmt(totalDebt)}</h4>
                                        </div>
                                    </div>

                                    {/* History Timeline */}
                                    <div>
                                        <h5 style={{ fontSize: '0.85rem', color: 'var(--secondary-accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', fontWeight: 700 }}>Transaction Timeline</h5>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {timeline.map((item, idx) => (
                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                                                    <span style={{ fontSize: '1.4rem' }}>{item.icon}</span>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <strong style={{ fontSize: '0.88rem' }}>{item.label}</strong>
                                                            <span style={{ fontWeight: 700, color: 'white' }}>{item.amount}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                            <span>Type: <strong style={{ color: item.color }}>{item.type}</strong> &nbsp;·&nbsp; Ref: {item.ref}</span>
                                                            <span>{item.date}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {timeline.length === 0 && (
                                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No transaction history registered for this client.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {activeTab === 'Documents' && (() => {
                            const DOC_TYPES = ['Sales Agreement', 'Proforma Invoice', 'Quotation'];
                            const docRecords = invoices
                                .filter(i => i.status === 'Document' || DOC_TYPES.includes(i.type))
                                .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
                            const thS = { padding: '0.6rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' as const, fontWeight: 600, textAlign: 'left' as const, borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' as const };
                            const tdS = { padding: '0.65rem 0.75rem', fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' as const };
                            if (docRecords.length === 0) return (
                                <div style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '3rem' }}>&#128196;</span>
                                    <h4 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>No Documents Yet</h4>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '380px' }}>Print a Sales Agreement from the Sales Desk or generate a Proforma Invoice from Quotations &mdash; each document will automatically be archived here.</p>
                                </div>
                            );
                            return (
                                <div className="table-responsive">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead><tr>
                                            <th style={thS}>Date</th>
                                            <th style={thS}>Type</th>
                                            <th style={thS}>Client</th>
                                            <th style={thS}>Reference ID</th>
                                            <th style={thS}>Amount</th>
                                            <th style={thS}>Generated By</th>
                                            <th style={thS}>Branch</th>
                                        </tr></thead>
                                        <tbody>
                                            {docRecords.map(doc => (
                                                <tr key={doc.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                                    <td style={tdS}><span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{doc.date}</span></td>
                                                    <td style={tdS}>
                                                        <span style={{ background: doc.type === 'Sales Agreement' ? 'rgba(99,102,241,0.15)' : 'rgba(16,185,129,0.15)', color: doc.type === 'Sales Agreement' ? '#a5b4fc' : '#6ee7b7', padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
                                                            {doc.type}
                                                        </span>
                                                    </td>
                                                    <td style={{ ...tdS, fontWeight: 500 }}>{doc.client}</td>
                                                    <td style={tdS}><code style={{ fontSize: '0.78rem', color: 'var(--primary)', opacity: 0.85 }}>{doc.efrisFsdn || doc.id}</code></td>
                                                    <td style={{ ...tdS, fontWeight: 600, color: 'var(--success)' }}>{doc.amount}</td>
                                                    <td style={{ ...tdS, color: 'var(--text-muted)' }}>{doc.efrisFiscalSign || '—'}</td>
                                                    <td style={{ ...tdS, fontSize: '0.75rem', color: 'var(--secondary-accent)' }}>{doc.branch || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}

                    </div>

                    {/* Revenue Summary */}
                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Revenue Mix (MTD)</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <ProgressBar label="Vehicle Sales" value={saleRev} max={totalRev} color="var(--primary)" formatValue={() => `${((saleRev / totalRev) * 100).toFixed(0)}%`} />
                            <ProgressBar label="Service & Parts" value={svcRev} max={totalRev} color="var(--secondary-accent)" formatValue={() => `${((svcRev / totalRev) * 100).toFixed(0)}%`} />
                            <ProgressBar label="Finance & Insurance" value={fiRev} max={totalRev} color="var(--success)" formatValue={() => `${((fiRev / totalRev) * 100).toFixed(0)}%`} />
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Total Revenue</span>
                                <span style={{ fontWeight: 700 }}>{fmt(totalRev)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Outstanding AR</span>
                                <span style={{ fontWeight: 700, color: 'var(--warning)' }}>{fmt(pendingSum)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Overdue</span>
                                <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{fmt(overdueSum)}</span>
                            </div>
                        </div>

                        <button className="btn-outline" style={{ marginTop: 'auto' }} onClick={handleGeneratePL}>📄 Download P&L Statement</button>
                    </div>
                </div>
            </main>

            {/* Create Invoice Modal */}
            {showInvoiceModal && (
                <Modal title="Create Invoice" onClose={() => setShowInvoiceModal(false)}>
                    <form onSubmit={handleCreateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>Client / Entity</label>
                            <select value={newInvoice.client} onChange={e => setNewInvoice({ ...newInvoice, client: e.target.value })} required style={{ ...inputStyle, height: '45px' }}>
                                <option value="">Select Entity...</option>
                                {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                <option value="Global Freight">Global Freight (Partner)</option>
                                <option value="Internal">Internal / Petty Cash</option>
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Amount</label>
                                <input type="text" value={newInvoice.amount} onChange={e => setNewInvoice({ ...newInvoice, amount: e.target.value })} placeholder="e.g. 1,200" required style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Type</label>
                                <select value={newInvoice.type} onChange={e => setNewInvoice({ ...newInvoice, type: e.target.value })} style={{ ...inputStyle, height: '45px' }}>
                                    <option>Vehicle Sale</option>
                                    <option>Service & Parts</option>
                                    <option>Logistics Cost (Out)</option>
                                    <option>F&I Product</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Initial Status</label>
                            <select value={newInvoice.status} onChange={e => setNewInvoice({ ...newInvoice, status: e.target.value as any })} style={{ ...inputStyle, height: '45px' }}>
                                <option value="Pending Finance">Pending Finance</option>
                                <option value="Paid">Paid</option>
                                <option value="Overdue">Overdue</option>
                            </select>
                        </div>
                        <button type="submit" className="btn-primary">Create Invoice</button>
                    </form>
                </Modal>
            )}

            {/* Extended Modals */}
            {showExpenseModal && (
                <Modal title="Record Operating Expense" onClose={() => setShowExpenseModal(false)}>
                    <form onSubmit={handleRecordExpense} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>Category</label>
                            <select value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })} style={{ ...inputStyle, height: '45px' }}>
                                <option>Utilities</option><option>Rent</option><option>Maintenance</option>
                                <option>Marketing</option><option>Logistics</option><option>Software / IT</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Amount</label>
                            <input type="text" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="e.g. 500" required style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Description</label>
                            <input type="text" value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} placeholder="e.g. Monthly electricity bill" required style={inputStyle} />
                        </div>
                        <button type="submit" className="btn-primary" style={{ background: 'var(--secondary-accent)' }}>Log Expense</button>
                    </form>
                </Modal>
            )}

            {showDepositModal && (
                <Modal title="Receive Customer Deposit" onClose={() => setShowDepositModal(false)}>
                    <form onSubmit={handleRecordDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>Client</label>
                            <select value={newDeposit.client} onChange={e => setNewDeposit({ ...newDeposit, client: e.target.value })} required style={{ ...inputStyle, height: '45px' }}>
                                <option value="">Select Client...</option>
                                {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Amount</label>
                                <input type="text" value={newDeposit.amount} onChange={e => setNewDeposit({ ...newDeposit, amount: e.target.value })} placeholder="e.g. 5000" required style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Method</label>
                                <select value={newDeposit.method} onChange={e => setNewDeposit({ ...newDeposit, method: e.target.value })} style={{ ...inputStyle, height: '45px' }}>
                                    <option>Bank Transfer</option><option>Mobile Money</option><option>Cash</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Notes / Reference</label>
                            <input type="text" value={newDeposit.notes} onChange={e => setNewDeposit({ ...newDeposit, notes: e.target.value })} placeholder="e.g. Deposit for Porsche 911" style={inputStyle} />
                        </div>
                        <button type="submit" className="btn-primary" style={{ background: 'var(--success)' }}>Record Deposit</button>
                    </form>
                </Modal>
            )}

            {showCommissionModal && (
                <Modal title="Pay Agent Commission" onClose={() => setShowCommissionModal(false)}>
                    <form onSubmit={handlePayCommission} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>Agent</label>
                            <select value={newCommission.agent} onChange={e => setNewCommission({ ...newCommission, agent: e.target.value })} style={{ ...inputStyle, height: '45px' }}>
                                <option>Alex T.</option><option>Sarah M.</option><option>James O.</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Amount</label>
                            <input type="text" value={newCommission.amount} onChange={e => setNewCommission({ ...newCommission, amount: e.target.value })} placeholder="e.g. 1500" required style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Notes</label>
                            <input type="text" value={newCommission.notes} onChange={e => setNewCommission({ ...newCommission, notes: e.target.value })} placeholder="e.g. Commission for May deals" required style={inputStyle} />
                        </div>
                        <button type="submit" className="btn-primary" style={{ background: 'var(--warning)', color: 'black' }}>Disburse Commission</button>
                    </form>
                </Modal>
            )}

            {showURAModal && (
                <Modal title="Pay URA Tax Compliance" onClose={() => setShowURAModal(false)}>
                    <form onSubmit={handleRecordURATax} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>Select Vehicle</label>
                            <select value={newURATax.vehicleId} onChange={e => setNewURATax({ ...newURATax, vehicleId: e.target.value })} required style={{ ...inputStyle, height: '45px' }}>
                                <option value="">Select imported vehicle...</option>
                                {vehicles.map(v => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model} - {v.vin}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Amount Paid</label>
                                <input type="text" value={newURATax.amount} onChange={e => setNewURATax({ ...newURATax, amount: e.target.value })} placeholder="e.g. 3500" required style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Tax Type</label>
                                <select value={newURATax.taxType} onChange={e => setNewURATax({ ...newURATax, taxType: e.target.value })} style={{ ...inputStyle, height: '45px' }}>
                                    <option>Import Duty</option><option>VAT</option><option>Withholding Tax</option><option>Registration Fees</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>URA PRN / Notes</label>
                            <input type="text" value={newURATax.notes} onChange={e => setNewURATax({ ...newURATax, notes: e.target.value })} placeholder="e.g. PRN: 2026123456" required style={inputStyle} />
                        </div>
                        <button type="submit" className="btn-primary" style={{ background: 'var(--danger)' }}>Record URA Tax Payment</button>
                    </form>
                </Modal>
            )}

            {/* Invoice Detail Modal */}
            {selectedInvoice && (
                <Modal title={`Invoice — ${selectedInvoice.id}`} onClose={() => setSelectedInvoice(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <InfoBlock label="Invoice ID" value={selectedInvoice.id} />
                            <InfoBlock label="Date" value={selectedInvoice.date} />
                            <InfoBlock label="Client" value={selectedInvoice.client} />
                            <InfoBlock label="Amount" value={fmt(selectedInvoice.amount)} highlight="white" />
                            <InfoBlock label="Type" value={selectedInvoice.type} />
                            <InfoBlock label="Status" value={selectedInvoice.status} highlight={selectedInvoice.status === 'Paid' ? 'var(--success)' : selectedInvoice.status === 'Overdue' ? 'var(--danger)' : 'var(--warning)'} />
                        </div>
                        {selectedInvoice.paidDate && <InfoBlock label="Paid On" value={selectedInvoice.paidDate} highlight="var(--success)" />}
                        {selectedInvoice.paymentMethod && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <InfoBlock label="Payment Method" value={selectedInvoice.paymentMethod} highlight="var(--primary)" />
                                <InfoBlock label="Payment Type" value={selectedInvoice.paymentOption || '—'} highlight={selectedInvoice.paymentOption === 'Full' ? 'var(--success)' : 'var(--warning)'} />
                            </div>
                        )}
                        {/* Vehicle + Number Plate lookup via deal */}
                        {(() => {
                            const relatedDeal = deals.find(d => d.client === selectedInvoice.client);
                            if (!relatedDeal) return null;
                            const matchedVehicle = vehicles.find(v =>
                                relatedDeal.vehicle.includes(v.make) && relatedDeal.vehicle.includes(v.model)
                            );
                            return (
                                <div style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Vehicle</div>
                                        <div style={{ fontWeight: 600, fontSize: '0.88rem', marginTop: '2px' }}>{relatedDeal.vehicle}</div>
                                    </div>
                                    {matchedVehicle?.numberPlate ? (
                                        <span style={{
                                            fontFamily: 'monospace', fontWeight: 800, fontSize: '0.95rem',
                                            background: 'rgba(234,179,8,0.15)', color: '#fbbf24',
                                            border: '1px solid rgba(234,179,8,0.4)',
                                            padding: '0.25rem 0.75rem', borderRadius: '6px',
                                            letterSpacing: '0.12em'
                                        }}>{matchedVehicle.numberPlate}</span>
                                    ) : (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No plate registered</span>
                                    )}
                                </div>
                            );
                        })()}

                        {/* URA EFRIS Section inside details */}
                        {business.uraEnabled && (
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🇺🇬 URA EFRIS Fiscal Details</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <InfoBlock label="EFRIS Status" value={selectedInvoice.efrisStatus || 'Not Synced'} highlight={selectedInvoice.efrisStatus === 'Synced' ? 'var(--success)' : selectedInvoice.efrisStatus === 'Offline Queue' ? 'var(--warning)' : 'var(--text-muted)'} />
                                    <InfoBlock label="Client TIN" value={selectedInvoice.clientTin || '—'} />
                                </div>
                                {selectedInvoice.efrisStatus === 'Synced' ? (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            <InfoBlock label="Fiscal Doc Number (FSDN)" value={selectedInvoice.efrisFsdn || '—'} />
                                            <InfoBlock label="Fiscal Sign" value={selectedInvoice.efrisFiscalSign || '—'} />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            <InfoBlock label="VAT (18%)" value={selectedInvoice.vatAmount ? fmt(selectedInvoice.vatAmount) : fmt(0)} highlight="var(--warning)" />
                                            <InfoBlock label="WHT (6%)" value={selectedInvoice.whtAmount ? fmt(selectedInvoice.whtAmount) : fmt(0)} highlight="var(--danger)" />
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                                            {/* Simulated QR Code placeholder */}
                                            <div style={{ width: '64px', height: '64px', border: '2px solid var(--primary)', background: '#fff', padding: '2px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                                <div style={{ width: '100%', height: '100%', background: 'repeating-conic-gradient(#000 0% 25%, transparent 0% 50%) 50% / 8px 8px' }} />
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'white', margin: 0 }}>EFRIS Compliance Receipt</p>
                                                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Scan to verify with Uganda Revenue Authority portal.</p>
                                                <a href={selectedInvoice.efrisQrCode} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: 'var(--primary)', textDecoration: 'underline', display: 'inline-block', marginTop: '4px' }}>
                                                    Verify Online ↗
                                                </a>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn-primary" style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem', background: 'var(--primary)' }} onClick={() => { handleTriggerEfrisSync(selectedInvoice); }}>
                                            🔁 Sync Invoice with EFRIS
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            {selectedInvoice.status !== 'Paid' && (
                                <button className="btn-primary" onClick={() => openPayModal(selectedInvoice.id)}>✓ Mark as Paid</button>
                            )}
                            {selectedInvoice.efrisStatus === 'Synced' && (
                                <button className="btn-outline" onClick={() => {
                                    const rawVal = parseFloat(selectedInvoice.amount.replace(/[^0-9.-]+/g, '')) || 0;
                                    const vatAmount = selectedInvoice.vatAmount || 0;
                                    const whtAmount = selectedInvoice.whtAmount || 0;
                                    const printWindow = window.open('', '_blank');
                                    if (printWindow) {
                                        printWindow.document.write(`
                                            <html>
                                                <head>
                                                    <title>EFRIS Fiscal Receipt - ${selectedInvoice.id}</title>
                                                    <style>
                                                        body { font-family: monospace; padding: 2rem; color: #000; background: #fff; max-width: 600px; margin: 0 auto; line-height: 1.4; }
                                                        .center { text-align: center; }
                                                        .divider { border-top: 1px dashed #000; margin: 1rem 0; }
                                                        .flex-row { display: flex; justify-content: space-between; }
                                                        .bold { font-weight: bold; }
                                                        .title { font-size: 1.2rem; font-weight: bold; }
                                                    </style>
                                                </head>
                                                <body>
                                                    <div class="center">
                                                        <div class="title">${business.name.toUpperCase()}</div>
                                                        <div>${business.tagline || 'TAX COMPLIANT RECEIPT'}</div>
                                                        <div>${business.address || 'KAMPALA, UGANDA'}</div>
                                                        <div>TIN: ${business.tin || 'NOT SET'}</div>
                                                        <div>Device ID: ${selectedInvoice.efrisFsdn?.split('-')[0].replace('FDN', 'DEV-') || 'DEV-3829'}</div>
                                                    </div>
                                                    <div class="divider"></div>
                                                    <div class="center bold">URA EFRIS FISCAL RECEIPT</div>
                                                    <div class="divider"></div>
                                                    <div class="flex-row"><span>Invoice ID:</span><span>${selectedInvoice.id}</span></div>
                                                    <div class="flex-row"><span>Date:</span><span>${selectedInvoice.date}</span></div>
                                                    <div class="flex-row"><span>Client:</span><span>${selectedInvoice.client}</span></div>
                                                    <div class="flex-row"><span>Client TIN:</span><span>${selectedInvoice.clientTin || '—'}</span></div>
                                                    ${(() => { const d = deals.find(x => x.client === selectedInvoice.client); const v = d ? vehicles.find(x => d.vehicle.includes(x.make) && d.vehicle.includes(x.model)) : null; return d ? `<div class="flex-row"><span>Vehicle:</span><span>${d.vehicle}</span></div>${v?.numberPlate ? `<div class="flex-row bold"><span>Number Plate:</span><span>${v.numberPlate}</span></div>` : ''}` : ''; })()}
                                                    <div class="divider"></div>
                                                    <div class="flex-row bold"><span>DESCRIPTION</span><span>AMOUNT</span></div>
                                                    <div class="flex-row"><span>${selectedInvoice.type}</span><span>${fmt(rawVal)}</span></div>
                                                    <div class="divider"></div>
                                                    <div class="flex-row"><span>Subtotal (Pre-tax):</span><span>${fmt(rawVal)}</span></div>
                                                    <div class="flex-row"><span>VAT (18%):</span><span>${fmt(vatAmount)}</span></div>
                                                    ${whtAmount > 0 ? `<div class="flex-row"><span>WHT (6% withheld):</span><span>-${fmt(whtAmount)}</span></div>` : ''}
                                                    <div class="flex-row bold"><span>TOTAL BILL AMOUNT:</span><span>${fmt(rawVal + vatAmount)}</span></div>
                                                    <div class="divider"></div>
                                                    <div class="center bold">EFRIS FISCAL REFERENCE</div>
                                                    <div class="flex-row"><span>FSDN:</span><span>${selectedInvoice.efrisFsdn || 'N/A'}</span></div>
                                                    <div class="flex-row"><span>Fiscal Sign:</span><span>${selectedInvoice.efrisFiscalSign || 'N/A'}</span></div>
                                                    <div class="flex-row"><span>Synced At:</span><span>${selectedInvoice.efrisSyncedAt ? new Date(selectedInvoice.efrisSyncedAt).toLocaleString() : 'N/A'}</span></div>
                                                    <div class="divider"></div>
                                                    <div class="center" style="margin-top: 1rem;">
                                                        <div style="font-size: 0.8rem; margin-bottom: 5px;">Scan to Verify</div>
                                                        <div style="width: 100px; height: 100px; border: 1px solid #000; margin: 0 auto; background: repeating-conic-gradient(#000 0% 25%, transparent 0% 50%) 50% / 10px 10px;"></div>
                                                        <div style="font-size: 0.7rem; margin-top: 0.5rem;">Thank you for your business!</div>
                                                        <div style="font-size: 0.6rem; color: #777;">Powered by GariSphere DMS URA Suite</div>
                                                    </div>
                                                </body>
                                            </html>
                                        `);
                                        printWindow.document.close();
                                        setTimeout(() => { printWindow.focus(); printWindow.print(); }, 250);
                                    }
                                }} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', color: 'white', flex: 1, cursor: 'pointer', fontWeight: 500, fontSize: '0.8rem' }}>
                                    🖨️ Fiscal Receipt
                                </button>
                            )}
                            <button className="btn-outline" onClick={() => setSelectedInvoice(null)}>Close</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* URA EFRIS Sync Modal */}
            {showEfrisModal && efrisInvoice && (() => {
                const rawVal = parseFloat(efrisInvoice.amount.replace(/[^0-9.-]+/g, '')) || 0;
                const vatVal = parseFloat((rawVal * 0.18).toFixed(2));
                const whtVal = parseFloat((rawVal * 0.06).toFixed(2));
                return (
                    <Modal title={`URA EFRIS Fiscal Sync — ${efrisInvoice.id}`} onClose={() => { setShowEfrisModal(false); setEfrisInvoice(null); }}>
                        <form onSubmit={handleExecuteEfrisSync} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Invoice Summary</p>
                                <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600 }}>
                                    <span>{efrisInvoice.client}</span>
                                    <span>{efrisInvoice.amount}</span>
                                </div>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Type: {efrisInvoice.type}</p>
                            </div>

                            <div>
                                <label style={labelStyle}>Client Taxpayer TIN (Uganda TIN - 10 digits)</label>
                                <input 
                                    type="text" 
                                    value={clientTinInput} 
                                    onChange={e => setClientTinInput(e.target.value.replace(/\D/g, '').substring(0, 10))} 
                                    placeholder="e.g. 1002938102 (Leave blank for individual non-registered)" 
                                    style={inputStyle} 
                                />
                                {clientTinInput && !validateUgandaTIN(clientTinInput) && (
                                    <p style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: '4px', margin: 0 }}>
                                        ⚠️ TIN must be exactly 10 digits.
                                    </p>
                                )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                                <input 
                                    type="checkbox" 
                                    id="whtApplicable" 
                                    checked={whtApplicable} 
                                    onChange={e => setWhtApplicable(e.target.checked)} 
                                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                />
                                <label htmlFor="whtApplicable" style={{ fontSize: '0.82rem', color: 'white', cursor: 'pointer', margin: 0 }}>
                                    Apply Withholding Tax (WHT - 6% withheld by buyer)
                                </label>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--secondary-accent)', margin: 0, textTransform: 'uppercase' }}>Calculated Taxes (Uganda Shillings Estimation)</h4>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Pre-tax Invoice Value:</span>
                                    <span>{efrisInvoice.amount} (~{fmt(rawVal * 3700).replace('$', 'UGX ')})</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>VAT (18%):</span>
                                    <span style={{ color: 'var(--warning)', fontWeight: 600 }}>+{fmt(vatVal)} (~{fmt(vatVal * 3700).replace('$', 'UGX ')})</span>
                                </div>
                                {whtApplicable && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>WHT (6%):</span>
                                        <span style={{ color: 'var(--danger)', fontWeight: 600 }}>-{fmt(whtVal)} (~{fmt(whtVal * 3700).replace('$', 'UGX ')})</span>
                                    </div>
                                )}
                                <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 700 }}>
                                    <span>Total Taxable Amount:</span>
                                    <span>{fmt(rawVal + vatVal)}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button 
                                    type="submit" 
                                    className="btn-primary" 
                                    disabled={syncingInvoice || (clientTinInput.length > 0 && !validateUgandaTIN(clientTinInput))}
                                    style={{ flex: 1, fontSize: '0.92rem', padding: '0.65rem' }}
                                >
                                    {syncingInvoice ? '⚡ Uploading to EFRIS...' : '🔌 Fiscalise Invoice'}
                                </button>
                                <button 
                                    type="button" 
                                    className="btn-outline" 
                                    onClick={() => { setShowEfrisModal(false); setEfrisInvoice(null); }}
                                    style={{ padding: '0.65rem' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </Modal>
                );
            })()}

            {/* ===== Process Payment Modal ===== */}
            {showPayModal && (() => {
                const inv = invoices.find(i => i.id === payingInvoiceId);
                return (
                    <Modal title="Process Payment" onClose={() => setShowPayModal(false)}>
                        {inv && (
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem 1.25rem', marginBottom: '0.25rem' }}>
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>INVOICE</p>
                                <p style={{ fontWeight: 700, fontSize: '1rem' }}>{inv.id} — {inv.client}</p>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', marginTop: '2px' }}>{inv.type} &nbsp;·&nbsp; <span style={{ color: 'white', fontWeight: 600 }}>{fmt(inv.amount)}</span></p>
                            </div>
                        )}
                        <form onSubmit={handleProcessPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                            {/* Payment Method */}
                            <div>
                                <label style={labelStyle}>Payment Method</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                                    {(['Cash', 'Mobile Money', 'Bank Transfer'] as const).map(method => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setPayForm(f => ({ ...f, method }))}
                                            style={{
                                                padding: '0.7rem 0.5rem',
                                                borderRadius: 'var(--radius-sm)',
                                                border: `2px solid ${payForm.method === method ? 'var(--primary)' : 'var(--border-color)'}`,
                                                background: payForm.method === method ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.02)',
                                                color: payForm.method === method ? 'white' : 'var(--text-muted)',
                                                fontWeight: payForm.method === method ? 700 : 400,
                                                cursor: 'pointer',
                                                fontSize: '0.82rem',
                                                transition: 'all 0.15s ease',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
                                            }}
                                        >
                                            <span style={{ fontSize: '1.3rem' }}>
                                                {method === 'Cash' ? '💵' : method === 'Mobile Money' ? '📱' : '🏦'}
                                            </span>
                                            {method}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Payment Option */}
                            <div>
                                <label style={labelStyle}>Payment Option</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                                    {(['Full Payment', 'Installment'] as const).map(option => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => setPayForm(f => ({ ...f, option }))}
                                            style={{
                                                padding: '0.75rem 1rem',
                                                borderRadius: 'var(--radius-sm)',
                                                border: `2px solid ${payForm.option === option ? (option === 'Full Payment' ? 'var(--success)' : 'var(--warning)') : 'var(--border-color)'}`,
                                                background: payForm.option === option ? (option === 'Full Payment' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)') : 'rgba(255,255,255,0.02)',
                                                color: payForm.option === option ? 'white' : 'var(--text-muted)',
                                                fontWeight: payForm.option === option ? 700 : 400,
                                                cursor: 'pointer',
                                                fontSize: '0.88rem',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {option === 'Full Payment' ? '✅ Full Payment' : '📆 Installment'}
                                        </button>
                                    ))}
                                </div>
                                {payForm.option === 'Installment' && (
                                    <p style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.4rem', paddingLeft: '2px' }}>
                                        ⚠️ Installment — invoice will be marked Paid for this tranche. Outstanding balance tracked separately.
                                    </p>
                                )}
                            </div>

                            {/* Summary */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                <span style={{ marginRight: '1rem' }}>📌 Method: <strong style={{ color: 'white' }}>{payForm.method}</strong></span>
                                <span>📌 Type: <strong style={{ color: payForm.option === 'Full Payment' ? 'var(--success)' : 'var(--warning)' }}>{payForm.option}</strong></span>
                            </div>

                            <button type="submit" className="btn-primary" style={{ background: 'var(--success)', fontSize: '0.95rem', padding: '0.8rem' }}>
                                ✓ Confirm Payment
                            </button>
                        </form>
                    </Modal>
                );
            })()}
        </div>
    );
}

function StatCard({ label, value, color }: any) {
    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{label}</p>
            <h3 style={{ fontSize: '1.6rem', margin: 0, color: color || 'white' }}>{value}</h3>
        </div>
    );
}

function Modal({ title, children, onClose }: any) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.3rem' }}>{title}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
                </div>
                {children}
            </div>
        </div>
    );
}

function InfoBlock({ label, value, highlight }: any) {
    return (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</p>
            <p style={{ fontWeight: 600, color: highlight || 'white', fontSize: '0.9rem' }}>{value}</p>
        </div>
    );
}

const labelStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' };
const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-color)', padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box' };
const actionBtn: React.CSSProperties = { color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.8rem', padding: '2px 0' };
const thStyle: React.CSSProperties = { padding: '0.85rem 1.25rem', fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle: React.CSSProperties = { padding: '0.9rem 1.25rem', verticalAlign: 'middle', fontSize: '0.9rem' };
