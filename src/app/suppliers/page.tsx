'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useData, Supplier, SupplierTransaction } from '../../context/DataContext';
import { useCurrency } from '../../context/CurrencyContext';
import Sidebar from '../../components/Sidebar';
import '../globals.css';
import { usePageGuard } from '../../hooks/usePageGuard';

const DEFAULT_SUPPLIERS: Supplier[] = [
    {
        id: 'SUP-001',
        name: 'Yokohama Auto Exports',
        contactPerson: 'Kenji Sato',
        phone: '+81 45 120 9988',
        email: 'kenji@yokohama-auto.jp',
        address: '2-11 Minatomirai, Nishi Ward, Yokohama',
        country: 'Japan',
        type: 'Overseas',
        rating: 5,
        outstandingBalance: 42000,
        creditTerms: 'Letter of Credit / Net 15',
        notes: 'Primary overseas supplier for Japanese SUVs and saloons.'
    },
    {
        id: 'SUP-002',
        name: 'Bremerhaven Port Motors',
        contactPerson: 'Dieter Müller',
        phone: '+49 471 8892 110',
        email: 'd.mueller@bremerport.de',
        address: 'Kaiserhafen 3, Bremerhaven',
        country: 'Germany',
        type: 'Overseas',
        rating: 4,
        outstandingBalance: 28000,
        creditTerms: 'Net 30',
        notes: 'Supplies premium German stock (BMW M series, Mercedes G-Wagon).'
    },
    {
        id: 'SUP-003',
        name: 'Kampala Premium Auto Spares',
        contactPerson: 'Joseph Mukasa',
        phone: '+256 772 444 888',
        email: 'mukasa@kplspares.co.ug',
        address: 'Plot 44 Kanjokya St, Kamwokya, Kampala',
        country: 'Uganda',
        type: 'Local',
        rating: 4,
        outstandingBalance: 1200,
        creditTerms: 'Net 7 / Cash',
        notes: 'Local spare parts wholesaler and engine components dealer.'
    }
];

const DEFAULT_TRANSACTIONS: SupplierTransaction[] = [
    { id: 'TX-901', supplierId: 'SUP-001', date: '2026-05-15', type: 'Vehicle Purchase', reference: 'ORD-8910 (Toyota Land Cruiser)', amount: 35000, status: 'Outstanding' },
    { id: 'TX-902', supplierId: 'SUP-001', date: '2026-05-18', type: 'Payment', reference: 'Bank Transfer #9982190', amount: -7000, status: 'Settled' },
    { id: 'TX-903', supplierId: 'SUP-002', date: '2026-05-20', type: 'Vehicle Purchase', reference: 'ORD-8912 (Mercedes S580)', amount: 28000, status: 'Outstanding' },
    { id: 'TX-904', supplierId: 'SUP-003', date: '2026-05-25', type: 'Parts Restock', reference: 'INV-44812 (Brake pads & Spark plugs)', amount: 1200, status: 'Outstanding' }
];

export default function SuppliersPage() {
    const { user, isAuthenticated } = useAuth();
    const { isAllowed } = usePageGuard('suppliers');
    const { formatCurrency: fmt } = useCurrency();
    const { suppliers, supplierTransactions: transactions, addSupplier, recordSupplierPayment, exportToCSV } = useData();
    const router = useRouter();

    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'All' | 'Local' | 'Overseas'>('All');
    
    // Modals
    const [showAddSupplier, setShowAddSupplier] = useState(false);
    const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);
    const [showRecordPayment, setShowRecordPayment] = useState<Supplier | null>(null);
    
    // Forms
    const emptyForm = { name: '', contactPerson: '', phone: '', email: '', address: '', country: 'Japan', type: 'Overseas' as 'Local' | 'Overseas', rating: 5, creditTerms: 'Net 30', notes: '' };
    const [form, setForm] = useState({ ...emptyForm });
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentRef, setPaymentRef] = useState('');

    useEffect(() => {
        if (!isAuthenticated) router.push('/login');
    }, [isAuthenticated, router]);

    if (!isAllowed || !isAuthenticated || !user) return null;

    const handleCreateSupplier = (e: React.FormEvent) => {
        e.preventDefault();
        addSupplier(form);
        setShowAddSupplier(false);
        setForm({ ...emptyForm });
    };

    const handleRecordPaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!showRecordPayment || !paymentAmount) return;
        
        const payNum = parseFloat(paymentAmount.replace(/[^0-9.-]+/g, '')) || 0;
        if (payNum <= 0) return;

        recordSupplierPayment(showRecordPayment.id, payNum, paymentRef);
        setShowRecordPayment(null);
        setPaymentAmount('');
        setPaymentRef('');
    };

    const filteredSuppliers = suppliers
        .filter(s => typeFilter === 'All' || s.type === typeFilter)
        .filter(s => !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.country.toLowerCase().includes(searchTerm.toLowerCase()));

    const totalOutstanding = suppliers.reduce((sum, s) => sum + s.outstandingBalance, 0);

    const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-color)', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box' };
    const labelStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' };
    const thStyle: React.CSSProperties = { padding: '0.85rem 1.25rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' };
    const tdStyle: React.CSSProperties = { padding: '0.9rem 1.25rem', verticalAlign: 'middle', fontSize: '0.88rem' };
    const aBtn: React.CSSProperties = { color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.8rem', padding: '2px 0' };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto' }}>
                
                {/* Header */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '1.9rem', marginBottom: '0.2rem' }}>🏦 Supplier & Vendor Desk</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage local spare parts vendors and overseas vehicle exporters</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn-outline" onClick={() => exportToCSV(suppliers.map(s => ({ ...s })), 'suppliers_directory.csv')}>⬇ Export CSV</button>
                        <button className="btn-primary" onClick={() => setShowAddSupplier(true)}>+ Register Supplier</button>
                    </div>
                </header>

                {/* Stat cards */}
                <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Registered Exporters</p>
                        <h3 style={{ fontSize: '1.7rem', margin: 0, color: 'white' }}>{suppliers.length}</h3>
                    </div>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Overseas Exporters 🚢</p>
                        <h3 style={{ fontSize: '1.7rem', margin: 0, color: 'var(--primary)' }}>{suppliers.filter(s => s.type === 'Overseas').length}</h3>
                    </div>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Local Spares Wholesalers 🏬</p>
                        <h3 style={{ fontSize: '1.7rem', margin: 0, color: 'var(--success)' }}>{suppliers.filter(s => s.type === 'Local').length}</h3>
                    </div>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Outstanding Liability</p>
                        <h3 style={{ fontSize: '1.7rem', margin: 0, color: 'var(--danger)' }}>{fmt(totalOutstanding)}</h3>
                    </div>
                </div>

                {/* Toolbar */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <input
                        type="text"
                        placeholder="🔍 Search supplier name, contact, country..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ flex: 1, ...inputStyle }}
                    />
                    <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)', padding: '0.25rem' }}>
                        {(['All', 'Local', 'Overseas'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setTypeFilter(t)}
                                style={{
                                    padding: '0.4rem 1rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontSize: '0.82rem',
                                    fontWeight: typeFilter === t ? 700 : 400,
                                    background: typeFilter === t ? 'var(--primary)' : 'transparent',
                                    color: typeFilter === t ? 'white' : 'var(--text-muted)', transition: 'all 0.15s'
                                }}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Suppliers directory table */}
                <div className="glass-panel" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                        <h3 style={{ fontSize: '1rem', margin: 0 }}>Registered Exporter & Vendor Directory</h3>
                    </div>
                    <div className="table-responsive"><table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                                {['Exporter / Wholesaler', 'Type', 'Country', 'Rating', 'Credit Terms', 'Outstanding Balance', 'Actions'].map(h => (
                                    <th key={h} style={thStyle}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSuppliers.length === 0 && (
                                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No suppliers match your search filters.</td></tr>
                            )}
                            {filteredSuppliers.map((s, idx, arr) => (
                                <tr key={s.id} style={{ borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                                        <div>{s.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>Contact: {s.contactPerson} · {s.phone}</div>
                                    </td>
                                    <td style={tdStyle}>
                                        <span className={`badge ${s.type === 'Overseas' ? 'badge-info' : 'badge-success'}`}>{s.type}</span>
                                    </td>
                                    <td style={tdStyle}>{s.country}</td>
                                    <td style={{ ...tdStyle, color: 'var(--warning)', letterSpacing: '2px' }}>
                                        {'★'.repeat(s.rating)}{'☆'.repeat(5 - s.rating)}
                                    </td>
                                    <td style={{ ...tdStyle, fontSize: '0.82rem', color: 'var(--text-muted)' }}>{s.creditTerms}</td>
                                    <td style={{ ...tdStyle, fontWeight: 700, color: s.outstandingBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                        {fmt(s.outstandingBalance)}
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', gap: '0.6rem' }}>
                                            <button onClick={() => setViewSupplier(s)} style={aBtn}>Manage</button>
                                            {s.outstandingBalance > 0 && (
                                                <button onClick={() => setShowRecordPayment(s)} style={{ ...aBtn, color: 'var(--success)' }}>Pay</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                </div>

                {/* ─── Add Supplier Modal ─── */}
                {showAddSupplier && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div className="glass-panel" style={{ width: '560px', maxHeight: '92vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>🏦 Register Showroom Supplier</h3>
                                <button onClick={() => setShowAddSupplier(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
                            </div>
                            <form onSubmit={handleCreateSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div><label style={labelStyle}>Supplier / Vendor Name *</label><input required style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Yokohama Auto Exports" /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div><label style={labelStyle}>Contact Person</label><input style={inputStyle} value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} placeholder="Kenji Sato" /></div>
                                    <div><label style={labelStyle}>Contact Phone *</label><input required style={inputStyle} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+81 XX XXXX XXXX" /></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div><label style={labelStyle}>Email Address</label><input type="email" style={inputStyle} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="kenji@yokohama.jp" /></div>
                                    <div><label style={labelStyle}>Country</label><input style={inputStyle} value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="Japan" /></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label style={labelStyle}>Supplier Type</label>
                                        <select style={{ ...inputStyle, height: '44px' }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}>
                                            <option value="Overseas">Overseas Exporter</option>
                                            <option value="Local">Local Parts Vendor</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Credit Terms</label>
                                        <input style={inputStyle} value={form.creditTerms} onChange={e => setForm({ ...form, creditTerms: e.target.value })} placeholder="Net 30" />
                                    </div>
                                </div>
                                <div><label style={labelStyle}>Physical Address</label><input style={inputStyle} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full office address" /></div>
                                <div><label style={labelStyle}>Internal Notes</label><textarea style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' } as any} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Important notes about supplier terms..." /></div>
                                <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>🏦 Register Supplier</button>
                            </form>
                        </div>
                    </div>
                )}

                {/* ─── View Supplier / Ledger Detail Modal ─── */}
                {viewSupplier && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div className="glass-panel" style={{ width: '800px', maxHeight: '92vh', overflowY: 'auto', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.3rem', margin: 0 }}>🏢 {viewSupplier.name}</h3>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Exporter Account No: {viewSupplier.id}</p>
                                </div>
                                <button onClick={() => setViewSupplier(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <h4 style={{ fontSize: '0.85rem', color: 'var(--secondary-accent)', margin: 0, textTransform: 'uppercase' }}>Supplier Details</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div style={detailBlock}><p style={detailLabel}>Contact Person</p><p style={detailVal}>{viewSupplier.contactPerson}</p></div>
                                        <div style={detailBlock}><p style={detailLabel}>Phone</p><p style={detailVal}>{viewSupplier.phone}</p></div>
                                        <div style={detailBlock}><p style={detailLabel}>Email</p><p style={detailVal}>{viewSupplier.email || '—'}</p></div>
                                        <div style={detailBlock}><p style={detailLabel}>Country</p><p style={detailVal}>{viewSupplier.country}</p></div>
                                        <div style={detailBlock}><p style={detailLabel}>Type</p><p style={{ ...detailVal, color: 'var(--primary)' }}>{viewSupplier.type}</p></div>
                                        <div style={detailBlock}><p style={detailLabel}>Credit Terms</p><p style={detailVal}>{viewSupplier.creditTerms}</p></div>
                                    </div>
                                    <div style={detailBlock}><p style={detailLabel}>Physical Address</p><p style={detailVal}>{viewSupplier.address || '—'}</p></div>
                                    {viewSupplier.notes && (
                                        <div style={detailBlock}><p style={detailLabel}>Notes</p><p style={detailVal}>{viewSupplier.notes}</p></div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <h4 style={{ fontSize: '0.85rem', color: 'var(--success)', margin: 0, textTransform: 'uppercase' }}>Account Balance Summary</h4>
                                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>OUTSTANDING SHOWROOM LIABILITY</p>
                                        <h2 style={{ fontSize: '2.2rem', margin: 0, color: viewSupplier.outstandingBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                            {fmt(viewSupplier.outstandingBalance)}
                                        </h2>
                                    </div>

                                    {/* Action History */}
                                    <h4 style={{ fontSize: '0.85rem', color: 'var(--secondary-accent)', margin: '0.5rem 0 0 0', textTransform: 'uppercase' }}>Ledger Activity</h4>
                                    <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {transactions.filter(t => t.supplierId === viewSupplier.id).map(t => (
                                            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                                                <div>
                                                    <p style={{ fontSize: '0.82rem', fontWeight: 600, margin: 0 }}>{t.type} - {t.reference}</p>
                                                    <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: 0 }}>{t.date}</p>
                                                </div>
                                                <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: t.amount > 0 ? 'var(--danger)' : 'var(--success)', alignSelf: 'center' }}>
                                                    {t.amount > 0 ? `+${fmt(t.amount)}` : fmt(t.amount)}
                                                </p>
                                            </div>
                                        ))}
                                        {transactions.filter(t => t.supplierId === viewSupplier.id).length === 0 && (
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>No logged transaction history.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Record Payment Modal ─── */}
                {showRecordPayment && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div className="glass-panel" style={{ width: '450px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.2rem', margin: 0 }}>💳 Record Supplier Payment</h3>
                                <button onClick={() => setShowRecordPayment(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.9rem 1.1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '0.25rem' }}>
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>SUPPLIER / EXPORTER</p>
                                <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>{showRecordPayment.name}</p>
                                <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600, marginTop: '4px' }}>Outstanding: {fmt(showRecordPayment.outstandingBalance)}</p>
                            </div>
                            <form onSubmit={handleRecordPaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                                <div>
                                    <label style={labelStyle}>Amount Paid (USD) *</label>
                                    <input required type="number" style={inputStyle} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="e.g. 5000" min={1} max={showRecordPayment.outstandingBalance} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Payment Method & Ref *</label>
                                    <input required style={inputStyle} value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="e.g. Bank Transfer Ref #998211" />
                                </div>
                                <button type="submit" className="btn-primary" style={{ background: 'var(--success)', padding: '0.75rem' }}>
                                    ✓ Disburse & Record Payment
                                </button>
                            </form>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}

const detailBlock: React.CSSProperties = { background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)' };
const detailLabel: React.CSSProperties = { fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0 0 0.2rem 0' };
const detailVal: React.CSSProperties = { fontSize: '0.85rem', fontWeight: 600, color: 'white', margin: 0 };
