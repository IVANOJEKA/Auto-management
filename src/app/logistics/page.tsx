'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useData, Shipment } from '../../context/DataContext';
import Sidebar from '../../components/Sidebar';
import { useCurrency } from '../../context/CurrencyContext';
import '../globals.css';

const STATUS_FLOW: Shipment['status'][] = ['Awaiting Vessel', 'At Sea', 'Port Clearance', 'Delivered'];

const STATUS_COLORS: Record<string, string> = {
    'Awaiting Vessel': '#94a3b8',
    'At Sea': '#38bdf8',
    'Port Clearance': '#f59e0b',
    'Delivered': '#10b981',
};

export default function LogisticsPage() {
    const { user, isAuthenticated } = useAuth();
    const { shipments, createShipment, updateShipmentStatus, exportToCSV, selectedBranch } = useData();
    const { formatCurrency: fmt, formatUSDToStore } = useCurrency();
    const router = useRouter();

    useEffect(() => {
        if (!isAuthenticated) router.push('/login');
    }, [isAuthenticated, router]);

    const [activeTab, setActiveTab] = useState<Shipment['status'] | 'All'>('All');
    const [showNewShipmentModal, setShowNewShipmentModal] = useState(false);
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [confirmAdvance, setConfirmAdvance] = useState<Shipment | null>(null);
    const [newShipment, setNewShipment] = useState({
        vehicle: '', from: '', eta: '', vessel: '', cost: '',
        customsEntry: '', status: 'Awaiting Vessel' as Shipment['status']
    });

    if (!isAuthenticated || !user) return null;

    const handleCreateShipment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newShipment.vehicle) return;
        createShipment({
            vehicle: newShipment.vehicle, from: newShipment.from, eta: newShipment.eta,
            vessel: newShipment.vessel || 'TBD', cost: formatUSDToStore(newShipment.cost),
            status: newShipment.status, customsEntry: newShipment.customsEntry,
            branch: selectedBranch !== 'All' ? selectedBranch as import('../../context/DataContext').Branch : user.branch
        });
        setShowNewShipmentModal(false);
        setNewShipment({ vehicle: '', from: '', eta: '', vessel: '', cost: '', customsEntry: '', status: 'Awaiting Vessel' });
    };

    const handleAdvanceStatus = (ship: Shipment) => {
        const idx = STATUS_FLOW.indexOf(ship.status);
        if (idx < STATUS_FLOW.length - 1) {
            updateShipmentStatus(ship.id, STATUS_FLOW[idx + 1]);
        }
        setConfirmAdvance(null);
        setSelectedShipment(null);
    };

    const branchShipments = shipments.filter(s => selectedBranch === 'All' || s.branch === selectedBranch);
    const tabCounts = STATUS_FLOW.reduce((acc, s) => {
        acc[s] = branchShipments.filter(sh => sh.status === s).length;
        return acc;
    }, {} as Record<string, number>);

    const filteredShipments = activeTab === 'All' ? branchShipments : branchShipments.filter(s => s.status === activeTab);

    const totalCargo = branchShipments.filter(s => s.status !== 'Delivered').reduce((a, s) => a + (parseFloat(s.cost.replace(/[^0-9.-]+/g, '')) || 0), 0);

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto', position: 'relative' }}>

                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '1.9rem', marginBottom: '0.2rem' }}>Order & Logistics</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>International vehicle procurement, shipping & customs clearance</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn-outline" onClick={() => exportToCSV(shipments.map(s => ({ ...s })), 'shipments.csv')}>⬇ Export CSV</button>
                        <button className="btn-primary" onClick={() => setShowNewShipmentModal(true)}>+ New Transit Order</button>
                    </div>
                </header>

                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                    <StatCard label="Active Shipments" value={branchShipments.filter(s => s.status !== 'Delivered').length} />
                    <StatCard label="At Sea" value={tabCounts['At Sea']} color="var(--secondary-accent)" />
                    <StatCard label="Port Clearance" value={tabCounts['Port Clearance']} color="var(--warning)" />
                    <StatCard label="Freight in Transit" value={fmt(totalCargo)} />
                </div>

                {/* Status Pipeline Visual */}
                <div className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Shipment Pipeline</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {STATUS_FLOW.map((status, idx) => (
                            <React.Fragment key={status}>
                                <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: `1px solid ${STATUS_COLORS[status]}55`, borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', textAlign: 'center' }}>
                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>{status}</p>
                                    <p style={{ fontSize: '1.4rem', fontWeight: 700, color: STATUS_COLORS[status] }}>{tabCounts[status] || 0}</p>
                                </div>
                                {idx < STATUS_FLOW.length - 1 && (
                                    <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>→</span>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Tab bar */}
                <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0', flexWrap: 'wrap' }}>
                    {(['All', ...STATUS_FLOW] as (Shipment['status'] | 'All')[]).map(tab => {
                        const count = tab === 'All' ? branchShipments.length : tabCounts[tab];
                        const isActive = activeTab === tab;
                        return (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                style={{ background: 'none', border: 'none', borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent', padding: '0.6rem 1.2rem', cursor: 'pointer', color: isActive ? 'var(--primary)' : 'var(--text-muted)', fontWeight: isActive ? 600 : 400, fontSize: '0.875rem', whiteSpace: 'nowrap', transition: 'var(--transition)' }}>
                                {tab} {count > 0 && <span style={{ fontSize: '0.72rem', marginLeft: '4px', background: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: isActive ? 'white' : 'var(--text-muted)', padding: '1px 6px', borderRadius: '10px' }}>{count}</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Shipments Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                    {filteredShipments.map(ship => {
                        const currentIdx = STATUS_FLOW.indexOf(ship.status);
                        const nextStatus = currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;
                        return (
                            <div key={ship.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', borderTop: `3px solid ${STATUS_COLORS[ship.status]}` }}>
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{ship.orderId}</p>
                                        <h4 style={{ fontSize: '0.95rem', marginTop: '0.2rem' }}>{ship.vehicle}</h4>
                                    </div>
                                    <span className={`badge`} style={{ background: STATUS_COLORS[ship.status] + '22', color: STATUS_COLORS[ship.status], border: `1px solid ${STATUS_COLORS[ship.status]}44`, whiteSpace: 'nowrap', fontSize: '0.72rem' }}>
                                        {ship.status}
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {STATUS_FLOW.map((s, idx) => (
                                        <div key={s} style={{ flex: 1, height: '4px', borderRadius: '2px', background: idx <= currentIdx ? STATUS_COLORS[ship.status] : 'rgba(255,255,255,0.08)' }} />
                                    ))}
                                </div>

                                {/* Details */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.82rem' }}>
                                    <InfoItem label="From" value={ship.from} />
                                    <InfoItem label="Vessel" value={ship.vessel} />
                                    <InfoItem label="ETA" value={ship.eta} />
                                    <InfoItem label="Freight Cost" value={ship.cost} />
                                    {ship.customsEntry && <InfoItem label="Customs Entry" value={ship.customsEntry} />}
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                    <button onClick={() => setSelectedShipment(ship)} className="btn-outline" style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}>Details</button>
                                    {nextStatus && (
                                        <button onClick={() => setConfirmAdvance(ship)} className="btn-primary" style={{ flex: 2, fontSize: '0.8rem', padding: '0.5rem' }}>
                                            → {nextStatus}
                                        </button>
                                    )}
                                    {!nextStatus && (
                                        <div style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', color: 'var(--success)' }}>✓ Delivered</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {filteredShipments.length === 0 && (
                        <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                            <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>🚢</p>
                            <p>No shipments in the &quot;{activeTab}&quot; category.</p>
                            <button className="btn-primary" onClick={() => setShowNewShipmentModal(true)} style={{ marginTop: '1rem' }}>+ Create First Shipment</button>
                        </div>
                    )}
                </div>
            </main>

            {/* New Shipment Modal */}
            {showNewShipmentModal && (
                <Modal title="Create Transit Order" onClose={() => setShowNewShipmentModal(false)}>
                    <form onSubmit={handleCreateShipment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <FormField label="Vehicle (Year, Make, Model) *" value={newShipment.vehicle} onChange={v => setNewShipment({ ...newShipment, vehicle: v })} placeholder="2024 Toyota Land Cruiser GR Sport" required />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <FormField label="Origin Port / Country" value={newShipment.from} onChange={v => setNewShipment({ ...newShipment, from: v })} placeholder="Yokohama, JP" />
                            <FormField label="ETA Date" value={newShipment.eta} onChange={v => setNewShipment({ ...newShipment, eta: v })} type="date" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <FormField label="Vessel Name" value={newShipment.vessel} onChange={v => setNewShipment({ ...newShipment, vessel: v })} placeholder="Hoegh Target" />
                            <FormField label="Freight Cost" value={newShipment.cost} onChange={v => setNewShipment({ ...newShipment, cost: v })} placeholder="e.g. 4200" />
                        </div>
                        <div>
                            <label style={labelStyle}>Initial Status</label>
                            <select value={newShipment.status} onChange={e => setNewShipment({ ...newShipment, status: e.target.value as Shipment['status'] })} style={{ ...inputStyle, height: '45px' }}>
                                {STATUS_FLOW.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <FormField label="Customs Entry No. (if applicable)" value={newShipment.customsEntry} onChange={v => setNewShipment({ ...newShipment, customsEntry: v })} placeholder="C/EN-2026-XXXX" />
                        <button type="submit" className="btn-primary">Create Transit Order</button>
                    </form>
                </Modal>
            )}

            {/* Shipment Detail Modal */}
            {selectedShipment && (
                <Modal title={`Shipment — ${selectedShipment.orderId}`} onClose={() => setSelectedShipment(null)} wide>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Progress tracker */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
                            {STATUS_FLOW.map((s, idx) => {
                                const currentIdx = STATUS_FLOW.indexOf(selectedShipment.status);
                                const done = idx <= currentIdx;
                                return (
                                    <React.Fragment key={s}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: done ? STATUS_COLORS[selectedShipment.status] : 'rgba(255,255,255,0.06)', border: done ? 'none' : '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: done ? 'white' : 'var(--text-muted)' }}>
                                                {done ? '✓' : idx + 1}
                                            </div>
                                            <span style={{ fontSize: '0.6rem', color: done ? STATUS_COLORS[selectedShipment.status] : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s.split(' ')[0]}</span>
                                        </div>
                                        {idx < STATUS_FLOW.length - 1 && <div style={{ flex: 1, height: '2px', background: idx < STATUS_FLOW.indexOf(selectedShipment.status) ? STATUS_COLORS[selectedShipment.status] : 'rgba(255,255,255,0.06)', marginBottom: '14px' }} />}
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <InfoBlock label="Vehicle" value={selectedShipment.vehicle} />
                            <InfoBlock label="Current Status" value={selectedShipment.status} highlight={STATUS_COLORS[selectedShipment.status]} />
                            <InfoBlock label="From" value={selectedShipment.from} />
                            <InfoBlock label="Vessel" value={selectedShipment.vessel} />
                            <InfoBlock label="ETA" value={selectedShipment.eta} />
                            <InfoBlock label="Freight Cost" value={selectedShipment.cost} />
                        </div>
                        {selectedShipment.customsEntry && <InfoBlock label="Customs Entry Number" value={selectedShipment.customsEntry} />}

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            {STATUS_FLOW.indexOf(selectedShipment.status) < STATUS_FLOW.length - 1 && (
                                <button className="btn-primary" onClick={() => handleAdvanceStatus(selectedShipment)} style={{ flex: 1 }}>
                                    → Advance to {STATUS_FLOW[STATUS_FLOW.indexOf(selectedShipment.status) + 1]}
                                </button>
                            )}
                            <button className="btn-outline" onClick={() => setSelectedShipment(null)}>Close</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Advance Confirm Modal */}
            {confirmAdvance && (
                <Modal title="Advance Shipment Status" onClose={() => setConfirmAdvance(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ color: 'var(--text-muted)' }}>
                            Advance <strong style={{ color: 'white' }}>{confirmAdvance.vehicle}</strong> from <strong style={{ color: STATUS_COLORS[confirmAdvance.status] }}>{confirmAdvance.status}</strong> to <strong style={{ color: STATUS_COLORS[STATUS_FLOW[STATUS_FLOW.indexOf(confirmAdvance.status) + 1]] }}>{STATUS_FLOW[STATUS_FLOW.indexOf(confirmAdvance.status) + 1]}</strong>?
                        </p>
                        {STATUS_FLOW.indexOf(confirmAdvance.status) === STATUS_FLOW.length - 2 && (
                            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', fontSize: '0.85rem', color: 'var(--success)' }}>
                                ✓ Marking as Delivered will automatically update this vehicle&apos;s inventory status to &quot;In Stock&quot;.
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button className="btn-primary" onClick={() => handleAdvanceStatus(confirmAdvance)} style={{ flex: 1 }}>Confirm</button>
                            <button className="btn-outline" onClick={() => setConfirmAdvance(null)}>Cancel</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{label}</p>
            <p style={{ fontWeight: 600, fontSize: '0.82rem' }}>{value}</p>
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

function StatCard({ label, value, color }: any) {
    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{label}</p>
            <h3 style={{ fontSize: '1.7rem', margin: 0, color: color || 'white' }}>{value}</h3>
        </div>
    );
}

function Modal({ title, children, onClose, wide }: any) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ width: wide ? '620px' : '500px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.3rem' }}>{title}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
                </div>
                {children}
            </div>
        </div>
    );
}

function FormField({ label, value, onChange, placeholder, type = 'text', required }: any) {
    return (
        <div>
            <label style={labelStyle}>{label}</label>
            <input type={type} value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                placeholder={placeholder} required={required} style={inputStyle} />
        </div>
    );
}

const labelStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' };
const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-color)', padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box' };
