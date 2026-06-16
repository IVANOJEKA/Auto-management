'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useData, RepairOrder } from '../../context/DataContext';
import Sidebar from '../../components/Sidebar';
import { useCurrency } from '../../context/CurrencyContext';
import '../globals.css';

export default function ServicePage() {
    const { user, isAuthenticated } = useAuth();
    const { repairOrders, clients, vehicles, partsInventory, addRepairOrder, updateRepairOrderStatus, updateRepairOrder, exportToCSV, showToast, addPartToRO, selectedBranch } = useData();
    const { formatCurrency, formatUSDToStore } = useCurrency();
    const router = useRouter();

    useEffect(() => {
        if (!isAuthenticated) router.push('/login');
    }, [isAuthenticated, router]);

    const [showROModal, setShowROModal] = useState(false);
    const [selectedRO, setSelectedRO] = useState<RepairOrder | null>(null);
    const [showSMSModal, setShowSMSModal] = useState(false);
    const [selectedTechFilter, setSelectedTechFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [newRO, setNewRO] = useState({ client: '', vehicle: '', issue: '', technician: 'Mike R.', due: '', status: 'In Bay' as RepairOrder['status'], laborHours: '', parts: '', cost: '' });
    
    // Parts Requisition State
    const [selectedPartId, setSelectedPartId] = useState('');
    const [partQuantity, setPartQuantity] = useState(1);

    if (!isAuthenticated || !user) return null;

    const handleSaveRO = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRO.client || !newRO.vehicle || !newRO.issue) return;
        addRepairOrder({
            client: newRO.client, vehicle: newRO.vehicle, issue: newRO.issue,
            technician: newRO.technician, due: newRO.due || 'Today, 5:00 PM',
            status: 'In Bay', laborHours: parseFloat(newRO.laborHours) || 0,
            parts: newRO.parts, cost: formatUSDToStore(newRO.cost),
            branch: (selectedBranch !== 'All' ? selectedBranch : user.branch) as any
        });
        setShowROModal(false);
        setNewRO({ client: '', vehicle: '', issue: '', technician: 'Mike R.', due: '', status: 'In Bay', laborHours: '', parts: '', cost: '' });
    };

    const handleAdvanceStatus = (ro: RepairOrder) => {
        const next: Record<string, RepairOrder['status']> = { 'In Bay': 'Awaiting Parts', 'Awaiting Parts': 'Completed', 'Completed': 'In Bay' };
        updateRepairOrderStatus(ro.ro, next[ro.status]);
    };

    const handleAddPart = () => {
        if (!selectedRO || !selectedPartId || partQuantity <= 0) return;
        addPartToRO(selectedRO.ro, selectedPartId, partQuantity);
        
        // Refresh selectedRO from the latest state to reflect new parts
        const updatedRo = repairOrders.find(r => r.ro === selectedRO.ro);
        if (updatedRo) setSelectedRO(updatedRo);
        
        setSelectedPartId('');
        setPartQuantity(1);
    };

    // Insurance renewal data (static for now, realistic)
    const renewals = [
        { client: 'Michael K.', vehicle: 'Porsche 911', days: 3, color: 'var(--danger)' },
        { client: 'Sarah M.', vehicle: 'Mercedes GLA', days: 12, color: 'var(--warning)' },
        { client: 'Daniel R.', vehicle: 'Range Rover SV', days: 28, color: 'var(--success)' },
    ];

    const handleSendReminders = () => {
        setShowSMSModal(false);
        showToast(`SMS reminders dispatched to ${renewals.length} clients for insurance renewal.`, 'success');
    };

    const branchROs = repairOrders.filter(ro => selectedBranch === 'All' || ro.branch === selectedBranch);
    const filteredROs = branchROs.filter(ro =>
        (selectedTechFilter === 'All' || ro.technician === selectedTechFilter) &&
        (statusFilter === 'All' || ro.status === statusFilter)
    );

    const activeROsCount = branchROs.filter(r => r.status !== 'Completed').length;
    const completedCount = branchROs.filter(r => r.status === 'Completed').length;
    const formattedRevenue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
        .format(31600 + completedCount * 850);

    const technicianHours: Record<string, number> = {};
    branchROs.forEach(ro => {
        if (ro.laborHours) technicianHours[ro.technician] = (technicianHours[ro.technician] || 0) + ro.laborHours;
    });

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto', position: 'relative' }}>

                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '1.9rem', marginBottom: '0.2rem' }}>Fixed Operations</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Service, Warranty & Insurance Tracking</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn-outline" onClick={() => exportToCSV(repairOrders.map(r => ({ ...r })), 'repair_orders.csv')}>⬇ Export CSV</button>
                        <button className="btn-primary" onClick={() => setShowROModal(true)}>+ Open Repair Order</button>
                    </div>
                </header>

                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                    <StatCard label="Active e-ROs" value={`${9 + activeROsCount}`} color="var(--secondary-accent)" />
                    <StatCard label="Completed This Session" value={completedCount} color="var(--success)" />
                    <StatCard label="Warranty Claims" value={formatCurrency(14500)} sub="2 Pending OEM Auth." />
                    <StatCard label="Service Revenue (MTD)" value={formattedRevenue} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.5rem' }}>

                    {/* Repair Orders Table */}
                    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', gap: '1rem', flexWrap: 'wrap' }}>
                            <h3 style={{ fontSize: '1rem' }}>Electronic Repair Orders (e-ROs)</h3>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                                    style={selectStyle}>
                                    <option value="All">All Statuses</option>
                                    <option value="In Bay">In Bay</option>
                                    <option value="Awaiting Parts">Awaiting Parts</option>
                                    <option value="Completed">Completed</option>
                                </select>
                                <select value={selectedTechFilter} onChange={e => setSelectedTechFilter(e.target.value)}
                                    style={selectStyle}>
                                    <option value="All">All Technicians</option>
                                    <option value="Mike R.">Mike R.</option>
                                    <option value="John D.">John D.</option>
                                    <option value="Lisa K.">Lisa K.</option>
                                </select>
                            </div>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                    {['RO #', 'Vehicle / Client', 'Issue', 'Parts & Cost', 'Technician', 'Status', ''].map(h => (
                                        <th key={h} style={thStyle}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredROs.map((ro, idx, arr) => (
                                    <tr key={ro.ro} style={{ borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                                        <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem' }}>{ro.ro}</td>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: 600 }}>{ro.vehicle}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ro.client}</div>
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{ fontSize: '0.88rem' }}>{ro.issue}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Due: {ro.due}</div>
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{ro.parts || '—'}</div>
                                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ro.cost || '—'}</div>
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: 500 }}>{ro.technician}</div>
                                            {ro.laborHours ? <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ro.laborHours}h logged</div> : null}
                                        </td>
                                        <td style={tdStyle}>
                                            <span
                                                onClick={() => handleAdvanceStatus(ro)}
                                                className={`badge ${ro.status === 'Completed' ? 'badge-success' : ro.status === 'In Bay' ? 'badge-info' : 'badge-warning'}`}
                                                style={{ cursor: 'pointer' }}
                                                title="Click to advance status"
                                            >
                                                {ro.status}
                                            </span>
                                        </td>
                                        <td style={tdStyle}>
                                            <button onClick={() => setSelectedRO(ro)} style={actionBtn}>📋 Details</button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredROs.length === 0 && (
                                    <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No repair orders match the filters.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Side Panels */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                        {/* Technician Workload */}
                        <div className="glass-panel" style={{ padding: '1.25rem' }}>
                            <h3 style={{ fontSize: '0.95rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem', marginBottom: '0.75rem' }}>Technician Workload</h3>
                            {['Mike R.', 'John D.', 'Lisa K.'].map(tech => {
                                const open = branchROs.filter(r => r.technician === tech && r.status !== 'Completed').length;
                                const hours = technicianHours[tech] || 0;
                                return (
                                    <div key={tech} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.6rem', alignItems: 'center' }}>
                                        <span>{tech}</span>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>{hours}h</span>
                                            <span className={`badge ${open > 2 ? 'badge-warning' : 'badge-success'}`}>{open} open</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Warranty Alerts */}
                        <div className="glass-panel" style={{ padding: '1.25rem' }}>
                            <h3 style={{ fontSize: '0.95rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem', marginBottom: '0.75rem' }}>⚠ Warranty Alerts</h3>
                            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '0.9rem', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
                                <p style={{ color: 'var(--warning)', fontWeight: 600, marginBottom: '0.25rem' }}>Claim Needs Authorization</p>
                                <p style={{ color: 'var(--text-muted)' }}>Range Rover SV — Air Suspension. OEM approval pending.</p>
                            </div>
                        </div>

                        {/* Insurance Renewals */}
                        <div className="glass-panel" style={{ padding: '1.25rem' }}>
                            <h3 style={{ fontSize: '0.95rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem', marginBottom: '0.75rem' }}>Insurance Renewals</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {renewals.map((r, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                        <span>{r.client} — {r.vehicle}</span>
                                        <span style={{ color: r.color, fontWeight: 700 }}>In {r.days}d</span>
                                    </div>
                                ))}
                            </div>
                            <button className="btn-outline" style={{ marginTop: '0.9rem', width: '100%', fontSize: '0.8rem' }} onClick={() => setShowSMSModal(true)}>
                                📱 Send SMS Reminders
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Open RO Modal */}
            {showROModal && (
                <Modal title="Open Repair Order (e-RO)" onClose={() => setShowROModal(false)}>
                    <form onSubmit={handleSaveRO} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>Select Client</label>
                            <select value={newRO.client} onChange={e => setNewRO({ ...newRO, client: e.target.value })} required style={{ ...inputStyle, height: '45px' }}>
                                <option value="">Select Client...</option>
                                {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                <option value="Walk-in">Walk-in Customer</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Vehicle Description</label>
                            <input type="text" value={newRO.vehicle} onChange={e => setNewRO({ ...newRO, vehicle: e.target.value })} placeholder="e.g. 2023 Porsche 911" required style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Customer Concern / Issue</label>
                            <textarea value={newRO.issue} onChange={e => setNewRO({ ...newRO, issue: e.target.value })} placeholder="Describe the diagnostic concern..." required style={{ ...inputStyle, height: '80px', resize: 'none' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Assign Technician</label>
                                <select value={newRO.technician} onChange={e => setNewRO({ ...newRO, technician: e.target.value })} style={{ ...inputStyle, height: '45px' }}>
                                    <option value="Mike R.">Mike R. (Master Tech)</option>
                                    <option value="John D.">John D. (Diagnostics)</option>
                                    <option value="Lisa K.">Lisa K. (Electrical)</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Target Completion</label>
                                <input type="text" value={newRO.due} onChange={e => setNewRO({ ...newRO, due: e.target.value })} placeholder="e.g. Today, 5:00 PM" style={inputStyle} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Parts Required</label>
                                <input type="text" value={newRO.parts} onChange={e => setNewRO({ ...newRO, parts: e.target.value })} placeholder="e.g. Brake pads, oil filter" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Estimated Cost</label>
                                <input type="text" value={newRO.cost} onChange={e => setNewRO({ ...newRO, cost: e.target.value })} placeholder="$850" style={inputStyle} />
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Estimated Labor Hours</label>
                            <input type="number" step="0.5" value={newRO.laborHours} onChange={e => setNewRO({ ...newRO, laborHours: e.target.value })} placeholder="e.g. 2.5" style={inputStyle} />
                        </div>
                        <button type="submit" className="btn-primary">Initiate e-RO & Log Bill</button>
                    </form>
                </Modal>
            )}

            {/* RO Detail Modal */}
            {selectedRO && (
                <Modal title={`Repair Order — ${selectedRO.ro}`} onClose={() => setSelectedRO(null)} wide>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <InfoBlock label="RO Number" value={selectedRO.ro} />
                            <InfoBlock label="Status" value={selectedRO.status} highlight={selectedRO.status === 'Completed' ? 'var(--success)' : selectedRO.status === 'In Bay' ? 'var(--secondary-accent)' : 'var(--warning)'} />
                            <InfoBlock label="Vehicle" value={selectedRO.vehicle} />
                            <InfoBlock label="Client" value={selectedRO.client} />
                            <InfoBlock label="Technician" value={selectedRO.technician} />
                            <InfoBlock label="Due Date" value={selectedRO.due} />
                            <InfoBlock label="Labor Hours" value={selectedRO.laborHours ? `${selectedRO.laborHours}h` : 'Not logged'} />
                            <InfoBlock label="Estimated Cost" value={selectedRO.cost || '—'} highlight="var(--primary)" />
                        </div>
                        <InfoBlock label="Issue / Customer Concern" value={selectedRO.issue} />
                        
                        {/* Parts List */}
                        {selectedRO.partsList && selectedRO.partsList.length > 0 ? (
                            <div style={{ marginTop: '0.5rem' }}>
                                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Billed Parts</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {selectedRO.partsList.map((p: any, i: number) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                                            <span>{p.quantity}x {p.name}</span>
                                            <span>{formatCurrency(p.price * p.quantity)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : selectedRO.parts ? (
                            <InfoBlock label="Parts Required" value={selectedRO.parts} />
                        ) : null}

                        {/* Parts Requisition Form */}
                        {selectedRO.status !== 'Completed' && (
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                                <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--primary)', fontSize: '0.9rem' }}>+ Requisition Parts</h4>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 2 }}>
                                        <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Select Part</label>
                                        <select value={selectedPartId} onChange={e => setSelectedPartId(e.target.value)} style={{ ...inputStyle, height: '40px' }}>
                                            <option value="">Choose part from inventory...</option>
                                            {partsInventory.map(p => (
                                                <option key={p.id} value={p.id} disabled={p.stockQuantity <= 0}>
                                                    {p.name} - {formatCurrency(p.price)} ({p.stockQuantity} in stock)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Qty</label>
                                        <input type="number" min="1" value={partQuantity} onChange={e => setPartQuantity(parseInt(e.target.value) || 1)} style={{ ...inputStyle, height: '40px' }} />
                                    </div>
                                    <button className="btn-primary" style={{ height: '40px', padding: '0 1rem' }} onClick={handleAddPart} disabled={!selectedPartId}>Add</button>
                                </div>
                            </div>
                        )}

                        {/* Vehicle Service History */}
                        <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Service History for this Vehicle</h4>
                            {repairOrders.filter(r => r.vehicle.toLowerCase().trim() === selectedRO.vehicle.toLowerCase().trim() && r.ro !== selectedRO.ro).length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '120px', overflowY: 'auto' }}>
                                    {repairOrders.filter(r => r.vehicle.toLowerCase().trim() === selectedRO.vehicle.toLowerCase().trim() && r.ro !== selectedRO.ro).map(pastRo => (
                                        <div key={pastRo.ro} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                                            <div>
                                                <span style={{ fontWeight: 600, color: 'var(--primary)', marginRight: '0.5rem' }}>{pastRo.ro}</span>
                                                <span>{pastRo.issue}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>{pastRo.cost}</span>
                                                <span className={`badge ${pastRo.status === 'Completed' ? 'badge-success' : pastRo.status === 'In Bay' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>{pastRo.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No other repair orders found for this vehicle.</p>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            {selectedRO.status !== 'Completed' && (
                                <button className="btn-primary" onClick={() => { handleAdvanceStatus(selectedRO); setSelectedRO(null); }}>
                                    → Advance Status
                                </button>
                            )}
                            <button className="btn-outline" onClick={() => setSelectedRO(null)}>Close</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* SMS Reminder Modal */}
            {showSMSModal && (
                <Modal title="📱 Send Insurance Renewal Reminders" onClose={() => setShowSMSModal(false)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>The following clients will receive an SMS reminder about their upcoming insurance renewal:</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {renewals.map((r, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                                    <div>
                                        <span style={{ fontWeight: 600 }}>{r.client}</span>
                                        <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>— {r.vehicle}</span>
                                    </div>
                                    <span style={{ color: r.color, fontWeight: 700 }}>Expires in {r.days} days</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.9rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            📨 Message: <em>&quot;Dear [Client], your vehicle insurance for [Vehicle] expires in [X] days. Please contact us to renew. — GariSphere&quot;</em>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button className="btn-primary" onClick={handleSendReminders} style={{ flex: 1 }}>✓ Confirm & Send {renewals.length} SMS</button>
                            <button className="btn-outline" onClick={() => setShowSMSModal(false)}>Cancel</button>
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
            <h3 style={{ fontSize: '1.6rem', margin: 0, color: color || 'white' }}>{value}</h3>
            {sub && <p style={{ fontSize: '0.72rem', color: 'var(--warning)' }}>{sub}</p>}
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
const selectStyle: React.CSSProperties = { background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border-color)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none', fontSize: '0.85rem' };
const actionBtn: React.CSSProperties = { color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.82rem', padding: 0 };
const thStyle: React.CSSProperties = { padding: '0.85rem 1.25rem', fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle: React.CSSProperties = { padding: '0.9rem 1.25rem', verticalAlign: 'middle', fontSize: '0.9rem' };
