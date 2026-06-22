'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useBusiness } from '../../context/BusinessContext';
import Sidebar from '../../components/Sidebar';
import '../globals.css';
import { usePageGuard } from '../../hooks/usePageGuard';

interface Quote {
    id: string;
    date: string;
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    vehicleId: string;
    vehicleLabel: string;
    listPrice: number;
    discount: number;
    tradeInValue: number;
    fiProducts: string;
    validDays: number;
    notes: string;
    status: 'Draft' | 'Sent' | 'Accepted' | 'Expired';
    createdBy: string;
}

const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const MOCK_QUOTES: Quote[] = [
    { id: 'QT-2026001', date: 'May 28, 2026', clientName: 'Robert K.', clientPhone: '+256 700 111 222', clientEmail: 'robert@example.com', vehicleId: '1', vehicleLabel: '2024 BMW X5 M Competition', listPrice: 114000, discount: 4000, tradeInValue: 8000, fiProducts: 'Extended Warranty, Gap Insurance', validDays: 7, notes: 'Client requesting red color option.', status: 'Sent', createdBy: 'Alex T.' },
    { id: 'QT-2026002', date: 'May 30, 2026', clientName: 'Grace N.', clientPhone: '+256 711 333 444', clientEmail: 'grace@example.com', vehicleId: '4', vehicleLabel: '2024 Lexus LX 600', listPrice: 120000, discount: 0, tradeInValue: 0, fiProducts: 'Paint Protection Film', validDays: 14, notes: '', status: 'Accepted', createdBy: 'Sarah M.' },
    { id: 'QT-2026003', date: 'May 15, 2026', clientName: 'Peter O.', clientPhone: '+256 722 555 666', clientEmail: 'peter@example.com', vehicleId: '2', vehicleLabel: '2023 Porsche 911 Carrera S', listPrice: 135000, discount: 5000, tradeInValue: 12000, fiProducts: '', validDays: 7, notes: 'Expired — client went with competitor.', status: 'Expired', createdBy: 'Alex T.' },
];

const getNum = (s: string) => parseFloat((s || '').replace(/[^0-9.-]+/g, '')) || 0;

const validUntil = (dateStr: string, days: number) => {
    const base = new Date(dateStr);
    if (isNaN(base.getTime())) return '—';
    base.setDate(base.getDate() + days);
    return base.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const isExpired = (dateStr: string, days: number) => {
    const base = new Date(dateStr);
    if (isNaN(base.getTime())) return false;
    base.setDate(base.getDate() + days);
    return base < new Date();
};

export default function QuotesPage() {
    const { user, isAuthenticated } = useAuth();
    const { isAllowed } = usePageGuard('quotes');
    if (!isAllowed) return null;
    const { vehicles, closeDeal } = useData();
    const { formatCurrency: fmt } = useCurrency();
    const { business } = useBusiness();
    const router = useRouter();

    const [quotes, setQuotes] = useState<Quote[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('dms_quotes');
            if (saved) {
                try { return JSON.parse(saved); } catch { return MOCK_QUOTES; }
            }
        }
        return MOCK_QUOTES;
    });

    useEffect(() => {
        localStorage.setItem('dms_quotes', JSON.stringify(quotes));
    }, [quotes]);
    const [showCreate, setShowCreate] = useState(false);
    const [viewQuote, setViewQuote] = useState<Quote | null>(null);
    const [filter, setFilter] = useState<'All' | Quote['status']>('All');

    const emptyForm = { clientName: '', clientPhone: '', clientEmail: '', vehicleId: '', vehicleLabel: '', listPrice: 0, discount: 0, tradeInValue: 0, fiProducts: '', validDays: 7, notes: '' };
    const [form, setForm] = useState({ ...emptyForm });

    useEffect(() => { if (!isAuthenticated) router.push('/login'); }, [isAuthenticated, router]);
    if (!isAuthenticated || !user) return null;

    const netPrice = (q: Quote) => q.listPrice - q.discount - q.tradeInValue;
    const formNet = form.listPrice - form.discount - form.tradeInValue;

    const handleVehicleSelect = (id: string) => {
        if (id === 'outsourced') {
            setForm(f => ({ ...f, vehicleId: 'outsourced', vehicleLabel: '', listPrice: 0 }));
            return;
        }
        const v = vehicles.find(v => v.id === id);
        if (!v) { setForm(f => ({ ...f, vehicleId: '', vehicleLabel: '', listPrice: 0 })); return; }
        setForm(f => ({ ...f, vehicleId: v.id, vehicleLabel: `${v.year} ${v.make} ${v.model}`, listPrice: getNum(v.price) }));
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.clientName || !form.vehicleId) return;
        const newQ: Quote = {
            id: `QT-${Date.now().toString().slice(-7)}`,
            date: today,
            clientName: form.clientName,
            clientPhone: form.clientPhone,
            clientEmail: form.clientEmail,
            vehicleId: form.vehicleId,
            vehicleLabel: form.vehicleLabel,
            listPrice: form.listPrice,
            discount: form.discount,
            tradeInValue: form.tradeInValue,
            fiProducts: form.fiProducts,
            validDays: form.validDays,
            notes: form.notes,
            status: 'Draft',
            createdBy: user.name,
        };
        setQuotes(prev => [newQ, ...prev]);
        setShowCreate(false);
        setForm({ ...emptyForm });
    };

    const setStatus = (id: string, status: Quote['status']) => {
        setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q));
        if (viewQuote?.id === id) setViewQuote(vq => vq ? { ...vq, status } : vq);
    };

    const handleConvertToDeal = async (q: Quote) => {
        if (q.status !== 'Accepted') return;
        const vehicle = vehicles.find(v => v.id === q.vehicleId);
        await closeDeal({
            client: q.clientName,
            vehicle: q.vehicleLabel,
            salePrice: fmt(netPrice(q)),
            margin: fmt(netPrice(q) - getNum(vehicle?.cost || '0')),
            commission: fmt(netPrice(q) * 0.015),
            agent: user.name,
            status: 'Closed',
            fiProducts: q.fiProducts,
            notes: `Converted from Quote ${q.id}. ${q.notes}`,
            branch: user.branch,
        });
        setQuotes(prev => prev.map(q2 => q2.id === q.id ? { ...q2, status: 'Accepted' } : q2));
        router.push('/sales');
    };

    const handlePrint = (q: Quote) => {
        const brandName = business.isRegistered ? (business.name || 'GariSphere').toUpperCase() : 'MOTOR VEHICLE DEALERSHIP';
        const brandSub = business.isRegistered ? business.tagline : 'VEHICLE SALES & IMPORTS';
        const brandContact = business.isRegistered
            ? `Tel: ${business.phone || '—'} &nbsp;|&nbsp; ${business.address || '—'} &nbsp;|&nbsp; ${business.email || '—'}`
            : 'Tel: ........................................ &nbsp;|&nbsp; Address: ........................................';
        const expiry = validUntil(q.date, q.validDays);
        const pw = window.open('', '_blank');
        if (!pw) return;
        pw.document.write(`<!DOCTYPE html><html><head><title>Proforma Invoice — ${q.id}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; font-size: 10pt; color: #111; background: #fff; padding: 30px; }
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #1a237e; padding-bottom: 12px; margin-bottom: 20px; }
.brand-title { font-size: 20pt; font-weight: bold; color: #1a237e; }
.brand-sub { font-size: 8pt; color: #c62828; font-weight: bold; text-transform: uppercase; }
.brand-contact { font-size: 7.5pt; color: #555; margin-top: 3px; }
.doc-title { text-align: center; font-size: 14pt; font-weight: bold; text-decoration: underline; margin: 20px 0; text-transform: uppercase; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
.meta-block { border: 1px solid #ccc; padding: 10px; border-radius: 4px; }
.meta-title { font-weight: bold; font-size: 8pt; color: #1a237e; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
.meta-row { display: flex; justify-content: space-between; font-size: 9pt; margin-bottom: 3px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
th { background: #1a237e; color: #fff; padding: 8px 12px; font-size: 8.5pt; text-align: left; }
td { border-bottom: 1px solid #eee; padding: 8px 12px; font-size: 9pt; }
tr:nth-child(even) td { background: #fafafa; }
.total-row td { font-weight: bold; font-size: 11pt; background: #f0f4ff !important; color: #1a237e; }
.footer { margin-top: 40px; display: flex; justify-content: space-between; }
.sig-box { width: 200px; text-align: center; }
.sig-line { border-bottom: 1px solid #000; height: 35px; margin-bottom: 5px; }
.notice { font-size: 7.5pt; color: #666; text-align: center; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
</style></head><body>
<div class="header">
  <div>
    <div class="brand-title">${brandName}</div>
    <div class="brand-sub">${brandSub}</div>
    <div class="brand-contact">${brandContact}</div>
  </div>
  <div style="text-align:right;">
    <h2 style="color:#1a237e; font-size:14pt;">PROFORMA INVOICE</h2>
    <p style="font-size:8pt; color:#777;">Quote No: <strong>${q.id}</strong></p>
    <p style="font-size:8pt; color:#777;">Date: ${q.date} &nbsp;|&nbsp; Valid Until: <strong>${expiry}</strong></p>
  </div>
</div>
<div class="meta-grid">
  <div class="meta-block">
    <div class="meta-title">Prepared For (Buyer)</div>
    <div class="meta-row"><span>Name:</span><span>${q.clientName}</span></div>
    <div class="meta-row"><span>Phone:</span><span>${q.clientPhone || '—'}</span></div>
    <div class="meta-row"><span>Email:</span><span>${q.clientEmail || '—'}</span></div>
  </div>
  <div class="meta-block">
    <div class="meta-title">Vehicle Details</div>
    <div class="meta-row"><span>Vehicle:</span><span><strong>${q.vehicleLabel}</strong></span></div>
    <div class="meta-row"><span>F&amp;I Products:</span><span>${q.fiProducts || 'None'}</span></div>
    <div class="meta-row"><span>Prepared By:</span><span>${q.createdBy}</span></div>
  </div>
</div>
<div class="doc-title">Pricing Breakdown</div>
<table>
  <thead><tr><th>Description</th><th style="text-align:right;">Amount</th></tr></thead>
  <tbody>
    <tr><td>Vehicle List Price — ${q.vehicleLabel}</td><td style="text-align:right;">${fmt(q.listPrice)}</td></tr>
    ${q.discount > 0 ? `<tr><td>Negotiated Discount</td><td style="text-align:right; color:#c62828;">- ${fmt(q.discount)}</td></tr>` : ''}
    ${q.tradeInValue > 0 ? `<tr><td>Trade-In Vehicle Deduction</td><td style="text-align:right; color:#c62828;">- ${fmt(q.tradeInValue)}</td></tr>` : ''}
    ${q.fiProducts ? `<tr><td>F&amp;I Products: ${q.fiProducts}</td><td style="text-align:right;">Included</td></tr>` : ''}
    <tr class="total-row"><td>NET TOTAL PAYABLE</td><td style="text-align:right;">${fmt(netPrice(q))}</td></tr>
  </tbody>
</table>
${q.notes ? `<p style="font-size:8.5pt; color:#555; margin-bottom:20px;"><strong>Notes:</strong> ${q.notes}</p>` : ''}
<div class="footer">
  <div class="sig-box"><div class="sig-line"></div><div>Sales Executive</div></div>
  <div class="sig-box"><div class="sig-line"></div><div>Authorized Seal</div></div>
  <div class="sig-box"><div class="sig-line"></div><div>Client Acknowledgment</div></div>
</div>
<div class="notice">This is a Proforma Invoice only. No goods will be supplied until payment has been confirmed. Quote valid for ${q.validDays} days from date of issue (until ${expiry}).<br/>Powered by GariSphere DMS</div>
</body></html>`);
        pw.document.close();
        setTimeout(() => { pw.focus(); pw.print(); }, 250);
    };

    const statusColors: Record<Quote['status'], string> = { Draft: 'var(--text-muted)', Sent: 'var(--secondary-accent)', Accepted: 'var(--success)', Expired: 'var(--danger)' };
    const statusBadge: Record<Quote['status'], string> = { Draft: '', Sent: 'badge-info', Accepted: 'badge-success', Expired: 'badge-danger' };

    const filtered = filter === 'All' ? quotes : quotes.filter(q => q.status === filter);
    const counts = { Draft: quotes.filter(q => q.status === 'Draft').length, Sent: quotes.filter(q => q.status === 'Sent').length, Accepted: quotes.filter(q => q.status === 'Accepted').length, Expired: quotes.filter(q => q.status === 'Expired').length };

    const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-color)', padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box' };
    const labelStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto' }}>

                {/* Header */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '1.9rem', marginBottom: '0.2rem' }}>📄 Quotations & Proforma</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Generate proforma invoices and convert accepted quotes to deals</p>
                    </div>
                    <button className="btn-primary" onClick={() => setShowCreate(true)}>+ New Quotation</button>
                </header>

                {/* KPI Cards */}
                <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                    {[
                        { label: 'Total Quotes', value: quotes.length, color: undefined },
                        { label: '✅ Accepted', value: counts.Accepted, color: 'var(--success)' },
                        { label: '📨 Pending (Draft + Sent)', value: counts.Draft + counts.Sent, color: 'var(--warning)' },
                        { label: '⏰ Expired', value: counts.Expired, color: 'var(--danger)' },
                    ].map(k => (
                        <div key={k.label} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{k.label}</p>
                            <h3 style={{ fontSize: '1.7rem', margin: 0, color: k.color || 'white' }}>{k.value}</h3>
                        </div>
                    ))}
                </div>

                {/* Main Panel */}
                <div className="glass-panel" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem' }}>All Quotations ({filtered.length})</h3>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                            {(['All', 'Draft', 'Sent', 'Accepted', 'Expired'] as const).map(f => (
                                <button key={f} onClick={() => setFilter(f)} style={{
                                    padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${filter === f ? 'var(--primary)' : 'var(--border-color)'}`,
                                    background: filter === f ? 'rgba(99,102,241,0.2)' : 'transparent', color: filter === f ? 'white' : 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer'
                                }}>{f}</button>
                            ))}
                        </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                {['Quote ID', 'Date', 'Client', 'Vehicle', 'Net Price', 'Valid Until', 'Status', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '0.85rem 1.25rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No quotations found.</td></tr>}
                            {filtered.map((q, idx, arr) => {
                                const expired = isExpired(q.date, q.validDays) && q.status !== 'Accepted';
                                const effStatus = expired && q.status !== 'Expired' ? 'Expired' : q.status;
                                return (
                                    <tr key={q.id} style={{ borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '0.9rem 1.25rem', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--secondary-accent)' }}>{q.id}</td>
                                        <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{q.date}</td>
                                        <td style={{ padding: '0.9rem 1.25rem', fontWeight: 600 }}>{q.clientName}</td>
                                        <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem' }}>{q.vehicleLabel}</td>
                                        <td style={{ padding: '0.9rem 1.25rem', fontWeight: 700, color: 'var(--success)' }}>{fmt(netPrice(q))}</td>
                                        <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', color: expired && effStatus !== 'Accepted' ? 'var(--danger)' : 'var(--text-muted)' }}>{validUntil(q.date, q.validDays)}</td>
                                        <td style={{ padding: '0.9rem 1.25rem' }}>
                                            <span className={`badge ${statusBadge[effStatus] || ''}`} style={{ color: !statusBadge[effStatus] ? 'var(--text-muted)' : undefined }}>{effStatus}</span>
                                        </td>
                                        <td style={{ padding: '0.9rem 1.25rem' }}>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                <button onClick={() => setViewQuote(q)} style={aBtn}>View</button>
                                                <button onClick={() => handlePrint(q)} style={aBtn}>🖨️</button>
                                                {q.status === 'Draft' && <button onClick={() => setStatus(q.id, 'Sent')} style={{ ...aBtn, color: 'var(--secondary-accent)' }}>Send</button>}
                                                {(q.status === 'Draft' || q.status === 'Sent') && <button onClick={() => setStatus(q.id, 'Accepted')} style={{ ...aBtn, color: 'var(--success)' }}>✓ Accept</button>}
                                                {q.status !== 'Expired' && q.status !== 'Accepted' && <button onClick={() => setStatus(q.id, 'Expired')} style={{ ...aBtn, color: 'var(--danger)' }}>Expire</button>}
                                                {q.status === 'Accepted' && <button onClick={() => handleConvertToDeal(q)} style={{ ...aBtn, color: 'var(--primary)', fontWeight: 700 }}>→ Deal</button>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* ── Create Quote Modal ── */}
            {showCreate && (
                <Modal title="New Quotation" onClose={() => setShowCreate(false)}>
                    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ fontSize: '0.72rem', color: 'var(--secondary-accent)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>Client Information</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div><label style={labelStyle}>Client Name *</label><input required style={inputStyle} value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="e.g. John Doe" /></div>
                            <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={form.clientPhone} onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))} placeholder="+256 7XX XXX XXX" /></div>
                        </div>
                        <div><label style={labelStyle}>Email</label><input type="email" style={inputStyle} value={form.clientEmail} onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))} placeholder="client@email.com" /></div>

                        <p style={{ fontSize: '0.72rem', color: 'var(--secondary-accent)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', marginTop: '0.25rem' }}>Vehicle & Pricing</p>
                        <div>
                            <label style={labelStyle}>Select Vehicle *</label>
                            <select required value={form.vehicleId} onChange={e => handleVehicleSelect(e.target.value)} style={{ ...inputStyle, height: '45px' }}>
                                <option value="">Choose a vehicle...</option>
                                {vehicles.map(v => (
                                    <option key={v.id} value={v.id}>{v.year} {v.make} {v.model} — {v.price} ({v.status})</option>
                                ))}
                                <option value="outsourced">🤝 Outsourced / Custom Vehicle...</option>
                            </select>
                        </div>
                        {form.vehicleId === 'outsourced' && (
                            <div style={{ marginTop: '0.5rem' }}>
                                <label style={labelStyle}>Custom Vehicle Label *</label>
                                <input required style={inputStyle} value={form.vehicleLabel} onChange={e => setForm(f => ({ ...f, vehicleLabel: e.target.value }))} placeholder="e.g. 2025 Lexus LX600 (Outsourced)" />
                            </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                            <div><label style={labelStyle}>List Price (USD)</label><input type="number" style={inputStyle} value={form.listPrice || ''} onChange={e => setForm(f => ({ ...f, listPrice: parseFloat(e.target.value) || 0 }))} /></div>
                            <div><label style={labelStyle}>Discount</label><input type="number" style={inputStyle} value={form.discount || ''} onChange={e => setForm(f => ({ ...f, discount: parseFloat(e.target.value) || 0 }))} placeholder="0" /></div>
                            <div><label style={labelStyle}>Trade-In Value</label><input type="number" style={inputStyle} value={form.tradeInValue || ''} onChange={e => setForm(f => ({ ...f, tradeInValue: parseFloat(e.target.value) || 0 }))} placeholder="0" /></div>
                        </div>
                        <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Net Price Payable</span>
                            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--success)' }}>{fmt(formNet)}</span>
                        </div>
                        <div><label style={labelStyle}>F&I Products</label><input style={inputStyle} value={form.fiProducts} onChange={e => setForm(f => ({ ...f, fiProducts: e.target.value }))} placeholder="e.g. Extended Warranty, Gap Insurance" /></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                            <div><label style={labelStyle}>Valid for (days)</label><input type="number" style={inputStyle} value={form.validDays} onChange={e => setForm(f => ({ ...f, validDays: parseInt(e.target.value) || 7 }))} min={1} max={90} /></div>
                            <div><label style={labelStyle}>Notes</label><input style={inputStyle} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes for client..." /></div>
                        </div>
                        <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>📄 Generate Quotation</button>
                    </form>
                </Modal>
            )}

            {/* ── View Quote Modal ── */}
            {viewQuote && (
                <Modal title={`Quotation — ${viewQuote.id}`} onClose={() => setViewQuote(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <IB label="Quote ID" value={viewQuote.id} />
                            <IB label="Date" value={viewQuote.date} />
                            <IB label="Client" value={viewQuote.clientName} />
                            <IB label="Phone" value={viewQuote.clientPhone || '—'} />
                            <IB label="Email" value={viewQuote.clientEmail || '—'} />
                            <IB label="Status" value={viewQuote.status} highlight={statusColors[viewQuote.status]} />
                            <IB label="Vehicle" value={viewQuote.vehicleLabel} />
                            <IB label="Valid Until" value={validUntil(viewQuote.date, viewQuote.validDays)} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                            <IB label="List Price" value={fmt(viewQuote.listPrice)} />
                            <IB label="Discount" value={fmt(viewQuote.discount)} />
                            <IB label="Trade-In" value={fmt(viewQuote.tradeInValue)} />
                        </div>
                        <IB label="Net Payable" value={fmt(netPrice(viewQuote))} highlight="var(--success)" />
                        {viewQuote.fiProducts && <IB label="F&I Products" value={viewQuote.fiProducts} />}
                        {viewQuote.notes && <IB label="Notes" value={viewQuote.notes} />}
                        <IB label="Created By" value={viewQuote.createdBy} />
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                            <button className="btn-primary" onClick={() => handlePrint(viewQuote)}>🖨️ Print Proforma</button>
                            {viewQuote.status !== 'Accepted' && <button className="btn-primary" style={{ background: 'var(--success)' }} onClick={() => setStatus(viewQuote.id, 'Accepted')}>✓ Mark Accepted</button>}
                            {viewQuote.status === 'Accepted' && <button className="btn-primary" style={{ background: 'var(--primary)' }} onClick={() => { setViewQuote(null); handleConvertToDeal(viewQuote); }}>→ Convert to Deal</button>}
                            <button className="btn-outline" onClick={() => setViewQuote(null)}>Close</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function Modal({ title, children, onClose }: any) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ width: '560px', maxHeight: '92vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.25rem' }}>{title}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
                </div>
                {children}
            </div>
        </div>
    );
}

function IB({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
    return (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.9rem' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{label}</p>
            <p style={{ fontWeight: 600, color: highlight || 'white', fontSize: '0.88rem' }}>{value}</p>
        </div>
    );
}

const aBtn: React.CSSProperties = { color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.8rem', padding: '2px 0' };
