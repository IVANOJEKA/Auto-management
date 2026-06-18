'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCurrency } from '../../context/CurrencyContext';
import '../globals.css';

function PortalContent() {
    const searchParams = useSearchParams();
    const clientId = searchParams.get('client');
    const { formatCurrency: fmt } = useCurrency();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        if (!clientId) {
            setError('Missing secure client authorization token in the URL. Please request a valid portal link from your GariSphere agent.');
            setLoading(false);
            return;
        }

        const fetchPortalData = async () => {
            try {
                const res = await fetch(`/api/portal/${clientId}`);
                if (!res.ok) {
                    throw new Error(res.status === 404 ? 'Portal link not found or expired.' : 'Failed to retrieve portal data.');
                }
                const json = await res.json();
                setData(json);
            } catch (err: any) {
                setError(err.message || 'An error occurred while loading your portal.');
            } finally {
                setLoading(false);
            }
        };

        fetchPortalData();
    }, [clientId]);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#060b19', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Securing handshake and loading portal...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div style={{ minHeight: '100vh', background: '#060b19', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', padding: '2rem', textAlign: 'center' }}>
                <span style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🔒</span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)', margin: 0 }}>Access Restrained</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '450px', marginTop: '0.5rem', lineHeight: '1.5' }}>{error}</p>
                <button onClick={() => window.location.reload()} className="btn-outline" style={{ marginTop: '1.5rem' }}>Retry Handshake</button>
            </div>
        );
    }

    const { clientName, branch, tenantName, deals, invoices, repairOrders, deposits, shipments } = data;

    // Totals calculations
    const getNum = (s: string) => parseFloat((s || '').replace(/[^0-9.-]+/g, '')) || 0;
    const paidSum = invoices.filter((i: any) => i.status === 'Paid').reduce((sum: number, i: any) => sum + getNum(i.amount), 0);
    const outstandingSum = invoices.filter((i: any) => i.status !== 'Paid').reduce((sum: number, i: any) => sum + getNum(i.amount), 0);
    
    const creditSum = deposits.filter((e: any) => e.entry_type === 'Credit' || e.entryType === 'Credit').reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
    const debitSum = deposits.filter((e: any) => e.entry_type === 'Debit' || e.entryType === 'Debit').reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
    const netDeposits = Math.max(creditSum - debitSum, 0);

    // Prints Statement
    const handlePrintStatement = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const timeline: any[] = [];
        deals.forEach((d: any) => {
            timeline.push({
                date: d.date || 'Today',
                type: 'Purchase',
                label: `Acquired Vehicle: ${d.vehicle}`,
                ref: d.id.split('-')[0],
                amount: d.salePrice,
                color: '#0066ff'
            });
        });
        invoices.forEach((inv: any) => {
            const method = inv.paymentMethod || inv.payment_method ? ` - ${inv.paymentMethod || inv.payment_method}` : '';
            timeline.push({
                date: inv.date,
                type: 'Invoice',
                label: `${inv.type} (${inv.status}${method})`,
                ref: inv.id.split('-')[0],
                amount: inv.amount,
                color: inv.status === 'Paid' ? '#22c55e' : '#ef4444'
            });
        });
        deposits.forEach((e: any) => {
            const entryType = e.entry_type || e.entryType;
            timeline.push({
                date: new Date(e.date || e.created_at).toLocaleDateString(),
                type: entryType === 'Credit' ? 'Deposit' : 'Refund',
                label: e.description,
                ref: e.id.split('-')[0],
                amount: fmt(e.amount),
                color: entryType === 'Credit' ? '#22c55e' : '#38bdf8'
            });
        });

        const parseDate = (dStr: string) => {
            if (dStr === 'Today' || !dStr) return new Date();
            const dateParts = dStr.split('/');
            if (dateParts.length === 3) return new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
            return new Date(dStr);
        };
        timeline.sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

        printWindow.document.write(`
            <html>
            <head>
                <title>Client Statement - ${clientName}</title>
                <style>
                    body { font-family: 'Inter', system-ui, sans-serif; color: #1e293b; padding: 2.5rem; line-height: 1.4; }
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0066ff; padding-bottom: 1.5rem; margin-bottom: 2rem; }
                    .title { font-size: 1.75rem; font-weight: 800; color: #060b19; margin: 0; }
                    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; background: #f8fafc; padding: 1rem 1.5rem; border-radius: 6px; }
                    .meta-item { font-size: 0.875rem; }
                    .meta-item strong { display: block; color: #64748b; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.2rem; }
                    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
                    th { background: #f1f5f9; padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; }
                    td { padding: 0.85rem 1rem; font-size: 0.875rem; border-bottom: 1px solid #e2e8f0; }
                    .amount { font-weight: 700; text-align: right; }
                    th.amount { text-align: right; }
                    .badge { display: inline-block; padding: 0.2rem 0.5rem; borderRadius: 4px; font-size: 0.75rem; font-weight: 700; }
                    .summary-box { display: flex; justify-content: flex-end; gap: 2rem; margin-top: 2rem; padding: 1.5rem; background: #f8fafc; border-radius: 6px; font-size: 0.9rem; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="title">${tenantName.toUpperCase()}</div>
                        <div style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">Official Statement of Customer Account</div>
                    </div>
                    <div style="text-align: right; font-size: 0.85rem;">
                        <strong>Date Printed:</strong> ${new Date().toLocaleDateString('en-GB')}<br>
                        <strong>Branch Scope:</strong> ${branch || 'Kampala Main'}
                    </div>
                </div>

                <div class="meta-grid">
                    <div class="meta-item">
                        <strong>Client Name</strong>
                        ${clientName}
                    </div>
                    <div class="meta-item" style="text-align: right;">
                        <strong>Financial Standing</strong>
                        Net Deposits: ${fmt(netDeposits)} &nbsp;|&nbsp; Outstanding Debt: <span style="color: #ef4444; font-weight: 700;">${fmt(outstandingSum)}</span>
                    </div>
                </div>

                <h3>Account Transaction Timeline</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Reference</th>
                            <th>Description</th>
                            <th class="amount">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${timeline.map(t => `
                            <tr>
                                <td>${t.date}</td>
                                <td><span style="font-family: monospace; font-weight: 700;">${t.ref}</span></td>
                                <td><span style="color: ${t.color}; font-weight: 600;">[${t.type}]</span> ${t.label}</td>
                                <td class="amount">${t.amount}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="summary-box">
                    <div>Total Payments Settled: <strong>${fmt(paidSum)}</strong></div>
                    <div>Balance Outstanding: <strong style="color: #ef4444;">${fmt(outstandingSum)}</strong></div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    // Stepper status flow for shipments
    const steps = ['Awaiting Vessel', 'At Sea', 'Port Clearance', 'Delivered'];
    const getStepIndex = (status: string) => steps.indexOf(status);

    return (
        <div style={{ background: '#060b19', minHeight: '100vh', color: 'white', fontFamily: "'Inter', sans-serif" }}>
            {/* Top Bar */}
            <div style={{ background: '#0e172a', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.05em' }}>{tenantName.toUpperCase()}</div>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--secondary-accent)', padding: '0.2rem 0.5rem', borderRadius: '10px', fontWeight: 600 }}>CLIENT PORTAL</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Authorized Session: <strong style={{ color: 'white' }}>{clientName}</strong>
                </div>
            </div>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
                {/* Hero / Welcome */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'white', margin: 0 }}>Welcome back, {clientName}!</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>View your active vehicle shipping trackers, outstanding billing, and workshop service logs in real time.</p>
                    </div>
                    <button className="btn-primary" onClick={handlePrintStatement}>📄 Print Account Statement</button>
                </div>

                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Vehicles Purchased</span>
                        <h3 style={{ fontSize: '1.75rem', margin: '0.5rem 0 0 0', fontWeight: 800, color: 'var(--primary)' }}>{deals.length}</h3>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Outstanding Balance</span>
                        <h3 style={{ fontSize: '1.75rem', margin: '0.5rem 0 0 0', fontWeight: 800, color: outstandingSum > 0 ? 'var(--danger)' : 'var(--success)' }}>{fmt(outstandingSum)}</h3>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Shipments</span>
                        <h3 style={{ fontSize: '1.75rem', margin: '0.5rem 0 0 0', fontWeight: 800, color: 'var(--warning)' }}>{shipments.length}</h3>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Accumulated Deposits</span>
                        <h3 style={{ fontSize: '1.75rem', margin: '0.5rem 0 0 0', fontWeight: 800, color: 'var(--secondary-accent)' }}>{fmt(netDeposits)}</h3>
                    </div>
                </div>

                {/* Section 1: ACTIVE SHIPMENTS TRACKER */}
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', borderLeft: '4px solid var(--primary)', paddingLeft: '0.75rem' }}>Order Shipping Progress</h3>
                {shipments.length === 0 ? (
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
                        No active shipping orders tracked at this moment.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
                        {shipments.map((ship: any) => {
                            const currentIdx = getStepIndex(ship.status);
                            return (
                                <div key={ship.id} style={{ background: '#0e172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div>
                                            <h4 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>{ship.vehicle}</h4>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '2px 0 0 0' }}>Order ID: {ship.orderId} &nbsp;|&nbsp; Route: {ship.from} → {branch || 'Kampala Main'}</p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vessel / ETA:</span>
                                            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{ship.vessel} &nbsp;({ship.eta})</p>
                                        </div>
                                    </div>

                                    {/* Stepper progress bar */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginTop: '2rem', padding: '0 1rem' }}>
                                        <div style={{ position: 'absolute', top: '10px', left: '2rem', right: '2rem', height: '3px', background: 'rgba(255,255,255,0.08)', zIndex: 1 }} />
                                        <div style={{ position: 'absolute', top: '10px', left: '2rem', width: `${(currentIdx / (steps.length - 1)) * 100}%`, height: '3px', background: 'var(--primary)', zIndex: 2, transition: 'width 0.4s ease' }} />

                                        {steps.map((step, idx) => {
                                            const active = idx <= currentIdx;
                                            const current = idx === currentIdx;
                                            return (
                                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3, position: 'relative' }}>
                                                    <div style={{ 
                                                        width: '24px', height: '24px', borderRadius: '50%',
                                                        background: current ? 'var(--primary)' : active ? 'var(--primary)' : '#1e293b',
                                                        border: current ? '4px solid #060b19' : 'none',
                                                        boxShadow: current ? '0 0 15px var(--primary)' : 'none',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800
                                                    }}>
                                                        {active && idx < currentIdx ? '✓' : ''}
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: current ? 'white' : active ? 'var(--text-light)' : 'var(--text-muted)', fontWeight: current ? 700 : 500 }}>
                                                        {step}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Section 2: BILLING & INVOICES */}
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', borderLeft: '4px solid var(--secondary-accent)', paddingLeft: '0.75rem' }}>Billing & Invoices</h3>
                <div style={{ background: '#0e172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', overflowX: 'auto', marginBottom: '2.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <tr>
                                <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left' }}>Invoice #</th>
                                <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left' }}>Date</th>
                                <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left' }}>Type</th>
                                <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
                                <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No invoices issued.</td>
                                </tr>
                            ) : (
                                invoices.map((inv: any) => (
                                    <tr key={inv.id}>
                                        <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--secondary-accent)' }}>{inv.id.split('-')[0]}</td>
                                        <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{inv.date}</td>
                                        <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.875rem' }}>{inv.type}</td>
                                        <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.875rem', fontWeight: 700, textAlign: 'right' }}>{inv.amount}</td>
                                        <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.875rem', textAlign: 'center' }}>
                                            <span style={{ 
                                                padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                                background: inv.status === 'Paid' ? 'rgba(34, 197, 94, 0.1)' : inv.status === 'Overdue' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                color: inv.status === 'Paid' ? 'var(--success)' : inv.status === 'Overdue' ? 'var(--danger)' : 'var(--warning)'
                                            }}>
                                                {inv.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Section 3: WORKSHOP HISTORY */}
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', borderLeft: '4px solid var(--success)', paddingLeft: '0.75rem' }}>Service & Workshop History</h3>
                <div style={{ background: '#0e172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <tr>
                                <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left' }}>RO #</th>
                                <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left' }}>Vehicle</th>
                                <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left' }}>Reported Issue</th>
                                <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left' }}>Assigned Tech</th>
                                <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Total Cost</th>
                                <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {repairOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No workshop repair orders recorded.</td>
                                </tr>
                            ) : (
                                repairOrders.map((ro: any) => (
                                    <tr key={ro.id || ro.ro}>
                                        <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--success)' }}>{ro.ro}</td>
                                        <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.875rem' }}>{ro.vehicle}</td>
                                        <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-light)' }}>{ro.issue}</td>
                                        <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{ro.technician}</td>
                                        <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.875rem', fontWeight: 700, textAlign: 'right' }}>{ro.cost}</td>
                                        <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.875rem', textAlign: 'center' }}>
                                            <span style={{ 
                                                padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                                background: ro.status === 'Completed' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                color: ro.status === 'Completed' ? 'var(--success)' : 'var(--warning)'
                                            }}>
                                                {ro.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default function PortalPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', background: '#060b19', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading portal environment...</p>
            </div>
        }>
            <PortalContent />
        </Suspense>
    );
}
