'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useData, Appointment, AppType, AppStatus } from '../../context/DataContext';
import Sidebar from '../../components/Sidebar';
import '../globals.css';
import { usePageGuard } from '../../hooks/usePageGuard';

const STATUS_COLOR: Record<AppStatus, string> = { Scheduled: 'var(--secondary-accent)', Confirmed: 'var(--success)', Completed: 'var(--text-muted)', Cancelled: 'var(--danger)' };
const STATUS_BADGE: Record<AppStatus, string> = { Scheduled: 'badge-info', Confirmed: 'badge-success', Completed: '', Cancelled: 'badge-danger' };
const TYPE_ICON: Record<AppType, string> = { 'Test Drive': '🚗', 'Service Booking': '🔧', 'Delivery': '🎁', 'Viewing': '👀' };

const MOCK: Appointment[] = [
    { id: 'APT-001', type: 'Test Drive', clientName: 'David K.', clientPhone: '+256 700 123 456', vehicleLabel: '2024 BMW X5', date: new Date().toISOString().split('T')[0], time: '10:00', agent: 'Alex T.', notes: 'Client interested in midnight blue.', status: 'Confirmed', branch: 'Kampala Main' },
    { id: 'APT-002', type: 'Viewing', clientName: 'Mary A.', clientPhone: '+256 712 987 654', vehicleLabel: '2024 Lexus LX 600', date: new Date().toISOString().split('T')[0], time: '14:30', agent: 'Sarah M.', notes: '', status: 'Scheduled', branch: 'Jinja Showroom' },
    { id: 'APT-003', type: 'Service Booking', clientName: 'Paul N.', clientPhone: '+256 751 456 789', vehicleLabel: '2022 Toyota Land Cruiser', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: '09:00', agent: 'Mike R.', notes: 'Oil change + brake check', status: 'Scheduled', branch: 'Entebbe Hub' },
    { id: 'APT-004', type: 'Delivery', clientName: 'Grace N.', clientPhone: '+256 702 111 222', vehicleLabel: '2024 Lexus LX 600', date: new Date(Date.now() + 172800000).toISOString().split('T')[0], time: '11:00', agent: 'Alex T.', notes: 'Full delivery package — plates ready.', status: 'Confirmed', branch: 'Kampala Main' },
];

const SLOTS = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'];

export default function AppointmentsPage() {
    const { user, isAuthenticated } = useAuth();
    const { isAllowed } = usePageGuard('appointments');
    if (!isAllowed) return null;
    const { vehicles, selectedBranch, appointments, addAppointment, editAppointment, updateAppointmentStatus, deleteAppointment } = useData();
    const router = useRouter();

    const [view, setView] = useState<'Calendar' | 'List'>('Calendar');
    const [showCreate, setShowCreate] = useState(false);
    const [editApt, setEditApt] = useState<Appointment | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [statusFilter, setStatusFilter] = useState<'All' | AppStatus>('All');

    const emptyForm = { type: 'Test Drive' as AppType, clientName: '', clientPhone: '', vehicleLabel: '', date: selectedDate, time: '10:00', agent: user?.name || '', notes: '', branch: user?.branch || 'Kampala Main' };
    const [form, setForm] = useState({ ...emptyForm });

    useEffect(() => { if (!isAuthenticated) router.push('/login'); }, [isAuthenticated, router]);
    if (!isAuthenticated || !user) return null;

    const bApts = appointments.filter(a => selectedBranch === 'All' || a.branch === selectedBranch);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayApts = bApts.filter(a => a.date === todayStr && a.status !== 'Cancelled');
    const upcomingApts = bApts.filter(a => a.date > todayStr && a.status !== 'Cancelled' && a.status !== 'Completed');
    const selectedDayApts = bApts.filter(a => a.date === selectedDate);

    // Week dates
    const getWeekDates = (base: string) => {
        const d = new Date(base);
        const day = d.getDay();
        const mon = new Date(d); mon.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
        return Array.from({ length: 7 }, (_, i) => { const dd = new Date(mon); dd.setDate(mon.getDate() + i); return dd.toISOString().split('T')[0]; });
    };
    const weekDates = getWeekDates(selectedDate);
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        addAppointment(form);
        setShowCreate(false);
        setForm({ ...emptyForm });
    };

    const handleEditSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editApt) return;
        editAppointment(editApt.id, editApt);
        setEditApt(null);
    };

    const setStatus = (id: string, status: AppStatus) => {
        updateAppointmentStatus(id, status);
        if (editApt?.id === id) setEditApt(ea => ea ? { ...ea, status } : ea);
    };

    const handleSMSReminder = (apt: Appointment) => {
        const msg = `Hi ${apt.clientName}, this is a reminder about your ${apt.type} appointment on ${apt.date} at ${apt.time} at GariSphere (${apt.branch}). Vehicle: ${apt.vehicleLabel}. Questions? Call us at ${user.name}.`;
        const win = window.open(`sms:${apt.clientPhone}?body=${encodeURIComponent(msg)}`);
        if (!win) alert(`SMS to ${apt.clientPhone}:\n\n${msg}`);
    };

    const filteredList = (statusFilter === 'All' ? bApts : bApts.filter(a => a.status === statusFilter))
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-color)', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box' };
    const labelStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto' }}>

                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '1.9rem', marginBottom: '0.2rem' }}>📅 Appointments</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Test drives, viewings, service bookings & vehicle deliveries</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)', padding: '0.25rem' }}>
                            {(['Calendar', 'List'] as const).map(v => (
                                <button key={v} onClick={() => setView(v)} style={{ padding: '0.4rem 1rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: view === v ? 700 : 400, background: view === v ? 'var(--primary)' : 'transparent', color: view === v ? 'white' : 'var(--text-muted)', transition: 'all 0.15s' }}>{v}</button>
                            ))}
                        </div>
                        <button className="btn-primary" onClick={() => { setForm({ ...emptyForm, date: selectedDate }); setShowCreate(true); }}>+ New Appointment</button>
                    </div>
                </header>

                {/* KPI Row */}
                <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                    {[
                        { label: "Today's Appointments", value: todayApts.length, color: 'var(--primary)' },
                        { label: 'Upcoming (Next 7 Days)', value: upcomingApts.length, color: 'var(--secondary-accent)' },
                        { label: 'Confirmed', value: bApts.filter(a => a.status === 'Confirmed').length, color: 'var(--success)' },
                        { label: 'Pending Confirmation', value: bApts.filter(a => a.status === 'Scheduled').length, color: 'var(--warning)' },
                    ].map(k => (
                        <div key={k.label} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{k.label}</p>
                            <h3 style={{ fontSize: '1.7rem', margin: 0, color: k.color }}>{k.value}</h3>
                        </div>
                    ))}
                </div>

                {/* ── CALENDAR VIEW ── */}
                {view === 'Calendar' && (
                    <div className="grid-2col-1-side" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
                        {/* Week grid */}
                        <div className="glass-panel" style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1rem' }}>Week View</h3>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <button onClick={() => {
                                        const d = new Date(selectedDate); d.setDate(d.getDate() - 7);
                                        setSelectedDate(d.toISOString().split('T')[0]);
                                    }} style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '0.3rem 0.7rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>‹ Prev</button>
                                    <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.4)', color: 'var(--primary)', padding: '0.3rem 0.7rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.78rem' }}>Today</button>
                                    <button onClick={() => {
                                        const d = new Date(selectedDate); d.setDate(d.getDate() + 7);
                                        setSelectedDate(d.toISOString().split('T')[0]);
                                    }} style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '0.3rem 0.7rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Next ›</button>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-color)' }}>
                                {weekDates.map((date, i) => {
                                    const dayApts = bApts.filter(a => a.date === date && a.status !== 'Cancelled');
                                    const isToday = date === todayStr;
                                    const isSelected = date === selectedDate;
                                    return (
                                        <div key={date} onClick={() => setSelectedDate(date)} style={{ padding: '0.75rem', textAlign: 'center', cursor: 'pointer', borderRight: i < 6 ? '1px solid var(--border-color)' : 'none', background: isSelected ? 'rgba(249,115,22,0.12)' : 'transparent', borderBottom: isSelected ? '2px solid var(--primary)' : '2px solid transparent', transition: 'all 0.15s' }}>
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>{dayNames[i]}</p>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isToday ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.35rem', fontSize: '0.88rem', fontWeight: isToday ? 700 : 400 }}>
                                                {new Date(date + 'T12:00:00').getDate()}
                                            </div>
                                            {dayApts.length > 0 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    {dayApts.slice(0, 2).map(a => (
                                                        <div key={a.id} style={{ fontSize: '0.65rem', background: STATUS_COLOR[a.status] + '22', color: STATUS_COLOR[a.status], borderRadius: '3px', padding: '1px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {a.time} {TYPE_ICON[a.type]}
                                                        </div>
                                                    ))}
                                                    {dayApts.length > 2 && <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>+{dayApts.length - 2} more</div>}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Time slots for selected day */}
                            <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                                {SLOTS.map(slot => {
                                    const slotApts = selectedDayApts.filter(a => a.time === slot);
                                    return (
                                        <div key={slot} style={{ display: 'flex', gap: '1rem', padding: '0.5rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.03)', minHeight: '48px', alignItems: 'flex-start' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '40px', flexShrink: 0, paddingTop: '4px' }}>{slot}</span>
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {slotApts.map(a => (
                                                    <div key={a.id} onClick={() => setEditApt({ ...a })} style={{ padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', background: STATUS_COLOR[a.status] + '18', border: `1px solid ${STATUS_COLOR[a.status]}44`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.15s' }}
                                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.85'}
                                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                                                    >
                                                        <span>{TYPE_ICON[a.type]}</span>
                                                        <div style={{ flex: 1 }}>
                                                            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white' }}>{a.clientName}</p>
                                                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.vehicleLabel} · {a.agent}</p>
                                                        </div>
                                                        <span className={`badge ${STATUS_BADGE[a.status] || ''}`} style={{ fontSize: '0.62rem', color: !STATUS_BADGE[a.status] ? 'var(--text-muted)' : undefined }}>{a.status}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Side panel — today's rundown */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <h4 style={{ fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
                                    {selectedDate === todayStr ? "📋 Today's Schedule" : `📋 ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}`}
                                </h4>
                                {selectedDayApts.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1rem 0' }}>No appointments on this day.</p>}
                                {selectedDayApts.filter(a => a.status !== 'Cancelled').sort((a, b) => a.time.localeCompare(b.time)).map(a => (
                                    <div key={a.id} onClick={() => setEditApt({ ...a })} style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)', border: `1px solid ${STATUS_COLOR[a.status]}44`, cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>{a.time} {TYPE_ICON[a.type]}</span>
                                            <span className={`badge ${STATUS_BADGE[a.status] || ''}`} style={{ fontSize: '0.62rem' }}>{a.status}</span>
                                        </div>
                                        <p style={{ fontSize: '0.82rem', fontWeight: 600 }}>{a.clientName}</p>
                                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.type} · {a.vehicleLabel}</p>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Agent: {a.agent}</p>
                                    </div>
                                ))}
                            </div>
                            <button className="btn-primary" style={{ width: '100%' }} onClick={() => { setForm({ ...emptyForm, date: selectedDate }); setShowCreate(true); }}>+ Book Appointment</button>
                        </div>
                    </div>
                )}

                {/* ── LIST VIEW ── */}
                {view === 'List' && (
                    <div className="glass-panel" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1rem' }}>All Appointments ({filteredList.length})</h3>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                {(['All', 'Scheduled', 'Confirmed', 'Completed', 'Cancelled'] as const).map(f => (
                                    <button key={f} onClick={() => setStatusFilter(f as any)} style={{ padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${statusFilter === f ? 'var(--primary)' : 'var(--border-color)'}`, background: statusFilter === f ? 'rgba(99,102,241,0.2)' : 'transparent', color: statusFilter === f ? 'white' : 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer' }}>{f}</button>
                                ))}
                            </div>
                        </div>
                        <div className="table-responsive"><table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                {['Date & Time', 'Type', 'Client', 'Vehicle', 'Agent', 'Branch', 'Status', 'Actions'].map(h => <th key={h} style={{ padding: '0.85rem 1.25rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left' }}>{h}</th>)}
                            </tr></thead>
                            <tbody>
                                {filteredList.length === 0 && <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No appointments found.</td></tr>}
                                {filteredList.map((a, i, arr) => (
                                    <tr key={a.id} style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                        <td style={{ padding: '0.9rem 1.25rem' }}>
                                            <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{new Date(a.date + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.time}</p>
                                        </td>
                                        <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.85rem' }}>{TYPE_ICON[a.type]} {a.type}</td>
                                        <td style={{ padding: '0.9rem 1.25rem', fontWeight: 600 }}>{a.clientName}</td>
                                        <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{a.vehicleLabel}</td>
                                        <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.85rem' }}>{a.agent}</td>
                                        <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.78rem', color: 'var(--secondary-accent)' }}>{a.branch}</td>
                                        <td style={{ padding: '0.9rem 1.25rem' }}><span className={`badge ${STATUS_BADGE[a.status] || ''}`} style={{ color: !STATUS_BADGE[a.status] ? 'var(--text-muted)' : undefined }}>{a.status}</span></td>
                                        <td style={{ padding: '0.9rem 1.25rem' }}>
                                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                <button onClick={() => setEditApt({ ...a })} style={aBtn}>Edit</button>
                                                {a.status === 'Scheduled' && <button onClick={() => setStatus(a.id, 'Confirmed')} style={{ ...aBtn, color: 'var(--success)' }}>Confirm</button>}
                                                {(a.status === 'Scheduled' || a.status === 'Confirmed') && <button onClick={() => setStatus(a.id, 'Completed')} style={{ ...aBtn, color: 'var(--text-muted)' }}>Done</button>}
                                                <button onClick={() => handleSMSReminder(a)} style={{ ...aBtn, color: 'var(--secondary-accent)' }}>SMS</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table></div>
                    </div>
                )}
            </main>

            {/* ── Create Modal ── */}
            {showCreate && (
                <ModalWrap title="Book Appointment" onClose={() => setShowCreate(false)}>
                    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div><label style={labelStyle}>Appointment Type</label>
                                <select style={{ ...inputStyle, height: '44px' }} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as AppType }))}>
                                    {(['Test Drive', 'Service Booking', 'Delivery', 'Viewing'] as AppType[]).map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                            <div><label style={labelStyle}>Agent</label><input required style={inputStyle} value={form.agent} onChange={e => setForm(f => ({ ...f, agent: e.target.value }))} placeholder="Assigned agent" /></div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div><label style={labelStyle}>Client Name *</label><input required style={inputStyle} value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="Client full name" /></div>
                            <div><label style={labelStyle}>Client Phone</label><input style={inputStyle} value={form.clientPhone} onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))} placeholder="+256 7XX XXX XXX" /></div>
                        </div>
                        <div>
                            <label style={labelStyle}>Vehicle</label>
                            <select style={{ ...inputStyle, height: '44px' }} value={form.vehicleLabel} onChange={e => setForm(f => ({ ...f, vehicleLabel: e.target.value }))}>
                                <option value="">Select vehicle...</option>
                                {vehicles.map(v => <option key={v.id} value={`${v.year} ${v.make} ${v.model}`}>{v.year} {v.make} {v.model} ({v.status})</option>)}
                                <option value="Other">Other / Customer&apos;s Own</option>
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                            <div><label style={labelStyle}>Date *</label><input required type="date" style={inputStyle} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                            <div><label style={labelStyle}>Time *</label>
                                <select required style={{ ...inputStyle, height: '44px' }} value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}>
                                    {SLOTS.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div><label style={labelStyle}>Branch</label>
                                <select style={{ ...inputStyle, height: '44px' }} value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value as any }))}>
                                    {['Kampala Main', 'Jinja Showroom', 'Entebbe Hub'].map(b => <option key={b}>{b}</option>)}
                                </select>
                            </div>
                        </div>
                        <div><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' } as any} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any special requirements or notes..." /></div>
                        <button type="submit" className="btn-primary">📅 Book Appointment</button>
                    </form>
                </ModalWrap>
            )}

            {/* ── Edit Modal ── */}
            {editApt && (
                <ModalWrap title={`Appointment — ${editApt.id}`} onClose={() => setEditApt(null)}>
                    <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div><label style={labelStyle}>Type</label>
                                <select style={{ ...inputStyle, height: '44px' }} value={editApt.type} onChange={e => setEditApt(a => a ? { ...a, type: e.target.value as AppType } : a)}>
                                    {(['Test Drive', 'Service Booking', 'Delivery', 'Viewing'] as AppType[]).map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                            <div><label style={labelStyle}>Status</label>
                                <select style={{ ...inputStyle, height: '44px' }} value={editApt.status} onChange={e => setEditApt(a => a ? { ...a, status: e.target.value as AppStatus } : a)}>
                                    {(['Scheduled', 'Confirmed', 'Completed', 'Cancelled'] as AppStatus[]).map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div><label style={labelStyle}>Client Name</label><input style={inputStyle} value={editApt.clientName} onChange={e => setEditApt(a => a ? { ...a, clientName: e.target.value } : a)} /></div>
                            <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={editApt.clientPhone} onChange={e => setEditApt(a => a ? { ...a, clientPhone: e.target.value } : a)} /></div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div><label style={labelStyle}>Date</label><input type="date" style={inputStyle} value={editApt.date} onChange={e => setEditApt(a => a ? { ...a, date: e.target.value } : a)} /></div>
                            <div><label style={labelStyle}>Time</label>
                                <select style={{ ...inputStyle, height: '44px' }} value={editApt.time} onChange={e => setEditApt(a => a ? { ...a, time: e.target.value } : a)}>
                                    {SLOTS.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' } as any} value={editApt.notes} onChange={e => setEditApt(a => a ? { ...a, notes: e.target.value } : a)} /></div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button type="submit" className="btn-primary">💾 Save Changes</button>
                            <button type="button" className="btn-outline" style={{ color: 'var(--secondary-accent)' }} onClick={() => handleSMSReminder(editApt)}>📱 SMS Reminder</button>
                            {editApt.status !== 'Cancelled' && <button type="button" style={{ marginLeft: 'auto', color: 'var(--danger)', background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.85rem', cursor: 'pointer', fontSize: '0.82rem' }} onClick={() => { setStatus(editApt.id, 'Cancelled'); setEditApt(null); }}>Cancel Appt</button>}
                        </div>
                    </form>
                </ModalWrap>
            )}
        </div>
    );
}

function ModalWrap({ title, children, onClose }: any) {
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

const aBtn: React.CSSProperties = { color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.8rem', padding: '2px 0' };
