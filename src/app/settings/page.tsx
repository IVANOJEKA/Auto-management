'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import { useCurrency, CURRENCIES } from '../../context/CurrencyContext';
import { usePermissions, ALL_MODULES } from '../../context/PermissionsContext';
import Sidebar from '../../components/Sidebar';
import '../globals.css';

type SettingsTab = 'Company' | 'Currency' | 'Users' | 'Permissions';
type UserRole = 'Admin' | 'Sales' | 'Finance' | 'Logistics' | 'Service';
type Branch = 'Kampala Main' | 'Jinja Showroom' | 'Entebbe Hub';

interface StaffUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    branch: Branch;
    active: boolean;
}

const ROLES: UserRole[] = ['Admin', 'Sales', 'Finance', 'Logistics', 'Service'];
const BRANCHES: Branch[] = ['Kampala Main', 'Jinja Showroom', 'Entebbe Hub'];

const ROLE_COLORS: Record<UserRole, string> = {
    Admin: 'var(--danger)',
    Finance: 'var(--success)',
    Sales: 'var(--primary)',
    Logistics: 'var(--secondary-accent)',
    Service: 'var(--warning)',
};

const ROLE_BADGE: Record<UserRole, string> = {
    Admin: 'badge-danger',
    Finance: 'badge-success',
    Sales: 'badge-info',
    Logistics: '',
    Service: 'badge-warning',
};

function SettingsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isAuthenticated, isMfaEnabled, disableMfa } = useAuth();
    const { business, updateBusiness, resetBusiness } = useBusiness();
    const { currency, setCurrency } = useCurrency();
    const { permissions, toggleModuleForRole, resetToDefaults: resetPermissions, hasAccess } = usePermissions();
    const [mfaResetTarget, setMfaResetTarget] = useState<string | null>(null);

    // Tabs state - support auto-focusing on Users tab if redirected
    const [activeTab, setActiveTab] = useState<SettingsTab>('Company');

    // Branding state
    const [brandForm, setBrandForm] = useState({ ...business });
    const [brandSaved, setBrandSaved] = useState(false);

    // User management state
    const [users, setUsers] = useState<StaffUser[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [editUser, setEditUser] = useState<StaffUser | null>(null);
    const [showInvite, setShowInvite] = useState(false);
    const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'Sales' as UserRole, branch: 'Kampala Main' as Branch });
    const [savingUser, setSavingUser] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState<'All' | UserRole>('All');

    // Toast alerts
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'danger' | 'warning' } | null>(null);

    // Sync brand form with business context once loaded/updated
    useEffect(() => {
        setBrandForm(business);
    }, [business]);

    // Tab focus check
    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam === 'users') {
            setActiveTab('Users');
        }
    }, [searchParams]);

    // Load users list
    useEffect(() => {
        const loadUsers = async () => {
            try {
                const res = await fetch('/api/users');
                if (res.ok) {
                    const data = await res.json();
                    setUsers(data);
                }
            } catch {
                // Fallback offline users
                setUsers(OFFLINE_USERS_SEED);
            } finally {
                setUsersLoading(false);
            }
        };
        if (isAuthenticated && user?.role === 'Admin') {
            loadUsers();
        }
    }, [isAuthenticated, user]);

    if (!isAuthenticated || !user) return null;
    if (user.role !== 'Admin') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <h1 style={{ color: 'var(--danger)' }}>Access Denied</h1>
                <p>System settings require Administrator permissions.</p>
                <button className="btn-primary" onClick={() => router.push('/')}>Return to Dashboard</button>
            </div>
        );
    }

    const showToast = (msg: string, type: 'success' | 'danger' | 'warning' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Save Branding
    const handleSaveBranding = () => {
        updateBusiness(brandForm);
        setBrandSaved(true);
        showToast('Business branding preferences updated successfully.');
        setTimeout(() => setBrandSaved(false), 2000);
    };

    // Save Staff user updates
    const handleSaveUserEdit = async () => {
        if (!editUser) return;
        setSavingUser(true);
        try {
            const res = await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editUser.id,
                    name: editUser.name,
                    role: editUser.role,
                    branch: editUser.branch,
                    active: editUser.active
                })
            });
            if (res.ok) {
                setUsers(prev => prev.map(u => u.id === editUser.id ? editUser : u));
                setEditUser(null);
                showToast(`Staff account for ${editUser.name} updated.`);
            } else {
                showToast('Failed to update staff account.', 'danger');
            }
        } catch {
            // Local fallback
            setUsers(prev => prev.map(u => u.id === editUser.id ? editUser : u));
            setEditUser(null);
            showToast(`Staff account for ${editUser.name} updated locally.`);
        } finally {
            setSavingUser(false);
        }
    };

    // Invite new user
    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingUser(true);
        const newUser: StaffUser = {
            id: `demo-user-${Date.now().toString().slice(-4)}`,
            ...inviteForm,
            active: true
        };
        setUsers(prev => [newUser, ...prev]);
        setShowInvite(false);
        setInviteForm({ name: '', email: '', role: 'Sales', branch: 'Kampala Main' });
        showToast(`Invitation sent to ${newUser.email}.`, 'success');
        setSavingUser(false);
    };

    // Toggle staff active status
    const handleToggleUserActive = async (targetUser: StaffUser) => {
        const updated = { ...targetUser, active: !targetUser.active };
        try {
            const res = await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: targetUser.id, active: updated.active })
            });
            if (res.ok) {
                setUsers(prev => prev.map(u => u.id === targetUser.id ? updated : u));
                showToast(`Staff member ${targetUser.name} ${updated.active ? 'reactivated' : 'deactivated'}.`);
            } else {
                showToast('Failed to update staff active status.', 'danger');
            }
        } catch {
            setUsers(prev => prev.map(u => u.id === targetUser.id ? updated : u));
            showToast(`Staff member ${targetUser.name} ${updated.active ? 'reactivated' : 'deactivated'} locally.`);
        }
    };

    const filteredUsers = users
        .filter(u => userRoleFilter === 'All' || u.role === userRoleFilter)
        .filter(u => !userSearchTerm || u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || u.email.toLowerCase().includes(userSearchTerm.toLowerCase()));

    const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-color)', padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box' };
    const labelStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' };
    const sectionHead: React.CSSProperties = { fontSize: '0.72rem', fontWeight: 700, color: 'var(--secondary-accent)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' };
    const thStyle: React.CSSProperties = { padding: '0.85rem 1.25rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' };
    const tdStyle: React.CSSProperties = { padding: '0.9rem 1.25rem', verticalAlign: 'middle', fontSize: '0.88rem' };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto' }}>
                
                {/* Header */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '1.9rem', marginBottom: '0.2rem' }}>⚙️ System Settings</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Configure business branding, currency parameters, and staff permissions</p>
                    </div>
                    {activeTab === 'Company' && (
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <button className="btn-outline" onClick={() => { setBrandForm({ ...business }); resetBusiness(); showToast('Default business profile restored.', 'warning'); }}>↺ Reset Defaults</button>
                            <button className="btn-primary" onClick={handleSaveBranding}>💾 Save Branding</button>
                        </div>
                    )}
                    {activeTab === 'Users' && (
                        <button className="btn-primary" onClick={() => setShowInvite(true)}>+ Invite Staff Member</button>
                    )}
                    {activeTab === 'Permissions' && (
                        <button className="btn-outline" onClick={() => { resetPermissions(); showToast('Permissions reset to system defaults.', 'warning'); }}>↺ Reset to Defaults</button>
                    )}
                </header>

                {/* Toasts */}
                {toast && (
                    <div style={{
                        position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 2000, padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-sm)',
                        background: toast.type === 'success' ? 'rgba(34,197,94,0.2)' : toast.type === 'warning' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                        border: `1px solid ${toast.type === 'success' ? 'var(--success)' : toast.type === 'warning' ? 'var(--warning)' : 'var(--danger)'}`,
                        color: toast.type === 'success' ? 'var(--success)' : toast.type === 'warning' ? 'var(--warning)' : 'var(--danger)',
                        fontWeight: 600, fontSize: '0.88rem'
                    }}>
                        {toast.type === 'success' ? '✓' : '⚠️'} {toast.msg}
                    </div>
                )}

                {/* Tabs bar */}
                <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border-color)' }}>
                    {[
                        { key: 'Company', label: '🏢 Company Profile' },
                        { key: 'Currency', label: '💱 Currency & Exchange' },
                        { key: 'Users', label: '👥 Staff Directory' },
                        { key: 'Permissions', label: '🔐 Roles & Permissions' }
                    ].map(t => (
                        <button
                            key={t.key}
                            onClick={() => setActiveTab(t.key as any)}
                            style={{
                                padding: '0.65rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
                                color: activeTab === t.key ? 'white' : 'var(--text-muted)', fontWeight: activeTab === t.key ? 700 : 400, fontSize: '0.9rem',
                                borderBottom: activeTab === t.key ? '2px solid var(--primary)' : '2px solid transparent', transition: 'all 0.15s'
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ─── TAB 1: COMPANY PROFILE ─── */}
                {activeTab === 'Company' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <p style={sectionHead}>🏢 Business Credentials</p>
                            
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)'
                            }}>
                                <input
                                    type="checkbox"
                                    id="isRegistered"
                                    checked={brandForm.isRegistered}
                                    onChange={e => setBrandForm({ ...brandForm, isRegistered: e.target.checked })}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                />
                                <label htmlFor="isRegistered" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', cursor: 'pointer', margin: 0 }}>
                                    Activate Custom Showroom Branding
                                </label>
                            </div>

                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                 <div>
                                     <label style={labelStyle}>Showroom Name *</label>
                                     <input style={inputStyle} value={brandForm.name} onChange={e => setBrandForm({ ...brandForm, name: e.target.value })} placeholder="e.g. GariSphere Ltd" />
                                 </div>
                                 <div>
                                     <label style={labelStyle}>Logo (Emoji Icon)</label>
                                     <input style={inputStyle} value={brandForm.logoEmoji} onChange={e => setBrandForm({ ...brandForm, logoEmoji: e.target.value })} placeholder="e.g. 🏎 or 🚗" />
                                 </div>
                             </div>

                             <div>
                                 <label style={labelStyle}>Custom Logo Image (PNG / JPEG)</label>
                                 <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)' }}>
                                     <div style={{ width: '48px', height: '48px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'rgba(0,0,0,0.2)', flexShrink: 0 }}>
                                         {brandForm.logoImage ? (
                                             <img src={brandForm.logoImage} alt="Logo preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                         ) : (
                                             <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>🖼</span>
                                         )}
                                     </div>
                                     <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                                         <input 
                                             type="file" 
                                             accept="image/*" 
                                             id="branding-logo-upload" 
                                             style={{ display: 'none' }}
                                             onChange={e => {
                                                 const file = e.target.files?.[0];
                                                 if (file) {
                                                     const reader = new FileReader();
                                                     reader.onload = () => {
                                                         setBrandForm(prev => ({ ...prev, logoImage: reader.result as string }));
                                                     };
                                                     reader.readAsDataURL(file);
                                                 }
                                             }}
                                         />
                                         <label htmlFor="branding-logo-upload" className="btn-outline" style={{ cursor: 'pointer', padding: '0.45rem 0.9rem', fontSize: '0.82rem', margin: 0, display: 'inline-block' }}>
                                             Select File
                                         </label>
                                         {brandForm.logoImage && (
                                             <button 
                                                 type="button" 
                                                 className="btn-outline" 
                                                 onClick={() => setBrandForm(prev => ({ ...prev, logoImage: '' }))}
                                                 style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.25)', padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
                                             >
                                                 Remove Image
                                             </button>
                                         )}
                                     </div>
                                 </div>
                             </div>

                             <div>
                                 <label style={labelStyle}>Tagline / Subheading</label>
                                 <input style={inputStyle} value={brandForm.tagline} onChange={e => setBrandForm({ ...brandForm, tagline: e.target.value })} placeholder="e.g. Importers and Exporters of Premium Vehicles" />
                             </div>

                             <div>
                                 <label style={labelStyle}>Showroom HQ Address</label>
                                 <input style={inputStyle} value={brandForm.address} onChange={e => setBrandForm({ ...brandForm, address: e.target.value })} placeholder="HQ Physical Address" />
                             </div>

                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                 <div>
                                     <label style={labelStyle}>Official Phone</label>
                                     <input style={inputStyle} value={brandForm.phone} onChange={e => setBrandForm({ ...brandForm, phone: e.target.value })} placeholder="Showroom contact phone" />
                                 </div>
                                 <div>
                                     <label style={labelStyle}>Country Crest</label>
                                     <input style={inputStyle} value={brandForm.country} onChange={e => setBrandForm({ ...brandForm, country: e.target.value })} placeholder="e.g. Uganda" />
                                 </div>
                             </div>

                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                 <div>
                                     <label style={labelStyle}>Email Address</label>
                                     <input style={inputStyle} value={brandForm.email} onChange={e => setBrandForm({ ...brandForm, email: e.target.value })} placeholder="info@showroom.com" />
                                 </div>
                                 <div>
                                     <label style={labelStyle}>Tax TIN ID Number</label>
                                     <input style={inputStyle} value={brandForm.tin} onChange={e => setBrandForm({ ...brandForm, tin: e.target.value })} placeholder="URA / Reg Tax ID" />
                                 </div>
                             </div>
                         </div>

                         {/* Live document header preview */}
                         <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                             <p style={sectionHead}>📄 Showroom Print Agreement Header Preview</p>
                             <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center' }}>
                                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
                                     <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                         {brandForm.isRegistered && brandForm.logoImage ? (
                                             <img src={brandForm.logoImage} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                         ) : (
                                             <span style={{ fontSize: '2.2rem' }}>{brandForm.isRegistered ? (brandForm.logoEmoji || '🏎') : '🚘'}</span>
                                         )}
                                     </div>
                                     <div style={{ flex: 1, padding: '0 1rem' }}>
                                         <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>
                                             {brandForm.isRegistered ? (brandForm.name || 'GariSphere').toUpperCase() : 'MOTOR VEHICLE DEALERSHIP'}
                                         </h3>
                                         <p style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 700, margin: '2px 0 0 0', textTransform: 'uppercase' }}>
                                             {brandForm.isRegistered ? brandForm.tagline : 'SHOWROOM SALES AGREEMENT'}
                                         </p>
                                     </div>
                                     <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                         {brandForm.isRegistered && brandForm.logoImage ? (
                                             <img src={brandForm.logoImage} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                         ) : (
                                             <span style={{ fontSize: '2.2rem' }}>{brandForm.isRegistered ? '🚗' : '🚘'}</span>
                                         )}
                                     </div>
                                 </div>
                                 {brandForm.isRegistered && (
                                     <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                                         HQ: {brandForm.address || '—'} &nbsp;|&nbsp; Tel: {brandForm.phone || '—'} &nbsp;|&nbsp; TIN: {brandForm.tin || '—'}
                                     </p>
                                 )}
                             </div>
                        </div>
                    </div>
                )}

                {/* ─── TAB 2: CURRENCY & EXCHANGE ─── */}
                {activeTab === 'Currency' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <p style={sectionHead}>💱 Showroom Base Exchange Currencies</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {CURRENCIES.map(c => (
                                    <button
                                        key={c.code}
                                        onClick={() => { setCurrency(c.code); showToast(`System display currency switched to ${c.code}.`); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)',
                                            background: currency.code === c.code ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                                            border: currency.code === c.code ? '1px solid rgba(99,102,241,0.6)' : '1px solid var(--border-color)',
                                            cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', width: '100%'
                                        }}
                                    >
                                        <span style={{ fontSize: '1.4rem' }}>{c.flag}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: currency.code === c.code ? 700 : 400, color: currency.code === c.code ? '#a5b4fc' : 'white', fontSize: '0.9rem' }}>
                                                {c.code} — {c.name}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                Symbol: {c.symbol} &nbsp;·&nbsp; 1 USD = {c.rateFromUSD.toLocaleString()} {c.code}
                                            </div>
                                        </div>
                                        {currency.code === c.code && (
                                            <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 700 }}>✓ Active</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 'var(--radius-sm)', padding: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            <p style={{ fontWeight: 600, color: 'var(--secondary-accent)', marginBottom: '0.5rem', marginTop: 0 }}>💱 Global Exchange Operations</p>
                            <p style={{ margin: 0 }}>All transactions, shipping costs, and general ledger journal balances are stored internally in **USD**. Switching currency converts all displayed figures in real-time. Incoming forms (e.g. quote parameters or vehicle costs) auto-convert back to base USD before write.</p>
                        </div>
                    </div>
                )}

                {/* ─── TAB 3: STAFF USER DIRECTORY (MERGED) ─── */}
                {activeTab === 'Users' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* Summary user counts by role */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
                            {ROLES.map(role => (
                                <div key={role} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{role}</p>
                                    <h3 style={{ fontSize: '1.5rem', margin: 0, color: ROLE_COLORS[role] }}>{users.filter(u => u.role === role).length}</h3>
                                </div>
                            ))}
                        </div>

                        {/* Search and filters toolbar */}
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                            <input
                                type="text"
                                placeholder="🔍 Search staff name, email..."
                                value={userSearchTerm}
                                onChange={e => setUserSearchTerm(e.target.value)}
                                style={{ flex: 1, ...inputStyle }}
                            />
                            <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)', padding: '0.25rem' }}>
                                {(['All', ...ROLES] as const).map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setUserRoleFilter(r)}
                                        style={{
                                            padding: '0.4rem 0.9rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontSize: '0.82rem',
                                            fontWeight: userRoleFilter === r ? 700 : 400,
                                            background: userRoleFilter === r ? 'var(--primary)' : 'transparent',
                                            color: userRoleFilter === r ? 'white' : 'var(--text-muted)', transition: 'all 0.15s'
                                        }}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Staff user list table */}
                        <div className="glass-panel" style={{ overflow: 'hidden' }}>
                            {usersLoading ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading staff records...</div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                                            {['Staff Member', 'Email Address', 'Permission Role', 'Assigned Branch', '2FA Status', 'Account Status', 'Actions'].map(h => (
                                                <th key={h} style={thStyle}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.length === 0 && (
                                            <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No staff members match the filters.</td></tr>
                                        )}
                                        {filteredUsers.map((u, idx, arr) => (
                                            <tr key={u.id} style={{ borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--border-color)', opacity: u.active ? 1 : 0.55 }}>
                                                <td style={tdStyle}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `linear-gradient(135deg, ${ROLE_COLORS[u.role]}, rgba(0,0,0,0.5))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                                                            {u.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 600 }}>{u.name}</div>
                                                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>ID: {u.id.substring(0, 10)}...</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{u.email}</td>
                                                <td style={tdStyle}>
                                                    <span className={`badge ${ROLE_BADGE[u.role] || ''}`} style={{ color: !ROLE_BADGE[u.role] ? 'var(--secondary-accent)' : undefined }}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td style={tdStyle}>{u.branch}</td>
                                                <td style={tdStyle}>
                                                    {isMfaEnabled(u.email) ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(34,197,94,0.12)', color: 'var(--success)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '20px', padding: '0.25rem 0.65rem', fontSize: '0.72rem', fontWeight: 700 }}>
                                                            🔐 Enabled
                                                        </span>
                                                    ) : (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '0.25rem 0.65rem', fontSize: '0.72rem', fontWeight: 600 }}>
                                                            Off
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={tdStyle}>
                                                    <span className={`badge ${u.active ? 'badge-success' : 'badge-danger'}`}>
                                                        {u.active ? 'Active' : 'Deactivated'}
                                                    </span>
                                                </td>
                                                <td style={tdStyle}>
                                                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                                        <button onClick={() => setEditUser(u)} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>Edit</button>
                                                        <button onClick={() => handleToggleUserActive(u)} style={{ color: u.active ? 'var(--danger)' : 'var(--success)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>
                                                            {u.active ? 'Deactivate' : 'Reactivate'}
                                                        </button>
                                                        {isMfaEnabled(u.email) && (
                                                            <button
                                                                onClick={() => setMfaResetTarget(u.email)}
                                                                style={{ color: 'var(--warning)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}
                                                            >
                                                                Reset 2FA
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                    </div>
                )}

                {/* ─── TAB 4: ROLES & PERMISSIONS ─── */}
                {activeTab === 'Permissions' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* Info Banner */}
                        <div style={{
                            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)',
                            borderRadius: 'var(--radius-sm)', padding: '1rem 1.25rem',
                            fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5,
                            display: 'flex', alignItems: 'flex-start', gap: '0.75rem'
                        }}>
                            <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🔐</span>
                            <div>
                                <p style={{ fontWeight: 700, color: '#a5b4fc', margin: '0 0 0.3rem 0' }}>Module Access Control</p>
                                <p style={{ margin: 0 }}>Control which system modules each role can access. Toggle modules ON/OFF for each role. Changes take effect immediately for all users with that role. Admin role always retains full access and cannot be restricted.</p>
                            </div>
                        </div>

                        {/* Permissions Matrix */}
                        <div className="glass-panel" style={{ overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                                        <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', width: '280px' }}>Module</th>
                                        {(['Admin', 'Sales', 'Finance', 'Logistics', 'Service'] as const).map(role => (
                                            <th key={role} style={{
                                                padding: '0.85rem 0.75rem', fontWeight: 700, fontSize: '0.78rem',
                                                textAlign: 'center', letterSpacing: '0.03em',
                                                color: role === 'Admin' ? 'var(--danger)' : role === 'Finance' ? 'var(--success)' : role === 'Sales' ? 'var(--primary)' : role === 'Logistics' ? 'var(--secondary-accent)' : 'var(--warning)'
                                            }}>{role}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {ALL_MODULES.map((mod, idx) => (
                                        <tr key={mod.key} style={{ borderBottom: idx === ALL_MODULES.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.75rem 1.25rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                    <span style={{ fontSize: '0.9rem' }}>{mod.icon}</span>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{mod.label}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{mod.description}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            {(['Admin', 'Sales', 'Finance', 'Logistics', 'Service'] as const).map(role => {
                                                const enabled = hasAccess(role, mod.key);
                                                const isAdminRole = role === 'Admin';
                                                const isLocked = isAdminRole || mod.adminOnly;
                                                return (
                                                    <td key={role} style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => !isLocked && toggleModuleForRole(role, mod.key)}
                                                            disabled={isLocked}
                                                            style={{
                                                                width: '40px', height: '24px', borderRadius: '12px', border: 'none',
                                                                cursor: isLocked ? 'not-allowed' : 'pointer',
                                                                background: enabled
                                                                    ? (isLocked ? 'rgba(99,102,241,0.25)' : 'var(--success)')
                                                                    : 'rgba(255,255,255,0.08)',
                                                                position: 'relative', transition: 'all 0.2s',
                                                                opacity: isLocked ? 0.6 : 1
                                                            }}
                                                        >
                                                            <span style={{
                                                                position: 'absolute', top: '2px',
                                                                left: enabled ? '18px' : '2px',
                                                                width: '20px', height: '20px', borderRadius: '50%',
                                                                background: enabled ? 'white' : 'rgba(255,255,255,0.3)',
                                                                transition: 'all 0.2s',
                                                                boxShadow: enabled ? '0 1px 3px rgba(0,0,0,0.3)' : 'none'
                                                            }} />
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Role Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
                            {(['Admin', 'Sales', 'Finance', 'Logistics', 'Service'] as const).map(role => {
                                const count = role === 'Admin' ? ALL_MODULES.length : (permissions[role]?.length || 0);
                                const roleColor = role === 'Admin' ? 'var(--danger)' : role === 'Finance' ? 'var(--success)' : role === 'Sales' ? 'var(--primary)' : role === 'Logistics' ? 'var(--secondary-accent)' : 'var(--warning)';
                                return (
                                    <div key={role} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', borderTop: `2px solid ${roleColor}` }}>
                                        <p style={{ color: roleColor, fontSize: '0.78rem', fontWeight: 700, margin: 0 }}>{role}</p>
                                        <h3 style={{ fontSize: '1.4rem', margin: 0 }}>{count} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ {ALL_MODULES.length} modules</span></h3>
                                        <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', marginTop: '0.25rem' }}>
                                            <div style={{ height: '100%', borderRadius: '2px', background: roleColor, width: `${(count / ALL_MODULES.length) * 100}%`, transition: 'width 0.3s' }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                    </div>
                )}

                {/* ─── Admin 2FA Reset Confirmation Modal ─── */}
                {mfaResetTarget && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                        <div className="glass-panel" style={{ width: '420px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem' }}>🔐</div>
                            <div>
                                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>Reset 2-Step Verification</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
                                    This will <strong style={{ color: 'var(--warning)' }}>disable 2FA</strong> for <strong style={{ color: 'white' }}>{mfaResetTarget}</strong>. The user will be able to log in without a verification code until they re-enable it.
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    className="btn-primary"
                                    style={{ flex: 1, background: 'rgba(245,158,11,0.15)', borderColor: 'var(--warning)', color: 'var(--warning)' }}
                                    onClick={async () => {
                                        const ok = await disableMfa(mfaResetTarget);
                                        if (ok) showToast(`2FA reset for ${mfaResetTarget}.`, 'warning');
                                        else showToast('Reset failed — user may not have 2FA enabled.', 'danger');
                                        setMfaResetTarget(null);
                                    }}
                                >
                                    ⚠️ Confirm Reset
                                </button>
                                <button className="btn-outline" style={{ flex: 1 }} onClick={() => setMfaResetTarget(null)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Edit User Modal ─── */}
                {editUser && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div className="glass-panel" style={{ width: '480px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>👤 Edit Staff Member</h3>
                                <button onClick={() => setEditUser(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div><label style={labelStyle}>Full Name</label><input style={inputStyle} value={editUser.name} onChange={e => setEditUser({ ...editUser, name: e.target.value })} /></div>
                                <div>
                                    <label style={labelStyle}>Permission Role</label>
                                    <select style={{ ...inputStyle, height: '44px' }} value={editUser.role} onChange={e => setEditUser({ ...editUser, role: e.target.value as UserRole })}>
                                        {ROLES.map(r => <option key={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Showroom Branch Assignment</label>
                                    <select style={{ ...inputStyle, height: '44px' }} value={editUser.branch} onChange={e => setEditUser({ ...editUser, branch: e.target.value as Branch })}>
                                        {BRANCHES.map(b => <option key={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                    <input type="checkbox" id="active-edit-toggle" checked={editUser.active} onChange={e => setEditUser({ ...editUser, active: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: 'var(--success)', cursor: 'pointer' }} />
                                    <label htmlFor="active-edit-toggle" style={{ fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', margin: 0 }}>Account Active</label>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                                    <button className="btn-primary" onClick={handleSaveUserEdit} style={{ flex: 1 }} disabled={savingUser}>{savingUser ? 'Saving...' : '💾 Save Changes'}</button>
                                    <button className="btn-outline" onClick={() => setEditUser(null)} style={{ flex: 1 }}>Cancel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Invite Staff Modal ─── */}
                {showInvite && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div className="glass-panel" style={{ width: '480px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>📨 Invite Staff Member</h3>
                                <button onClick={() => setShowInvite(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
                            </div>
                            <form onSubmit={handleInviteUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div><label style={labelStyle}>Full Name *</label><input required style={inputStyle} value={inviteForm.name} onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder="e.g. Alice Cooper" /></div>
                                <div><label style={labelStyle}>Email Address *</label><input required type="email" style={inputStyle} value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="alice@garisphere.com" /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label style={labelStyle}>Role</label>
                                        <select style={{ ...inputStyle, height: '44px' }} value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value as UserRole })}>
                                            {ROLES.map(r => <option key={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Branch</label>
                                        <select style={{ ...inputStyle, height: '44px' }} value={inviteForm.branch} onChange={e => setInviteForm({ ...inviteForm, branch: e.target.value as Branch })}>
                                            {BRANCHES.map(b => <option key={b}>{b}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                    An email invite will be sent to pre-register their credentials and prompt password initialization.
                                </div>
                                <button type="submit" className="btn-primary" disabled={savingUser}>{savingUser ? 'Sending...' : '📨 Send Invitation'}</button>
                            </form>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                ⚙️ Loading settings...
            </div>
        }>
            <SettingsContent />
        </Suspense>
    );
}

const OFFLINE_USERS_SEED: StaffUser[] = [
    { id: 'demo-1', name: 'System Admin', email: 'admin@garisphere.com', role: 'Admin', branch: 'Kampala Main', active: true },
    { id: 'demo-2', name: 'Alex T.', email: 'alex@garisphere.com', role: 'Sales', branch: 'Kampala Main', active: true },
    { id: 'demo-3', name: 'Sarah M.', email: 'sarah@garisphere.com', role: 'Sales', branch: 'Jinja Showroom', active: true },
    { id: 'demo-4', name: 'James O.', email: 'james@garisphere.com', role: 'Finance', branch: 'Kampala Main', active: true },
    { id: 'demo-5', name: 'Mike R.', email: 'mike@garisphere.com', role: 'Service', branch: 'Entebbe Hub', active: false }
];
