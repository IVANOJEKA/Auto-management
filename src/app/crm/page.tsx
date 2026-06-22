'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useData, Client, Lead } from '../../context/DataContext';
import Sidebar from '../../components/Sidebar';
import { useCurrency } from '../../context/CurrencyContext';
import '../globals.css';
import { usePageGuard } from '../../hooks/usePageGuard';

export default function CRMPage() {
    const { user, isAuthenticated } = useAuth();
    const { isAllowed } = usePageGuard('crm');
    if (!isAllowed) return null;
    const { leads, clients, deals, invoices, repairOrders, complianceRecords, addLead, updateLeadStatus, updateLeadNotes, convertLeadToClient, addClient, updateClient, exportToCSV, selectedBranch, showToast } = useData();
    const { formatCurrency, formatUSDToStore } = useCurrency();
    const router = useRouter();

    useEffect(() => {
        if (!isAuthenticated) router.push('/login');
    }, [isAuthenticated, router]);

    const [clientSearch, setClientSearch] = useState('');
    const [showAddLeadModal, setShowAddLeadModal] = useState(false);
    const [showAddClientModal, setShowAddClientModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [kycModal, setKycModal] = useState<Client | null>(null);
    const [kycNote, setKycNote] = useState('');

    const [newLead, setNewLead] = useState({ name: '', phone: '', email: '', interest: '', status: 'Hot' as Lead['status'], notes: '' });
    const [newClient, setNewClient] = useState({ name: '', phone: '', email: '', address: '', idPassport: '', kyc: 'Pending' as Client['kyc'], clientType: 'Individual' as 'Individual' | 'Company', regNo: '', tinNo: '' });

    if (!isAuthenticated || !user) return null;

    const handleSaveLead = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLead.name || !newLead.interest) return;
        addLead({ name: newLead.name, phone: newLead.phone, email: newLead.email, interest: newLead.interest, status: newLead.status, notes: newLead.notes, branch: (selectedBranch !== 'All' ? selectedBranch : user.branch) as any });
        setShowAddLeadModal(false);
        setNewLead({ name: '', phone: '', email: '', interest: '', status: 'Hot', notes: '' });
    };

    const handleSaveClient = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClient.name) return;
        addClient({
            name: newClient.name,
            phone: newClient.phone,
            email: newClient.email,
            purchases: 0,
            tv: formatUSDToStore(0),
            kyc: newClient.kyc,
            address: newClient.address,
            idPassport: newClient.idPassport,
            clientType: newClient.clientType,
            regNo: newClient.regNo,
            tinNo: newClient.tinNo,
            branch: (selectedBranch !== 'All' ? selectedBranch : user.branch) as any
        });
        setShowAddClientModal(false);
        setNewClient({ name: '', phone: '', email: '', address: '', idPassport: '', kyc: 'Pending', clientType: 'Individual', regNo: '', tinNo: '' });
    };

    const handleVerifyKYC = () => {
        if (!kycModal) return;
        updateClient(kycModal.id, { kyc: 'Verified', kycNotes: kycNote || 'Documents verified manually.' });
        setKycModal(null);
        setKycNote('');
    };

    const branchLeads = leads.filter(l => selectedBranch === 'All' || l.branch === selectedBranch);
    const branchClients = clients.filter(c => selectedBranch === 'All' || c.branch === selectedBranch);
    const hotLeads = branchLeads.filter(l => l.status === 'Hot').length;
    const followUpLeads = branchLeads.filter(l => l.status === 'Follow-up').length;
    const pendingKYC = branchClients.filter(c => c.kyc === 'Pending').length;
    const conversionRate = branchClients.length > 0 ? ((branchClients.filter(c => c.purchases > 0).length / branchClients.length) * 100).toFixed(1) : '0.0';

    const filteredClients = branchClients.filter(c =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.id.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.phone?.toLowerCase().includes(clientSearch.toLowerCase())
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto', position: 'relative' }}>

                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '1.9rem', marginBottom: '0.2rem' }}>CRM & Client Relations</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage leads, clients, KYC compliance & communication</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn-outline" onClick={() => exportToCSV(clients.map(c => ({ ...c })), 'clients.csv')}>⬇ Export CSV</button>
                        <button className="btn-outline" onClick={() => setShowAddClientModal(true)}>+ Add Client</button>
                        <button className="btn-primary" onClick={() => setShowAddLeadModal(true)}>+ Add Lead</button>
                    </div>
                </header>

                {/* KPIs */}
                <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                    <StatCard label="Active Leads" value={branchLeads.length} color="var(--primary)" />
                    <StatCard label="Hot Leads 🔥" value={hotLeads} color="var(--danger)" />
                    <StatCard label="Total Clients" value={branchClients.length} />
                    <StatCard label="Missing KYC" value={pendingKYC} color="var(--warning)" />
                </div>

                <div className="grid-2col-1-2" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>

                    {/* Leads Board */}
                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '600px' }}>
                        <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                            Lead Follow-ups
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>({branchLeads.length})</span>
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', paddingRight: '4px' }}>
                            {branchLeads.map(lead => (
                                <div key={lead.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                                        <h4 style={{ fontSize: '0.95rem' }}>{lead.name}</h4>
                                        <select value={lead.status} onChange={e => updateLeadStatus(lead.id, e.target.value as any)}
                                            style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: lead.status === 'Hot' ? 'var(--danger)' : lead.status === 'Follow-up' ? 'var(--warning)' : 'var(--secondary-accent)', fontSize: '0.75rem', padding: '2px 6px', fontWeight: 600 }}>
                                            <option value="Hot">🔥 Hot</option>
                                            <option value="Follow-up">📞 Follow-up</option>
                                            <option value="Cold">❄ Cold</option>
                                        </select>
                                    </div>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Interest: <span style={{ color: 'white' }}>{lead.interest}</span></p>
                                    {lead.phone && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>📞 {lead.phone}</p>}
                                    <p style={{ fontSize: '0.72rem', color: 'var(--primary)', marginTop: '0.4rem' }}>Last: {lead.lastContact}</p>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                                        <button onClick={() => setSelectedLead(lead)} style={actionBtnStyle}>📋 Notes</button>
                                        <button onClick={() => convertLeadToClient(lead.id)}
                                            style={{ ...actionBtnStyle, color: 'var(--success)' }}>✓ Convert</button>
                                    </div>
                                </div>
                            ))}
                            {leads.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>No active leads.</p>}
                        </div>
                    </div>

                    {/* Client Database */}
                    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                            <h3 style={{ fontSize: '1rem' }}>Client Database</h3>
                            <input type="text" placeholder="🔍 Search clients..." value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                                style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none', fontSize: '0.85rem' }} />
                        </div>
                        <div className="table-responsive"><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                    {['Client', 'Contact', 'Lifetime Value', 'KYC', 'Actions'].map(h => (
                                        <th key={h} style={thStyle}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredClients.map((client, idx, arr) => (
                                    <tr key={client.id} style={{ borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: 600 }}>{client.name}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ID: {client.id}</div>
                                        </td>
                                        <td style={{ ...tdStyle, fontSize: '0.82rem' }}>
                                            <div>{client.email}</div>
                                            {client.phone && <div style={{ color: 'var(--text-muted)' }}>{client.phone}</div>}
                                        </td>
                                        <td style={tdStyle}>
                                            {formatCurrency(client.tv)} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({client.purchases} units)</span>
                                        </td>
                                        <td style={tdStyle}>
                                            <span className={`badge ${client.kyc === 'Verified' ? 'badge-success' : 'badge-warning'}`}>{client.kyc}</span>
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                                                <button onClick={() => setSelectedClient(client)} style={{ ...actionBtnStyle, color: 'var(--secondary-accent)' }}>🔍 View 360°</button>
                                                {client.kyc === 'Pending' && (
                                                    <button onClick={() => setKycModal(client)} style={{ ...actionBtnStyle, color: 'var(--warning)' }}>📄 Verify KYC</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredClients.length === 0 && (
                                    <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No clients found.</td></tr>
                                )}
                            </tbody>
                        </table></div>
                    </div>
                </div>
            </main>

            {/* Add Lead Modal */}
            {showAddLeadModal && (
                <Modal title="Add New Lead" onClose={() => setShowAddLeadModal(false)}>
                    <form onSubmit={handleSaveLead} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <FormRow>
                            <LabeledInput label="Full Name *" value={newLead.name} onChange={v => setNewLead({ ...newLead, name: v })} required />
                            <LabeledInput label="Phone" value={newLead.phone} onChange={v => setNewLead({ ...newLead, phone: v })} placeholder="+254 7xx xxx xxx" />
                        </FormRow>
                        <LabeledInput label="Email" value={newLead.email} onChange={v => setNewLead({ ...newLead, email: v })} type="email" />
                        <LabeledInput label="Vehicle of Interest *" value={newLead.interest} onChange={v => setNewLead({ ...newLead, interest: v })} required />
                        <div>
                            <label style={labelStyle}>Lead Priority</label>
                            <select value={newLead.status} onChange={e => setNewLead({ ...newLead, status: e.target.value as any })} style={{ ...inputStyle, height: '45px' }}>
                                <option value="Hot">🔥 Hot — Immediate</option>
                                <option value="Follow-up">📞 Follow-up</option>
                                <option value="Cold">❄ Cold</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Notes</label>
                            <textarea value={newLead.notes} onChange={e => setNewLead({ ...newLead, notes: e.target.value })} style={{ ...inputStyle, height: '70px', resize: 'none' }} placeholder="Budget, preferences, timeline..." />
                        </div>
                        <button type="submit" className="btn-primary">Save Lead</button>
                    </form>
                </Modal>
            )}

            {/* Add Client Modal */}
            {showAddClientModal && (
                <Modal title="Add New Client" onClose={() => setShowAddClientModal(false)} wide>
                    <form onSubmit={handleSaveClient} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                        {/* Client Type Toggle */}
                        <div>
                            <label style={labelStyle}>Client Type</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                {(['Individual', 'Company'] as const).map(type => (
                                    <button key={type} type="button"
                                        onClick={() => setNewClient({ ...newClient, clientType: type })}
                                        style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: `2px solid ${newClient.clientType === type ? 'var(--primary)' : 'var(--border-color)'}`, background: newClient.clientType === type ? 'rgba(99,102,241,0.15)' : 'rgba(15,23,42,0.4)', color: newClient.clientType === type ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}>
                                        {type === 'Individual' ? '👤 Individual / Person' : '🏢 Company / Organisation'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Name + Contact */}
                        <LabeledInput
                            label={newClient.clientType === 'Company' ? 'Company / Organisation Name *' : 'Full Name *'}
                            value={newClient.name} onChange={(v: string) => setNewClient({ ...newClient, name: v })} required
                            placeholder={newClient.clientType === 'Company' ? 'e.g. Acme Uganda Ltd' : 'e.g. John Doe'}
                        />
                        <FormRow>
                            <LabeledInput label="Phone / Tel" value={newClient.phone} onChange={(v: string) => setNewClient({ ...newClient, phone: v })} placeholder="+256 7xx xxx xxx" />
                            <LabeledInput label="Email" value={newClient.email} onChange={(v: string) => setNewClient({ ...newClient, email: v })} type="email" />
                        </FormRow>

                        {/* Address (both types) */}
                        <LabeledInput label="Address" value={newClient.address} onChange={(v: string) => setNewClient({ ...newClient, address: v })} placeholder="e.g. Plot 45, Kampala Road, Kampala" />

                        {/* Company-specific fields */}
                        {newClient.clientType === 'Company' && (
                            <FormRow>
                                <LabeledInput label="Registration No" value={newClient.regNo} onChange={(v: string) => setNewClient({ ...newClient, regNo: v })} placeholder="e.g. 80020001234567" />
                                <LabeledInput label="TIN No" value={newClient.tinNo} onChange={(v: string) => setNewClient({ ...newClient, tinNo: v })} placeholder="e.g. 1002938102" />
                            </FormRow>
                        )}

                        {/* Individual-specific fields */}
                        {newClient.clientType === 'Individual' && (
                            <FormRow>
                                <LabeledInput label="ID or Passport Number" value={newClient.idPassport} onChange={(v: string) => setNewClient({ ...newClient, idPassport: v })} placeholder="e.g. CM123456789" />
                                <LabeledInput label="TIN No (if applicable)" value={newClient.tinNo} onChange={(v: string) => setNewClient({ ...newClient, tinNo: v })} placeholder="e.g. 1002938102" />
                            </FormRow>
                        )}

                        <div>
                            <label style={labelStyle}>Initial KYC Status</label>
                            <select value={newClient.kyc} onChange={e => setNewClient({ ...newClient, kyc: e.target.value as any })} style={{ ...inputStyle, height: '45px' }}>
                                <option value="Pending">Pending</option>
                                <option value="Verified">Verified</option>
                            </select>
                        </div>
                        <button type="submit" className="btn-primary">Add Client</button>
                    </form>
                </Modal>
            )}

            {/* Client 360° Profile Modal */}
            {selectedClient && (() => {
                const clientDeals = deals.filter(d => d.client.toLowerCase() === selectedClient.name.toLowerCase());
                const clientInvoices = invoices.filter(i => i.client.toLowerCase() === selectedClient.name.toLowerCase());
                const clientROs = repairOrders.filter(r => r.client.toLowerCase() === selectedClient.name.toLowerCase());
                const clientCompliance = complianceRecords.filter(c => c.client.toLowerCase() === selectedClient.name.toLowerCase());
                const totalDebt = clientInvoices.filter(i => i.status === 'Overdue' || i.status === 'Pending Finance').reduce((acc, i) => acc + parseFloat(i.amount.replace(/[^0-9.-]+/g, '') || '0'), 0);
                const totalPaid = clientInvoices.filter(i => i.status === 'Paid').reduce((acc, i) => acc + parseFloat(i.amount.replace(/[^0-9.-]+/g, '') || '0'), 0);
                const logbookBalance = clientCompliance.reduce((acc, c) => acc + (c.logbookDetails?.balanceLeft || 0), 0);
                return (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 2000, padding: '2rem', overflowY: 'auto' }}>
                    <div className="glass-panel" style={{ width: '900px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: selectedClient.clientType === 'Company' ? 'linear-gradient(135deg, #1e40af, #3b82f6)' : 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, flexShrink: 0 }}>
                                    {selectedClient.clientType === 'Company' ? '🏢' : selectedClient.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{selectedClient.name}</h2>
                                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px', background: selectedClient.clientType === 'Company' ? 'rgba(59,130,246,0.2)' : 'rgba(99,102,241,0.2)', color: selectedClient.clientType === 'Company' ? '#60a5fa' : 'var(--primary)', fontWeight: 600, letterSpacing: '0.04em' }}>
                                            {selectedClient.clientType === 'Company' ? '🏢 COMPANY' : '👤 INDIVIDUAL'}
                                        </span>
                                    </div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>{selectedClient.email} · {selectedClient.phone || 'No phone'} · ID: {selectedClient.id}</p>
                                    {selectedClient.address && (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', margin: '0.15rem 0 0' }}>📍 {selectedClient.address}</p>
                                    )}
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                                        {selectedClient.clientType === 'Company' && selectedClient.regNo && (
                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>📑 Reg No: <span style={{ color: 'white' }}>{selectedClient.regNo}</span></span>
                                        )}
                                        {selectedClient.tinNo && (
                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>🧾 TIN: <span style={{ color: 'white' }}>{selectedClient.tinNo}</span></span>
                                        )}
                                        {selectedClient.clientType === 'Individual' && selectedClient.idPassport && (
                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>🪪 ID/Passport: <span style={{ color: 'white' }}>{selectedClient.idPassport}</span></span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <span className={`badge ${selectedClient.kyc === 'Verified' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.8rem' }}>KYC: {selectedClient.kyc}</span>
                                <button onClick={() => setSelectedClient(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
                            </div>
                        </div>

                        {/* Financial Snapshot KPIs */}
                        <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                            {[{ label: 'Lifetime Value', val: formatCurrency(selectedClient.tv), color: 'var(--primary)' }, { label: 'Total Paid', val: formatCurrency(totalPaid), color: 'var(--success)' }, { label: 'Outstanding Debt', val: formatCurrency(totalDebt), color: totalDebt > 0 ? 'var(--danger)' : 'var(--success)' }, { label: 'Logbook Balance', val: formatCurrency(logbookBalance), color: logbookBalance > 0 ? 'var(--warning)' : 'var(--success)' }].map(k => (
                                <div key={k.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{k.label}</p>
                                    <h3 style={{ fontSize: '1.2rem', color: k.color, margin: 0 }}>{k.val}</h3>
                                </div>
                            ))}
                        </div>

                        {/* Four-column detail sections */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                            {/* Deals */}
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                                <h4 style={{ fontSize: '0.85rem', color: 'var(--secondary-accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>🤝 Deal History ({clientDeals.length})</h4>
                                {clientDeals.length > 0 ? clientDeals.map(d => (
                                    <div key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>{d.vehicle}</p>
                                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{d.date} · Agent: {d.agent}</p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.88rem' }}>{d.salePrice}</p>
                                                <span className={`badge ${d.status === 'Closed' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.6rem' }}>{d.status}</span>
                                            </div>
                                        </div>
                                    </div>
                                )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No deal history found.</p>}
                            </div>

                            {/* Invoices */}
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                                <h4 style={{ fontSize: '0.85rem', color: 'var(--secondary-accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>💳 Invoice & Payment Ledger ({clientInvoices.length})</h4>
                                {clientInvoices.length > 0 ? clientInvoices.map(inv => (
                                    <div key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>{inv.type}</p>
                                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{inv.date} · {inv.id}</p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ fontWeight: 700, fontSize: '0.88rem' }}>{inv.amount}</p>
                                                <span className={`badge ${inv.status === 'Paid' ? 'badge-success' : inv.status === 'Overdue' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.6rem' }}>{inv.status}</span>
                                            </div>
                                        </div>
                                    </div>
                                )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No invoices found.</p>}
                            </div>

                            {/* Service History */}
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                                <h4 style={{ fontSize: '0.85rem', color: 'var(--secondary-accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>🔧 Service & Repair History ({clientROs.length})</h4>
                                {clientROs.length > 0 ? clientROs.map(ro => (
                                    <div key={ro.ro} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>{ro.issue}</p>
                                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ro.vehicle} · Tech: {ro.technician}</p>
                                            </div>
                                            <span className={`badge ${ro.status === 'Completed' ? 'badge-success' : ro.status === 'In Bay' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: '0.6rem' }}>{ro.status}</span>
                                        </div>
                                    </div>
                                )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No service history found.</p>}
                            </div>

                            {/* Compliance / Logbook */}
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                                <h4 style={{ fontSize: '0.85rem', color: 'var(--secondary-accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>📋 Compliance & Logbook ({clientCompliance.length})</h4>
                                {clientCompliance.length > 0 ? clientCompliance.map(c => (
                                    <div key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>{c.vehicle}</p>
                                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Logbook: {c.logbook} · Plates: {c.plates}</p>
                                                {c.logbookDetails?.balanceLeft && c.logbookDetails.balanceLeft > 0 && (
                                                    <p style={{ fontSize: '0.72rem', color: 'var(--warning)', marginTop: '0.2rem' }}>⚠ Balance Due: {formatCurrency(c.logbookDetails.balanceLeft)}</p>
                                                )}
                                            </div>
                                            <span className={`badge ${c.esign === 'Signed' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.6rem' }}>eSign: {c.esign}</span>
                                        </div>
                                    </div>
                                )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No compliance records found.</p>}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                            {selectedClient.kyc === 'Pending' && (
                                <button className="btn-primary" onClick={() => { setSelectedClient(null); setKycModal(selectedClient); }}>📄 Verify KYC</button>
                            )}
                            <button className="btn-outline" style={{ border: '1px solid var(--secondary-accent)', color: 'var(--secondary-accent)' }} onClick={() => {
                                const link = `${window.location.origin}/portal?client=${selectedClient.id}`;
                                navigator.clipboard.writeText(link);
                                showToast('Client portal link copied to clipboard!', 'success');
                            }}>
                                🔗 Copy Portal Link
                            </button>
                            <button className="btn-outline" onClick={() => setSelectedClient(null)}>Close</button>
                        </div>
                    </div>
                </div>
                );
            })()}

            {/* Lead Notes Modal */}
            {selectedLead && (
                <Modal title={`Lead Notes — ${selectedLead.name}`} onClose={() => setSelectedLead(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <InfoBlock label="Interest" value={selectedLead.interest} />
                        <InfoBlock label="Status" value={selectedLead.status} />
                        <div>
                            <label style={labelStyle}>Notes</label>
                            <textarea defaultValue={selectedLead.notes}
                                onBlur={e => updateLeadNotes(selectedLead.id, e.target.value)}
                                style={{ ...inputStyle, height: '100px', resize: 'vertical' }}
                                placeholder="Add follow-up notes..." />
                        </div>
                        <button className="btn-primary" onClick={() => setSelectedLead(null)}>Save & Close</button>
                    </div>
                </Modal>
            )}

            {/* KYC Verification Modal */}
            {kycModal && (
                <Modal title={`Verify KYC — ${kycModal.name}`} onClose={() => setKycModal(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Confirm that required KYC documents (National ID, proof of address) have been received and verified for <strong style={{ color: 'white' }}>{kycModal.name}</strong>.
                        </p>
                        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
                            <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>✓ National ID / Passport</p>
                            <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>✓ Proof of Address</p>
                            <p style={{ fontSize: '0.85rem' }}>✓ Source of Funds Declaration</p>
                        </div>
                        <div>
                            <label style={labelStyle}>Verification Notes</label>
                            <textarea value={kycNote} onChange={e => setKycNote(e.target.value)}
                                style={{ ...inputStyle, height: '70px', resize: 'none' }}
                                placeholder="e.g. Physical documents checked on 25 May 2026" />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button className="btn-primary" onClick={handleVerifyKYC} style={{ flex: 1 }}>✓ Mark as Verified</button>
                            <button className="btn-outline" onClick={() => setKycModal(null)}>Cancel</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{label}</p>
            <h3 style={{ fontSize: '1.7rem', margin: 0, color: color || 'white' }}>{value}</h3>
        </div>
    );
}

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
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

function FormRow({ children }: { children: React.ReactNode }) {
    return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>{children}</div>;
}

function LabeledInput({ label, value, onChange, type = 'text', placeholder, required }: any) {
    return (
        <div>
            <label style={labelStyle}>{label}</label>
            <input type={type} value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                placeholder={placeholder} required={required} style={inputStyle} />
        </div>
    );
}

function InfoBlock({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
    return (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</p>
            <p style={{ fontWeight: 600, color: highlight || 'white', fontSize: '0.9rem' }}>{value}</p>
        </div>
    );
}

const labelStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' };
const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-color)', padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box' };
const actionBtnStyle: React.CSSProperties = { color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.8rem', padding: 0, textAlign: 'left' };
const thStyle: React.CSSProperties = { padding: '0.85rem 1.25rem', fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle: React.CSSProperties = { padding: '1rem 1.25rem', verticalAlign: 'middle', fontSize: '0.9rem' };
