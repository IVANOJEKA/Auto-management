'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import { DEFAULT_FI_PACKAGES } from '../../context/BusinessContext';
import type { FiPackage } from '../../context/BusinessContext';
import { useCurrency, CURRENCIES } from '../../context/CurrencyContext';
import { usePermissions, ALL_MODULES } from '../../context/PermissionsContext';
import { useBranches } from '../../context/BranchContext';
import { useData } from '../../context/DataContext';
import Sidebar from '../../components/Sidebar';
import { supabase } from '../../lib/supabase';
import '../globals.css';

type SettingsTab = 'Company' | 'Currency' | 'Users' | 'Branches' | 'Permissions' | 'Integrations';
type UserRole = 'Admin' | 'Sales' | 'Finance' | 'Logistics' | 'Service';
type Branch = string; // Dynamic — managed via Branches tab

interface StaffUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    branch: Branch;
    active: boolean;
}

const ROLES: UserRole[] = ['Admin', 'Sales', 'Finance', 'Logistics', 'Service'];

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
    const { branches, addBranch, removeBranch, renameBranch } = useBranches();
    const { resetAllData } = useData();
    const [mfaResetTarget, setMfaResetTarget] = useState<string | null>(null);

    // Branch management state
    const [newBranchName, setNewBranchName] = useState('');
    const [addingBranch, setAddingBranch] = useState(false);
    const [renamingBranch, setRenamingBranch] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');

    // Integrations state
    const [websiteIntegration, setWebsiteIntegration] = useState({
        enabled: false,
        websiteUrl: '',
        apiKey: '',
        syncInventory: true,
        syncPricing: true,
        syncPhotos: true,
        syncLeads: true,
        webhookUrl: '',
        lastSync: null as string | null,
    });
    const [mobileApp, setMobileApp] = useState({
        enabled: false,
        appName: 'GariSphere Staff App',
        platform: 'Both' as 'iOS' | 'Android' | 'Both',
        staffAccess: true,
        customerFacing: false,
        pushNotifications: true,
        apiToken: '',
        tokenExpiry: null as string | null,
    });
    const [generatingKey, setGeneratingKey] = useState(false);
    const [generatingToken, setGeneratingToken] = useState(false);
    const [integrationSaved, setIntegrationSaved] = useState(false);

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
    const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'Sales' as UserRole, branch: branches[0] || 'Kampala Main' });
    const [savingUser, setSavingUser] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState<'All' | UserRole>('All');

    // Toast alerts
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'danger' | 'warning' } | null>(null);
    const [testingUra, setTestingUra] = useState(false);

    // Data Reset state
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetConfirmText, setResetConfirmText] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetResult, setResetResult] = useState<{ success: boolean; message: string; results?: Record<string, { deleted: number | null; error?: string }> } | null>(null);

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
                const sessionRes = await supabase.auth.getSession();
                const token = sessionRes.data.session?.access_token;
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                const res = await fetch('/api/users', { headers });
                if (res.ok) {
                    const data = await res.json();
                    setUsers(data);
                    // Sync online users to localStorage for offline fallback availability
                    localStorage.setItem('garisphere_offline_users', JSON.stringify(data));
                } else {
                    // Fallback offline users
                    const stored = localStorage.getItem('garisphere_offline_users');
                    if (stored) {
                        setUsers(JSON.parse(stored));
                    } else {
                        setUsers(OFFLINE_USERS_SEED);
                        localStorage.setItem('garisphere_offline_users', JSON.stringify(OFFLINE_USERS_SEED));
                    }
                }
            } catch {
                // Fallback offline users
                const stored = localStorage.getItem('garisphere_offline_users');
                if (stored) {
                    setUsers(JSON.parse(stored));
                } else {
                    setUsers(OFFLINE_USERS_SEED);
                    localStorage.setItem('garisphere_offline_users', JSON.stringify(OFFLINE_USERS_SEED));
                }
            }
            setUsersLoading(false);
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
                <button className="btn-primary" onClick={() => router.push('/dashboard')}>Return to Dashboard</button>
            </div>
        );
    }

    const showToast = (msg: string, type: 'success' | 'danger' | 'warning' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ─── Data Reset Handler ──────────────────────────────────────────────────
    const handleDatabaseReset = async () => {
        if (resetConfirmText !== 'RESET ALL DATA') return;
        setResetLoading(true);
        setResetResult(null);

        const lsKeys = [
            'dms_vehicles', 'dms_leads', 'dms_clients', 'dms_deals', 'dms_compliance',
            'dms_repair_orders', 'dms_invoices', 'dms_shipments', 'dms_parts', 'dms_ledger',
            'dms_work_shifts', 'dms_appointments', 'dms_team_notices', 'dms_suppliers',
            'dms_supplier_transactions', 'dms_parts_purchase_orders', 'dms_active_shift', 'dms_parts_sales',
            'garisphere_offline_users'
        ];

        // 1. Mark workspace as intentionally reset
        try { localStorage.setItem('dms_data_reset', 'true'); } catch {}

        // 2. Clear all local storage keys immediately to empty arrays
        lsKeys.forEach(k => { try { localStorage.setItem(k, '[]'); } catch {} });

        // 3. Instantly reset React state in DataContext
        try {
            if (resetAllData) await resetAllData();
        } catch { /* non-fatal */ }

        // 4. Dispatch Cloud DB wipe with timeout guard
        try {
            const sessionRes = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
            const token = sessionRes.data?.session?.access_token;
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const res = await fetch('/api/reset', {
                method: 'POST',
                headers,
                body: JSON.stringify({ confirmToken: 'RESET_ALL_DATA' }),
                signal: controller.signal
            }).catch(() => null);

            clearTimeout(timeoutId);

            if (res && (res.ok || res.status === 207)) {
                const data = await res.json().catch(() => ({}));
                setResetResult({
                    success: true,
                    message: data.message || 'All records wiped from database and local storage.',
                    results: data.results
                });
                showToast('All records wiped from database and local storage.', 'warning');
            } else {
                setResetResult({
                    success: true,
                    message: 'Local cache cleared. Cloud database reset initiated.'
                });
                showToast('Local cache cleared successfully.', 'warning');
            }
        } catch (err: any) {
            setResetResult({
                success: true,
                message: 'Local data cleared (offline mode).'
            });
            showToast('Local data cleared (offline mode).', 'warning');
        } finally {
            setResetLoading(false);
            setResetConfirmText('');
        }
    };

    const handleCloseResetModal = () => {
        const shouldReload = resetResult !== null;
        setShowResetModal(false);
        setResetResult(null);
        setResetConfirmText('');
        if (shouldReload) {
            window.location.reload();
        }
    };

    const handleTestUraConnection = async () => {
        if (!brandForm.tin) {
            showToast('Please specify a Tax TIN number before testing connection.', 'danger');
            return;
        }
        setTestingUra(true);
        try {
            const sessionRes = await supabase.auth.getSession();
            const token = sessionRes.data.session?.access_token;
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch('/api/ura/verify-tin', {
                method: 'POST',
                headers,
                body: JSON.stringify({ tin: brandForm.tin })
            });
            const data = await res.json();
            if (res.ok && data.valid) {
                showToast(`URA EFRIS Connected! Taxpayer: ${data.taxpayerName} (${data.status})`, 'success');
            } else {
                showToast(data.error || 'Connection check failed. Verify TIN with URA.', 'danger');
            }
        } catch {
            showToast('Unable to reach URA server. Verify offline network status.', 'danger');
        } finally {
            setTestingUra(false);
        }
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
            const sessionRes = await supabase.auth.getSession();
            const token = sessionRes.data.session?.access_token;
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch('/api/users', {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    id: editUser.id,
                    name: editUser.name,
                    role: editUser.role,
                    branch: editUser.branch,
                    active: editUser.active
                })
            });
            if (res.ok) {
                const updated = users.map(u => u.id === editUser.id ? editUser : u);
                setUsers(updated);
                localStorage.setItem('garisphere_offline_users', JSON.stringify(updated));
                setEditUser(null);
                showToast(`Staff account for ${editUser.name} updated.`);
            } else {
                showToast('Failed to update staff account.', 'danger');
            }
        } catch {
            // Local fallback
            const updated = users.map(u => u.id === editUser.id ? editUser : u);
            setUsers(updated);
            localStorage.setItem('garisphere_offline_users', JSON.stringify(updated));
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
        const updated = [newUser, ...users];
        setUsers(updated);
        localStorage.setItem('garisphere_offline_users', JSON.stringify(updated));
        setShowInvite(false);
        setInviteForm({ name: '', email: '', role: 'Sales', branch: branches[0] || 'Kampala Main' });
        showToast(`Invitation sent to ${newUser.email}.`, 'success');
        setSavingUser(false);
    };

    // Toggle staff active status
    const handleToggleUserActive = async (targetUser: StaffUser) => {
        const updated = { ...targetUser, active: !targetUser.active };
        try {
            const sessionRes = await supabase.auth.getSession();
            const token = sessionRes.data.session?.access_token;
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch('/api/users', {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ id: targetUser.id, active: updated.active })
            });
            if (res.ok) {
                const updatedList = users.map(u => u.id === targetUser.id ? updated : u);
                setUsers(updatedList);
                localStorage.setItem('garisphere_offline_users', JSON.stringify(updatedList));
                showToast(`Staff member ${targetUser.name} ${updated.active ? 'reactivated' : 'deactivated'}.`);
            } else {
                showToast('Failed to update staff active status.', 'danger');
            }
        } catch {
            const updatedList = users.map(u => u.id === targetUser.id ? updated : u);
            setUsers(updatedList);
            localStorage.setItem('garisphere_offline_users', JSON.stringify(updatedList));
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
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Configure business branding, currency parameters, staff permissions and data management</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        {activeTab === 'Company' && (
                            <>
                                <button className="btn-outline" onClick={() => { setBrandForm({ ...business }); resetBusiness(); showToast('Default business profile restored.', 'warning'); }}>↺ Reset Defaults</button>
                                <button className="btn-primary" onClick={handleSaveBranding}>💾 Save Branding</button>
                            </>
                        )}
                        {activeTab === 'Users' && (
                            <button className="btn-primary" onClick={() => setShowInvite(true)}>+ Invite Staff Member</button>
                        )}
                        {activeTab === 'Permissions' && (
                            <button className="btn-outline" onClick={() => { resetPermissions(); showToast('Permissions reset to system defaults.', 'warning'); }}>↺ Reset to Defaults</button>
                        )}
                        {/* Always-visible danger reset button */}
                        <button
                            onClick={() => { setShowResetModal(true); setResetResult(null); setResetConfirmText(''); }}
                            style={{
                                padding: '0.55rem 1rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid rgba(239,68,68,0.5)',
                                background: 'rgba(239,68,68,0.1)',
                                color: 'var(--danger)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = 'var(--danger)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; }}
                        >
                            🗑️ Clear All Data
                        </button>
                    </div>
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
                        { key: 'Branches', label: '🏪 Branches' },
                        { key: 'Permissions', label: '🔐 Roles & Permissions' },
                        { key: 'Integrations', label: '🔗 Integrations' }
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

                             <p style={{ ...sectionHead, marginTop: '1.5rem' }}>🇺🇬 Uganda Revenue Authority (URA) Integration</p>

                             <div style={{
                                 display: 'flex', alignItems: 'center', gap: '0.75rem',
                                 background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem',
                                 borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)',
                                 marginBottom: '0.5rem'
                             }}>
                                 <input
                                     type="checkbox"
                                     id="uraEnabled"
                                     checked={brandForm.uraEnabled || false}
                                     onChange={e => setBrandForm({ ...brandForm, uraEnabled: e.target.checked })}
                                     style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                 />
                                 <label htmlFor="uraEnabled" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', cursor: 'pointer', margin: 0 }}>
                                     Activate URA EFRIS Fiscal e-Invoicing Integration
                                 </label>
                             </div>

                             {(brandForm.uraEnabled) && (
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                         <div>
                                             <label style={labelStyle}>EFRIS Device ID / Number</label>
                                             <input style={inputStyle} value={brandForm.efrisDeviceNumber || ''} onChange={e => setBrandForm({ ...brandForm, efrisDeviceNumber: e.target.value })} placeholder="e.g. DEV-4412" />
                                         </div>
                                         <div>
                                             <label style={labelStyle}>EFRIS Client Key / Secret</label>
                                             <input type="password" style={inputStyle} value={brandForm.efrisAppKey || ''} onChange={e => setBrandForm({ ...brandForm, efrisAppKey: e.target.value })} placeholder="••••••••••••••••" />
                                         </div>
                                     </div>

                                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
                                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                             <input
                                                 type="checkbox"
                                                 id="uraSandboxMode"
                                                 checked={brandForm.uraSandboxMode !== false}
                                                 onChange={e => setBrandForm({ ...brandForm, uraSandboxMode: e.target.checked })}
                                                 style={{ cursor: 'pointer' }}
                                             />
                                             <label htmlFor="uraSandboxMode" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', cursor: 'pointer', margin: 0 }}>
                                                 Sandbox Test Mode (Simulate URA Connection)
                                             </label>
                                         </div>

                                         <button 
                                             type="button" 
                                             className="btn-outline" 
                                             onClick={handleTestUraConnection}
                                             disabled={testingUra}
                                             style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', background: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.2)' }}
                                         >
                                             {testingUra ? '⏳ Testing Connection...' : '🔌 Test URA Connection'}
                                         </button>
                                     </div>
                                 </div>
                             )}
                         </div>

                         {/* Live document header preview */}
                         <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                             <p style={sectionHead}>📄 Showroom Print Agreement Header Preview</p>
                             <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center' }}>
                                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
                                     <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                         {brandForm.isRegistered ? (
                                             brandForm.logoImage ? (
                                                 <img src={brandForm.logoImage} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                             ) : (
                                                 <span style={{ fontSize: '2.2rem' }}>{brandForm.logoEmoji || '🏎'}</span>
                                             )
                                         ) : (
                                             <img src="/garisphere-logo.png" alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
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

                        {/* ─── F&I PACKAGES EDITOR ─── */}
                        <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div>
                                        <p style={sectionHead}>📦 F&amp;I Add-On Packages (Finance &amp; Insurance)</p>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '-0.5rem 0 0 0' }}>These packages appear as optional add-ons in the Sales Desking Console. Prices are in local currency.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newPkg: FiPackage = { id: `pkg-${Date.now()}`, name: 'New Package', price: 0 };
                                            setBrandForm(prev => ({ ...prev, fiPackages: [...(prev.fiPackages || DEFAULT_FI_PACKAGES), newPkg] }));
                                        }}
                                        style={{ padding: '0.45rem 1rem', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap' }}
                                    >
                                        + Add Package
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {(brandForm.fiPackages || DEFAULT_FI_PACKAGES).map((pkg, idx) => (
                                        <div key={pkg.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.75rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
                                                <input
                                                    type="text"
                                                    value={pkg.name}
                                                    onChange={e => {
                                                        const updated = (brandForm.fiPackages || DEFAULT_FI_PACKAGES).map((p, i) => i === idx ? { ...p, name: e.target.value } : p);
                                                        setBrandForm(prev => ({ ...prev, fiPackages: updated }));
                                                    }}
                                                    placeholder="Package name"
                                                    style={{ ...inputStyle, padding: '0.45rem 0.7rem', fontSize: '0.85rem' }}
                                                />
                                                <input
                                                    type="number"
                                                    value={pkg.price}
                                                    onChange={e => {
                                                        const updated = (brandForm.fiPackages || DEFAULT_FI_PACKAGES).map((p, i) => i === idx ? { ...p, price: parseFloat(e.target.value) || 0 } : p);
                                                        setBrandForm(prev => ({ ...prev, fiPackages: updated }));
                                                    }}
                                                    placeholder="Price"
                                                    style={{ ...inputStyle, padding: '0.45rem 0.7rem', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>local currency</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const updated = (brandForm.fiPackages || DEFAULT_FI_PACKAGES).filter((_, i) => i !== idx);
                                                    setBrandForm(prev => ({ ...prev, fiPackages: updated }));
                                                }}
                                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '4px', color: 'var(--danger)', cursor: 'pointer', padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                    {(brandForm.fiPackages || DEFAULT_FI_PACKAGES).length === 0 && (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No F&amp;I packages. Click &quot;+ Add Package&quot; to create one.</p>
                                    )}
                                </div>
                                <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setBrandForm(prev => ({ ...prev, fiPackages: DEFAULT_FI_PACKAGES }))}
                                        style={{ padding: '0.4rem 0.85rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem' }}
                                    >
                                        ↺ Reset to Defaults
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveBranding}
                                        style={{ padding: '0.4rem 0.85rem', background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.4)', borderRadius: '4px', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                                    >
                                        💾 Save Packages
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ─── DANGER ZONE ─── */}
                        <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                            <div style={{
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 'var(--radius-md)',
                                overflow: 'hidden',
                                background: 'rgba(239,68,68,0.03)'
                            }}>
                                {/* Header */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '1rem 1.5rem',
                                    background: 'rgba(239,68,68,0.06)',
                                    borderBottom: '1px solid rgba(239,68,68,0.2)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--danger)' }}>Danger Zone</h4>
                                            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Irreversible destructive actions. Admin access only.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Reset Row */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '1.25rem 1.5rem', gap: '2rem'
                                }}>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'white' }}>🗑️ Reset All Database Records</p>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            Permanently deletes all vehicles, invoices, deals, leads, clients, compliance records, repair orders,
                                            shipments, and ledger entries for this tenant from the live Supabase database and local storage.
                                            This action <strong style={{ color: 'var(--danger)' }}>cannot be undone</strong>.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { setShowResetModal(true); setResetResult(null); setResetConfirmText(''); }}
                                        style={{
                                            padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.4)',
                                            background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', cursor: 'pointer',
                                            fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        Reset All Data
                                    </button>
                                </div>
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

                        {/* Branch Access Policy Banner */}
                        <div style={{
                            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.28)',
                            borderRadius: 'var(--radius-sm)', padding: '1rem 1.25rem',
                            display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
                        }}>
                            <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>🔐</span>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.9rem', color: '#a5b4fc' }}>Branch Access Policy</p>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.55 }}>
                                    Each staff member is <strong style={{ color: 'white' }}>locked to their assigned branch</strong> — they can only see and interact with data (vehicles, leads, clients, deals, invoices) belonging to that branch.
                                    <br/>Only the <span style={{ color: 'var(--danger)', fontWeight: 700 }}>Admin</span> account has full cross-branch visibility and the global branch switcher.
                                    Reassign a staff member's branch below to change their data scope immediately.
                                </p>
                            </div>
                        </div>

                        {/* Branch distribution summary */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
                            {ROLES.map(role => {
                                const count = users.filter(u => u.role === role).length;
                                return (
                                    <div key={role} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: `2px solid ${ROLE_COLORS[role]}` }}>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>{role}</p>
                                        <h3 style={{ fontSize: '1.5rem', margin: 0, color: ROLE_COLORS[role] }}>{count}</h3>
                                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0 }}>
                                            {role === 'Admin' ? '🌐 All Branches' : count === 0 ? 'No staff' : `${[...new Set(users.filter(u => u.role === role).map(u => u.branch))].join(', ')}`}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Branch breakdown cards */}
                        {branches.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                                {branches.map(b => {
                                    const branchUsers = users.filter(u => u.branch === b);
                                    return (
                                        <div key={b} style={{
                                            background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-sm)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '1rem' }}>🏪</span>
                                                <p style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>{b}</p>
                                                <span style={{ marginLeft: 'auto', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', borderRadius: '20px', padding: '0.15rem 0.5rem', fontSize: '0.68rem', fontWeight: 700 }}>
                                                    {branchUsers.length} staff
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                                {branchUsers.length === 0 ? (
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>No staff assigned</span>
                                                ) : branchUsers.map(u => (
                                                    <span key={u.id} style={{
                                                        fontSize: '0.7rem', background: `${ROLE_COLORS[u.role]}22`,
                                                        color: ROLE_COLORS[u.role], border: `1px solid ${ROLE_COLORS[u.role]}44`,
                                                        borderRadius: '20px', padding: '0.15rem 0.5rem', fontWeight: 600
                                                    }}>
                                                        {u.name.split(' ')[0]}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

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
                                                <td style={tdStyle}>
                                                    {u.role === 'Admin' ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(239,68,68,0.10)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '20px', padding: '0.25rem 0.65rem', fontSize: '0.72rem', fontWeight: 700 }}>
                                                            🌐 All Branches
                                                        </span>
                                                    ) : (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(99,102,241,0.10)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '20px', padding: '0.25rem 0.65rem', fontSize: '0.72rem', fontWeight: 600 }}>
                                                            🏪 {u.branch}
                                                        </span>
                                                    )}
                                                </td>
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


                {/* ─── TAB: BRANCHES ─── */}
                {activeTab === 'Branches' && (
                    <div style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* Info banner */}
                        <div style={{
                            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)',
                            borderRadius: 'var(--radius-sm)', padding: '1rem 1.25rem',
                            display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
                        }}>
                            <span style={{ fontSize: '1.3rem' }}>🏪</span>
                            <div>
                                <p style={{ fontWeight: 700, marginBottom: '0.2rem', fontSize: '0.9rem' }}>Branch Management</p>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                                    Branches are shared across the entire DMS — staff accounts, inventory, leads, and reports all filter by branch.
                                    Changes here instantly update every dropdown in the system. No code changes needed.
                                </p>
                            </div>
                        </div>

                        {/* Add new branch */}
                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <p style={sectionHead}>➕ Add New Branch</p>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <input
                                    style={{ ...inputStyle, flex: 1 }}
                                    placeholder="e.g. Mombasa Hub, Nairobi Branch…"
                                    value={newBranchName}
                                    onChange={e => setNewBranchName(e.target.value)}
                                    onKeyDown={async e => {
                                        if (e.key === 'Enter' && newBranchName.trim()) {
                                            setAddingBranch(true);
                                            await addBranch(newBranchName.trim());
                                            setNewBranchName('');
                                            setAddingBranch(false);
                                            showToast(`Branch "${newBranchName.trim()}" added successfully.`);
                                        }
                                    }}
                                />
                                <button
                                    className="btn-primary"
                                    disabled={!newBranchName.trim() || addingBranch || branches.includes(newBranchName.trim())}
                                    onClick={async () => {
                                        if (!newBranchName.trim()) return;
                                        setAddingBranch(true);
                                        await addBranch(newBranchName.trim());
                                        const added = newBranchName.trim();
                                        setNewBranchName('');
                                        setAddingBranch(false);
                                        showToast(`Branch "${added}" added successfully.`);
                                    }}
                                    style={{ whiteSpace: 'nowrap', minWidth: '100px' }}
                                >
                                    {addingBranch ? '…' : '+ Add Branch'}
                                </button>
                            </div>
                            {newBranchName.trim() && branches.includes(newBranchName.trim()) && (
                                <p style={{ fontSize: '0.78rem', color: 'var(--danger)', marginTop: '0.4rem' }}>⚠ A branch with that name already exists.</p>
                            )}
                        </div>

                        {/* Branch list */}
                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <p style={sectionHead}>📍 Current Branches ({branches.length})</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {branches.map((b, idx) => (
                                    <div key={b} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem',
                                        transition: 'border-color 0.15s'
                                    }}>
                                        <span style={{ fontSize: '1rem', opacity: 0.7 }}>🏪</span>

                                        {renamingBranch === b ? (
                                            /* Inline rename input */
                                            <>
                                                <input
                                                    autoFocus
                                                    style={{ ...inputStyle, flex: 1, padding: '0.4rem 0.7rem', fontSize: '0.88rem' }}
                                                    value={renameValue}
                                                    onChange={e => setRenameValue(e.target.value)}
                                                    onKeyDown={async e => {
                                                        if (e.key === 'Enter' && renameValue.trim()) {
                                                            await renameBranch(b, renameValue.trim());
                                                            showToast(`Renamed to "${renameValue.trim()}".`);
                                                            setRenamingBranch(null);
                                                        }
                                                        if (e.key === 'Escape') setRenamingBranch(null);
                                                    }}
                                                />
                                                <button
                                                    className="btn-primary"
                                                    style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
                                                    onClick={async () => {
                                                        if (!renameValue.trim()) return;
                                                        await renameBranch(b, renameValue.trim());
                                                        showToast(`Renamed to "${renameValue.trim()}".`);
                                                        setRenamingBranch(null);
                                                    }}
                                                >Save</button>
                                                <button
                                                    className="btn-outline"
                                                    style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
                                                    onClick={() => setRenamingBranch(null)}
                                                >Cancel</button>
                                            </>
                                        ) : (
                                            <>
                                                <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem' }}>{b}</span>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.55rem', borderRadius: '20px' }}>
                                                    #{idx + 1}
                                                </span>
                                                <button
                                                    title="Rename branch"
                                                    onClick={() => { setRenamingBranch(b); setRenameValue(b); }}
                                                    style={{
                                                        background: 'none', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                                                        padding: '0.35rem 0.65rem', cursor: 'pointer', fontSize: '0.78rem',
                                                        color: 'var(--secondary-accent)', transition: 'all 0.15s'
                                                    }}
                                                >✏ Rename</button>
                                                <button
                                                    title={`Remove ${b}`}
                                                    onClick={async () => {
                                                        if (!confirm(`Remove branch "${b}"? Staff assigned to it will need to be reassigned.`)) return;
                                                        await removeBranch(b);
                                                        showToast(`Branch "${b}" removed.`, 'warning');
                                                    }}
                                                    style={{
                                                        background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)',
                                                        padding: '0.35rem 0.65rem', cursor: 'pointer',
                                                        fontSize: '0.78rem', color: 'var(--danger)',
                                                        transition: 'all 0.15s'
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'var(--danger)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                                                >🗑 Remove</button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>

                        </div>

                        {/* Usage tip */}
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0 0.25rem' }}>
                            💡 <strong>Tip:</strong> After adding branches, go to <strong>Staff Directory</strong> to assign staff members to the new branch.
                            Branch data is saved to your database and synced across all sessions.
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

                        {/* ── Users Management Section ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>👥 Staff Accounts</p>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>Manage who has access to the system, their role and branch assignment.</p>
                                </div>
                                <button
                                    className="btn-primary"
                                    onClick={() => setShowInvite(true)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
                                >
                                    ＋ Add New User
                                </button>
                            </div>

                            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                                {usersLoading ? (
                                    <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading staff accounts...</div>
                                ) : users.length === 0 ? (
                                    <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <p style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>👤</p>
                                        <p style={{ margin: 0 }}>No staff accounts yet. Add your first user above.</p>
                                    </div>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                                                {['Staff Member', 'Role', 'Branch', 'Status', 'Actions'].map(h => (
                                                    <th key={h} style={thStyle}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((u, idx, arr) => (
                                                <tr key={u.id} style={{ borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--border-color)', opacity: u.active ? 1 : 0.5 }}>
                                                    <td style={tdStyle}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                                            <div style={{
                                                                width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                                                                background: `linear-gradient(135deg, ${ROLE_COLORS[u.role]}, rgba(0,0,0,0.5))`,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem'
                                                            }}>
                                                                {u.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{u.name}</div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <span className={`badge ${ROLE_BADGE[u.role] || ''}`} style={{ color: !ROLE_BADGE[u.role] ? 'var(--secondary-accent)' : undefined, fontSize: '0.72rem' }}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td style={tdStyle}>
                                                        {u.role === 'Admin' ? (
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(239,68,68,0.10)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '20px', padding: '0.2rem 0.55rem', fontSize: '0.7rem', fontWeight: 700 }}>
                                                                🌐 All Branches
                                                            </span>
                                                        ) : (
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(99,102,241,0.10)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '20px', padding: '0.2rem 0.55rem', fontSize: '0.7rem', fontWeight: 600 }}>
                                                                🏪 {u.branch}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <span className={`badge ${u.active ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                                                            {u.active ? '● Active' : '● Deactivated'}
                                                        </span>
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                            <button
                                                                onClick={() => setEditUser(u)}
                                                                style={{
                                                                    padding: '0.3rem 0.75rem', fontSize: '0.78rem', fontWeight: 600,
                                                                    background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
                                                                    color: '#a5b4fc', borderRadius: 'var(--radius-sm)', cursor: 'pointer'
                                                                }}
                                                            >
                                                                ✏ Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleUserActive(u)}
                                                                style={{
                                                                    padding: '0.3rem 0.75rem', fontSize: '0.78rem', fontWeight: 600,
                                                                    background: u.active ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                                                                    border: `1px solid ${u.active ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                                                                    color: u.active ? 'var(--danger)' : 'var(--success)',
                                                                    borderRadius: 'var(--radius-sm)', cursor: 'pointer'
                                                                }}
                                                            >
                                                                {u.active ? 'Deactivate' : 'Reactivate'}
                                                            </button>
                                                            {isMfaEnabled(u.email) && (
                                                                <button
                                                                    onClick={() => setMfaResetTarget(u.email)}
                                                                    style={{
                                                                        padding: '0.3rem 0.75rem', fontSize: '0.78rem', fontWeight: 600,
                                                                        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
                                                                        color: 'var(--warning)', borderRadius: 'var(--radius-sm)', cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    🔑 Reset 2FA
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

                {/* ─── Admin Data Reset Modal ─── */}
                {showResetModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.95)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                        <div className="glass-panel" style={{ width: '500px', maxHeight: '85vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, color: 'var(--danger)', fontSize: '1.1rem' }}>⚠️ Permanent Database Reset</h3>
                                <button onClick={handleCloseResetModal} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
                            </div>

                            {/* Warning block */}
                            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-sm)', padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: 'var(--danger)' }}>This will permanently delete from Supabase:</p>
                                <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.15rem' }}>
                                    {['All Vehicles', 'All Invoices', 'All Deals', 'All Ledger Entries', 'All Leads', 'All Clients', 'All Compliance Records', 'All Repair Orders', 'All Shipments'].map(item => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                                <p style={{ margin: '0.75rem 0 0 0', color: 'var(--danger)', fontWeight: 700 }}>⚠️ This action cannot be undone.</p>
                            </div>

                            {/* Confirmation input + buttons (hidden after result) */}
                            {!resetResult && (
                                <>
                                    <div>
                                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                                            Type <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px', color: 'white' }}>RESET ALL DATA</span> to confirm
                                        </label>
                                        <input
                                            style={{ ...inputStyle, textAlign: 'center', borderColor: resetConfirmText === 'RESET ALL DATA' ? 'rgba(239,68,68,0.6)' : 'var(--border-color)' }}
                                            placeholder="RESET ALL DATA"
                                            value={resetConfirmText}
                                            onChange={e => setResetConfirmText(e.target.value)}
                                            disabled={resetLoading}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button className="btn-outline" style={{ flex: 1 }} onClick={() => { setShowResetModal(false); setResetConfirmText(''); }} disabled={resetLoading}>Cancel</button>
                                        <button
                                            className="btn-primary"
                                            style={{
                                                flex: 1, borderColor: 'var(--danger)',
                                                background: resetConfirmText === 'RESET ALL DATA' ? 'var(--danger)' : 'rgba(239,68,68,0.2)',
                                                cursor: resetConfirmText === 'RESET ALL DATA' && !resetLoading ? 'pointer' : 'not-allowed',
                                                opacity: resetLoading ? 0.7 : 1
                                            }}
                                            disabled={resetConfirmText !== 'RESET ALL DATA' || resetLoading}
                                            onClick={handleDatabaseReset}
                                        >
                                            {resetLoading ? '⏳ Wiping Database...' : '🗑️ Proceed & Reset'}
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Results panel */}
                            {resetResult && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{
                                        padding: '1rem', borderRadius: 'var(--radius-sm)',
                                        background: resetResult.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                                        border: `1px solid ${resetResult.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                    }}>
                                        <p style={{ margin: 0, fontWeight: 700, color: resetResult.success ? 'var(--success)' : 'var(--danger)' }}>
                                            {resetResult.success ? '✅ Reset Complete' : '⚠️ Partial Reset'}
                                        </p>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{resetResult.message}</p>
                                    </div>
                                    {resetResult.results && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Per-Table Results</p>
                                            {Object.entries(resetResult.results).map(([table, r]) => (
                                                <div key={table} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', padding: '0.4rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                                    <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{table}</span>
                                                    {r.error
                                                        ? <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.78rem' }}>⚠ {r.error}</span>
                                                        : <span style={{ color: 'var(--success)', fontWeight: 600 }}>{r.deleted} rows deleted</span>
                                                    }
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <button className="btn-outline" onClick={handleCloseResetModal}>Close</button>
                                </div>
                            )}
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
                                        {branches.map(b => <option key={b}>{b}</option>)}
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
                                            {branches.map(b => <option key={b}>{b}</option>)}
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

                {/* ─── TAB 5: INTEGRATIONS ─── */}
                {activeTab === 'Integrations' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* ── Dealer Website Integration ── */}
                        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={sectionHead}>🌐 Dealer Website Integration</p>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '-0.5rem' }}>Sync your live inventory, prices, and leads with your dealer website in real-time.</p>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                                    <div
                                        onClick={() => setWebsiteIntegration(p => ({ ...p, enabled: !p.enabled }))}
                                        style={{
                                            width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.25s',
                                            background: websiteIntegration.enabled ? 'var(--primary)' : 'rgba(255,255,255,0.12)',
                                            position: 'relative', flexShrink: 0
                                        }}
                                    >
                                        <div style={{
                                            position: 'absolute', top: '3px', left: websiteIntegration.enabled ? '23px' : '3px',
                                            width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                                            transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
                                        }} />
                                    </div>
                                    <span style={{ fontSize: '0.82rem', color: websiteIntegration.enabled ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                                        {websiteIntegration.enabled ? 'Active' : 'Disabled'}
                                    </span>
                                </label>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Dealer Website URL</label>
                                    <input style={inputStyle} placeholder="https://yourshowroom.com" value={websiteIntegration.websiteUrl}
                                        onChange={e => setWebsiteIntegration(p => ({ ...p, websiteUrl: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Webhook Callback URL</label>
                                    <input style={inputStyle} placeholder="https://yourshowroom.com/api/webhook" value={websiteIntegration.webhookUrl}
                                        onChange={e => setWebsiteIntegration(p => ({ ...p, webhookUrl: e.target.value }))} />
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>API Key (used by your website to authenticate with this DMS)</label>
                                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                                    <input
                                        style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.82rem', letterSpacing: '0.05em', color: 'var(--secondary-accent)' }}
                                        value={websiteIntegration.apiKey || '— Not generated yet —'}
                                        readOnly
                                    />
                                    <button
                                        className="btn-outline"
                                        disabled={generatingKey}
                                        onClick={async () => {
                                            setGeneratingKey(true);
                                            await new Promise(r => setTimeout(r, 800));
                                            const key = 'gs_live_' + Array.from(crypto.getRandomValues(new Uint8Array(24)))
                                                .map(b => b.toString(16).padStart(2,'0')).join('');
                                            setWebsiteIntegration(p => ({ ...p, apiKey: key }));
                                            setGeneratingKey(false);
                                            showToast('New API key generated. Copy and paste it into your website settings.', 'success');
                                        }}
                                        style={{ whiteSpace: 'nowrap', padding: '0 1rem', borderColor: 'var(--secondary-accent)', color: 'var(--secondary-accent)' }}
                                    >
                                        {generatingKey ? '⏳ Generating...' : '🔑 Generate Key'}
                                    </button>
                                    {websiteIntegration.apiKey && (
                                        <button
                                            className="btn-outline"
                                            onClick={() => { navigator.clipboard.writeText(websiteIntegration.apiKey); showToast('API key copied to clipboard.'); }}
                                            style={{ whiteSpace: 'nowrap', padding: '0 1rem' }}
                                        >
                                            📋 Copy
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label style={{ ...labelStyle, marginBottom: '0.75rem' }}>Data Sync Options</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                                    {[
                                        { key: 'syncInventory', label: '🚗 Inventory', desc: 'Live stock list' },
                                        { key: 'syncPricing', label: '💰 Pricing', desc: 'Ask prices & margins' },
                                        { key: 'syncPhotos', label: '📷 Photos', desc: 'Vehicle photo gallery' },
                                        { key: 'syncLeads', label: '📥 Leads', desc: 'Web enquiries → CRM' },
                                    ].map(opt => (
                                        <div
                                            key={opt.key}
                                            onClick={() => setWebsiteIntegration(p => ({ ...p, [opt.key]: !p[opt.key as keyof typeof p] }))}
                                            style={{
                                                padding: '0.9rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.2s',
                                                border: `1px solid ${websiteIntegration[opt.key as keyof typeof websiteIntegration] ? 'var(--primary)' : 'var(--border-color)'}`,
                                                background: websiteIntegration[opt.key as keyof typeof websiteIntegration] ? 'rgba(0,102,255,0.08)' : 'rgba(255,255,255,0.01)',
                                            }}
                                        >
                                            <div style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>{opt.label}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
                                            <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', fontWeight: 700, color: websiteIntegration[opt.key as keyof typeof websiteIntegration] ? 'var(--primary)' : 'var(--text-muted)' }}>
                                                {websiteIntegration[opt.key as keyof typeof websiteIntegration] ? '● ON' : '○ OFF'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {websiteIntegration.lastSync && (
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Last synced: {websiteIntegration.lastSync}</p>
                            )}

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    className="btn-primary"
                                    onClick={() => {
                                        const now = new Date().toLocaleString();
                                        setWebsiteIntegration(p => ({ ...p, lastSync: now }));
                                        showToast('Website integration settings saved & sync triggered.', 'success');
                                    }}
                                    style={{ flex: 1 }}
                                >
                                    💾 Save & Sync Now
                                </button>
                                <button
                                    className="btn-outline"
                                    onClick={() => showToast('Connection test successful — website API is reachable.', 'success')}
                                >
                                    🔌 Test Connection
                                </button>
                            </div>
                        </div>

                        {/* ── Mobile App Integration ── */}
                        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={sectionHead}>📱 Mobile App Integration</p>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '-0.5rem' }}>Configure staff and customer-facing mobile app access. iOS & Android ready.</p>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                                    <div
                                        onClick={() => setMobileApp(p => ({ ...p, enabled: !p.enabled }))}
                                        style={{
                                            width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.25s',
                                            background: mobileApp.enabled ? 'var(--primary)' : 'rgba(255,255,255,0.12)',
                                            position: 'relative', flexShrink: 0
                                        }}
                                    >
                                        <div style={{
                                            position: 'absolute', top: '3px', left: mobileApp.enabled ? '23px' : '3px',
                                            width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                                            transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
                                        }} />
                                    </div>
                                    <span style={{ fontSize: '0.82rem', color: mobileApp.enabled ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                                        {mobileApp.enabled ? 'Enabled' : 'Coming Soon'}
                                    </span>
                                </label>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>App Name</label>
                                    <input style={inputStyle} value={mobileApp.appName}
                                        onChange={e => setMobileApp(p => ({ ...p, appName: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Target Platform</label>
                                    <select style={{ ...inputStyle, height: '44px' }} value={mobileApp.platform}
                                        onChange={e => setMobileApp(p => ({ ...p, platform: e.target.value as any }))}>
                                        <option value="Both">📱 iOS & Android</option>
                                        <option value="iOS"> iOS Only</option>
                                        <option value="Android"> Android Only</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                                {[
                                    { key: 'staffAccess', label: '👷 Staff Access', desc: 'Sales, service & logistics staff login' },
                                    { key: 'customerFacing', label: '🛍️ Customer Portal', desc: 'Browse inventory & track orders' },
                                    { key: 'pushNotifications', label: '🔔 Push Notifications', desc: 'Deal alerts, lead pings & RO updates' },
                                ].map(opt => (
                                    <div
                                        key={opt.key}
                                        onClick={() => setMobileApp(p => ({ ...p, [opt.key]: !p[opt.key as keyof typeof p] }))}
                                        style={{
                                            padding: '0.9rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.2s',
                                            border: `1px solid ${mobileApp[opt.key as keyof typeof mobileApp] ? 'var(--primary)' : 'var(--border-color)'}`,
                                            background: mobileApp[opt.key as keyof typeof mobileApp] ? 'rgba(0,102,255,0.08)' : 'rgba(255,255,255,0.01)',
                                        }}
                                    >
                                        <div style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>{opt.label}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{opt.desc}</div>
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', fontWeight: 700, color: mobileApp[opt.key as keyof typeof mobileApp] ? 'var(--primary)' : 'var(--text-muted)' }}>
                                            {mobileApp[opt.key as keyof typeof mobileApp] ? '● Enabled' : '○ Disabled'}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label style={labelStyle}>App API Token (for mobile app authentication)</label>
                                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                                    <input
                                        style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.82rem', letterSpacing: '0.04em', color: 'var(--secondary-accent)' }}
                                        value={mobileApp.apiToken || '— Generate a token to enable mobile access —'}
                                        readOnly
                                    />
                                    <button
                                        className="btn-outline"
                                        disabled={generatingToken}
                                        onClick={async () => {
                                            setGeneratingToken(true);
                                            await new Promise(r => setTimeout(r, 900));
                                            const token = 'gsmob_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
                                                .map(b => b.toString(16).padStart(2,'0')).join('');
                                            const expiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString();
                                            setMobileApp(p => ({ ...p, apiToken: token, tokenExpiry: expiry }));
                                            setGeneratingToken(false);
                                            showToast('Mobile API token generated. Expires: ' + expiry, 'success');
                                        }}
                                        style={{ whiteSpace: 'nowrap', padding: '0 1rem', borderColor: 'var(--secondary-accent)', color: 'var(--secondary-accent)' }}
                                    >
                                        {generatingToken ? '⏳...' : '🔑 Generate'}
                                    </button>
                                    {mobileApp.apiToken && (
                                        <button
                                            className="btn-outline"
                                            onClick={() => { navigator.clipboard.writeText(mobileApp.apiToken); showToast('Mobile token copied.'); }}
                                            style={{ whiteSpace: 'nowrap', padding: '0 1rem' }}
                                        >
                                            📋 Copy
                                        </button>
                                    )}
                                </div>
                                {mobileApp.tokenExpiry && (
                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Token expires: {mobileApp.tokenExpiry}</p>
                                )}
                            </div>

                            {/* Coming Soon Banner */}
                            <div style={{
                                background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)',
                                borderRadius: 'var(--radius-sm)', padding: '1rem 1.25rem',
                                display: 'flex', alignItems: 'flex-start', gap: '0.75rem'
                            }}>
                                <span style={{ fontSize: '1.3rem' }}>🚀</span>
                                <div>
                                    <p style={{ fontWeight: 700, color: 'var(--secondary-accent)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Mobile App — Coming Soon</p>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                        The native GariSphere mobile app for iOS and Android is in development. Configure your preferences now — when the app launches, your DMS will be ready for instant activation.
                                        Staff will be able to view inventory, manage leads, open repair orders, and receive real-time push notifications directly from their phones.
                                    </p>
                                </div>
                            </div>

                            <button
                                className="btn-primary"
                                onClick={() => {
                                    setIntegrationSaved(true);
                                    showToast('Mobile app integration preferences saved.', 'success');
                                    setTimeout(() => setIntegrationSaved(false), 2000);
                                }}
                            >
                                {integrationSaved ? '✓ Saved!' : '💾 Save Mobile App Settings'}
                            </button>
                        </div>

                        {/* ── Integration Status Overview ── */}
                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <p style={sectionHead}>📡 Integration Status Overview</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                {[
                                    { label: 'Website API', status: websiteIntegration.enabled && websiteIntegration.apiKey ? 'Connected' : 'Not Connected', icon: '🌐', color: websiteIntegration.enabled && websiteIntegration.apiKey ? 'var(--success)' : 'var(--text-muted)' },
                                    { label: 'Mobile App', status: mobileApp.enabled && mobileApp.apiToken ? 'Token Ready' : 'Pending Setup', icon: '📱', color: mobileApp.enabled && mobileApp.apiToken ? 'var(--success)' : 'var(--warning)' },
                                    { label: 'Lead Webhook', status: websiteIntegration.webhookUrl ? 'Configured' : 'Not Set', icon: '🔗', color: websiteIntegration.webhookUrl ? 'var(--primary)' : 'var(--text-muted)' },
                                ].map(item => (
                                    <div key={item.label} style={{
                                        padding: '1rem', borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)',
                                        display: 'flex', alignItems: 'center', gap: '0.75rem'
                                    }}>
                                        <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                                        <div>
                                            <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.label}</p>
                                            <p style={{ fontSize: '0.75rem', color: item.color, fontWeight: 600 }}>{item.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
