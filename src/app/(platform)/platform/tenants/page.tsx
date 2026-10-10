'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PlatformNav from '../../../../components/PlatformNav';

interface TenantData {
    id: string;
    name: string;
    subdomain: string;
    plan: string;
    status: string;
    created_at: string;
    userCount: number;
    vehicleCount: number;
    dealCount: number;
}

const PLAN_COLORS: Record<string, string> = {
    enterprise: '#f59e0b',
    professional: '#6366f1',
    starter: '#10b981',
    free: '#64748b',
};

export default function PlatformTenantsPage() {
    const router = useRouter();
    const [stats, setStats] = useState<any | null>(null);
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const [search, setSearch] = useState('');
    const [copied, setCopied] = useState(false);

    // Provisioning workspace states
    const [showProvision, setShowProvision] = useState(false);
    const [newTenant, setNewTenant] = useState({ name: '', subdomain: '', plan: 'starter', owner_email: '', owner_password: '', owner_password_confirm: '' });
    const [showProvisionPassword, setShowProvisionPassword] = useState(false);
    const [provisioning, setProvisioning] = useState(false);
    const [provisionError, setProvisionError] = useState<string | null>(null);
    const [provisionSuccess, setProvisionSuccess] = useState<string | null>(null);
    const [provisionMagicLink, setProvisionMagicLink] = useState<string | null>(null);
    const [copiedMagicLink, setCopiedMagicLink] = useState(false);

    // Editing workspace states
    const [editingTenant, setEditingTenant] = useState<any | null>(null);
    const [updating, setUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [modalTab, setModalTab] = useState<'general' | 'modules' | 'billing' | 'staff' | 'branches'>('general');

    // Branch management state (platform admin editing a tenant's branches)
    const [newPlatformBranch, setNewPlatformBranch] = useState('');
    const [savingBranches, setSavingBranches] = useState(false);
    const [branchSaveMsg, setBranchSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [renamingPlatformBranch, setRenamingPlatformBranch] = useState<string | null>(null);
    const [platformRenameValue, setPlatformRenameValue] = useState('');

    // Staff management states
    const [tenantUsers, setTenantUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [resetUser, setResetUser] = useState<any | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [resettingPassword, setResettingPassword] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const [resetSuccess, setResetSuccess] = useState<string | null>(null);
    // Repair / provision auth account states
    const [repairEmail, setRepairEmail] = useState('');
    const [repairPw, setRepairPw] = useState('');
    const [repairLoading, setRepairLoading] = useState(false);
    const [repairResult, setRepairResult] = useState<{ ok: boolean; msg: string; link?: string } | null>(null);

    // Billing history entry state
    const [newInvoice, setNewInvoice] = useState({ date: new Date().toISOString().split('T')[0], amount: '$49', status: 'Paid' });

    // Fetch tenant users when modal is opened
    useEffect(() => {
        if (!editingTenant) {
            setTenantUsers([]);
            setResetUser(null);
            setModalTab('general');
            return;
        }

        async function fetchTenantUsers() {
            setLoadingUsers(true);
            try {
                const res = await fetch(`/api/platform/tenants/${editingTenant.id}/users`);
                if (res.ok) {
                    const data = await res.json();
                    setTenantUsers(data || []);
                }
            } catch (err) {
            } finally {
                setLoadingUsers(false);
            }
        }

        fetchTenantUsers();
    }, [editingTenant]);

    // Deleting workspace states
    const [deletingTenant, setDeletingTenant] = useState<any | null>(null);
    const [confirmDeleteText, setConfirmDeleteText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const logout = useCallback(async () => {
        await fetch('/api/platform/auth', { method: 'DELETE' });
        router.push('/platform/login');
    }, [router]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const statsRes = await fetch('/api/platform/stats');
            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(data);
                setTenants(data.tenants || []);
            }
        } catch (err) {
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        async function init() {
            const authRes = await fetch('/api/platform/auth');
            const authData = await authRes.json();
            if (!authData.authenticated) { router.push('/platform/login'); return; }
            setAuthChecked(true);
            await loadData();
        }
        init();
    }, [router, loadData]);

    const handleCopySQL = () => {
        if (stats?.sql) {
            navigator.clipboard.writeText(stats.sql);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleProvision = async (e: React.FormEvent) => {
        e.preventDefault();
        setProvisionError(null);
        setProvisionSuccess(null);

        // Validate passwords match if provided
        if (newTenant.owner_password && newTenant.owner_password !== newTenant.owner_password_confirm) {
            setProvisionError('Passwords do not match.');
            return;
        }
        if (newTenant.owner_password && newTenant.owner_password.length < 6) {
            setProvisionError('Password must be at least 6 characters.');
            return;
        }

        setProvisioning(true);
        try {
            const res = await fetch('/api/tenants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newTenant.name,
                    subdomain: newTenant.subdomain.toLowerCase().replace(/\s+/g, '-'),
                    plan: newTenant.plan,
                    owner_email: newTenant.owner_email || undefined,
                    owner_password: newTenant.owner_password || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setProvisionError(data.error || 'Failed to provision workspace');
            } else {
                const successMsg = `✅ Workspace "${newTenant.name}" provisioned successfully!${
                    newTenant.owner_email && newTenant.owner_password
                        ? ` Admin account created for ${newTenant.owner_email}.`
                        : newTenant.owner_email
                        ? ` An invite email has been sent to ${newTenant.owner_email}.`
                        : ''
                }`;
                setProvisionSuccess(data.authWarning ? `${successMsg}\n⚠️ Note: ${data.authWarning}` : successMsg);
                setProvisionMagicLink(data.magicLink || null);
                setNewTenant({ name: '', subdomain: '', plan: 'starter', owner_email: '', owner_password: '', owner_password_confirm: '' });
                await loadData();
            }
        } catch {
            setProvisionError('Network error — try again');
        } finally {
            setProvisioning(false);
        }
    };

    const handleUpdateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTenant) return;
        setUpdateError(null);
        setUpdating(true);
        try {
            const res = await fetch(`/api/tenants/${editingTenant.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editingTenant.name,
                    plan: editingTenant.plan,
                    status: editingTenant.status,
                    owner_email: editingTenant.owner_email,
                    modules: editingTenant.modules,
                    billing: editingTenant.billing
                })
            });
            const data = await res.json();
            if (!res.ok) {
                setUpdateError(data.error || 'Failed to update workspace');
            } else {
                setEditingTenant(null);
                await loadData();
            }
        } catch {
            setUpdateError('Network error — try again');
        } finally {
            setUpdating(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTenant || !resetUser || !newPassword) return;
        setResetError(null);
        setResetSuccess(null);
        setResettingPassword(true);
        try {
            const res = await fetch(`/api/platform/tenants/${editingTenant.id}/users`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: resetUser.id,
                    password: newPassword
                })
            });
            const data = await res.json();
            if (!res.ok) {
                setResetError(data.error || 'Failed to reset password');
            } else {
                setResetSuccess(`Password for ${resetUser.name} updated successfully!`);
                setNewPassword('');
                setTimeout(() => {
                    setResetUser(null);
                    setResetSuccess(null);
                }, 2000);
            }
        } catch {
            setResetError('Network error — try again');
        } finally {
            setResettingPassword(false);
        }
    };

    const handleToggleStatus = async (tenant: any) => {
        const nextStatus = tenant.status === 'active' ? 'suspended' : 'active';
        try {
            const res = await fetch(`/api/tenants/${tenant.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus })
            });
            if (res.ok) {
                await loadData();
            } else {
                const data = await res.json();
                alert(`Error: ${data.error || 'Failed to toggle workspace status'}`);
            }
        } catch {
            alert('Network error - please check connection.');
        }
    };

    const handleDeleteTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deletingTenant) return;
        if (confirmDeleteText !== deletingTenant.subdomain) {
            setDeleteError('Confirmation subdomain text does not match!');
            return;
        }

        setDeleteError(null);
        setDeleting(true);
        try {
            const res = await fetch(`/api/tenants/${deletingTenant.id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!res.ok) {
                setDeleteError(data.error || 'Failed to delete workspace');
            } else {
                setDeletingTenant(null);
                setConfirmDeleteText('');
                await loadData();
            }
        } catch {
            setDeleteError('Network error — try again');
        } finally {
            setDeleting(false);
        }
    };

    const filtered = tenants.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.subdomain.toLowerCase().includes(search.toLowerCase()) ||
        (t.owner_email && t.owner_email.toLowerCase().includes(search.toLowerCase()))
    );

    const inputStyle: React.CSSProperties = {
        width: '100%', background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(99,102,241,0.25)', borderRadius: '9px',
        padding: '0.75rem 1rem', color: 'white', fontSize: '0.88rem',
        outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
    };

    const selectStyle: React.CSSProperties = {
        ...inputStyle,
        color: 'white',
        background: '#0d0d2b',
        cursor: 'pointer'
    };

    if (!authChecked) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)' }}>Verifying session...</p>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh' }}>
            <PlatformNav onLogout={logout} />
            <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 2rem 4rem' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.3rem', letterSpacing: '-0.03em' }}>Tenant Workspaces</h1>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                            {stats?.migrationRequired ? 'Database schema configuration required' : `${tenants.length} workspace${tenants.length !== 1 ? 's' : ''} registered on the platform`}
                        </p>
                    </div>
                    {!stats?.migrationRequired && (
                        <button
                            onClick={() => { setShowProvision(true); setProvisionError(null); setProvisionSuccess(null); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                border: 'none', borderRadius: '10px', padding: '0.7rem 1.25rem',
                                color: 'white', fontSize: '0.85rem', fontWeight: 700,
                                cursor: 'pointer', boxShadow: '0 0 20px rgba(99,102,241,0.35)',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 30px rgba(99,102,241,0.55)'}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(99,102,241,0.35)'}
                        >
                            ＋ Provision Workspace
                        </button>
                    )}
                </div>

                {/* Migration Block */}
                {stats?.migrationRequired ? (
                    <div style={{
                        background: 'rgba(245,158,11,0.04)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        borderRadius: '20px',
                        padding: '2rem',
                        marginBottom: '3rem',
                        boxShadow: '0 10px 40px rgba(245,158,11,0.05)'
                    }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <span style={{ fontSize: '2rem' }}>⚠️</span>
                            <div>
                                <h3 style={{ margin: '0 0 0.5rem', color: '#f59e0b', fontSize: '1.15rem', fontWeight: 800 }}>Database Migration Required</h3>
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                                    To load or manage tenant workspaces, your Supabase database must be upgraded with the multi-tenant schema.
                                    Copy and run the SQL query below inside your <strong>Supabase SQL Editor</strong>.
                                </p>
                            </div>
                        </div>

                        <div style={{ position: 'relative', background: '#020617', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>migration.sql</span>
                                <button 
                                    onClick={handleCopySQL}
                                    style={{
                                        background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)',
                                        border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                        color: copied ? '#34d399' : 'white',
                                        padding: '0.35rem 0.85rem',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    {copied ? 'Copied! ✓' : '📋 Copy SQL Script'}
                                </button>
                            </div>
                            <pre style={{
                                margin: 0,
                                padding: '1.25rem',
                                overflowX: 'auto',
                                maxHeight: '320px',
                                fontSize: '0.8rem',
                                fontFamily: 'monospace',
                                color: '#a5b4fc',
                                lineHeight: 1.5,
                                background: 'transparent'
                            }}>
                                {stats?.sql}
                            </pre>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <button 
                                onClick={loadData}
                                disabled={loading}
                                style={{
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(245,158,11,0.2)',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {loading ? 'Checking Database...' : '🔄 Verify Migration Success'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Search and Filters */}
                        <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: '380px' }}>
                            <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)' }}>🔍</span>
                            <input
                                type="text"
                                placeholder="Search by name, subdomain, or owner..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{ ...inputStyle, paddingLeft: '2.4rem' }}
                            />
                        </div>

                        {/* Table */}
                        <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '16px', overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
                                            {['Workspace', 'Subdomain / URL', 'Plan', 'Owner Email', 'Users', 'Vehicles', 'Deals', 'Status', 'Actions'].map(h => (
                                                <th key={h} style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            [...Array(5)].map((_, i) => (
                                                <tr key={i}>
                                                    {[...Array(9)].map((_, j) => (
                                                        <td key={j} style={{ padding: '1rem 1.25rem' }}>
                                                            <div style={{ height: '13px', background: 'rgba(99,102,241,0.08)', borderRadius: '5px', animation: 'pulse 1.5s infinite' }} />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : filtered.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.88rem' }}>
                                                    {search ? `No workspaces matching "${search}"` : 'No workspaces yet'}
                                                </td>
                                            </tr>
                                        ) : filtered.map((t, idx) => {
                                            const planColor = PLAN_COLORS[t.plan] || '#64748b';
                                            return (
                                                <tr key={t.id}
                                                    style={{ borderBottom: idx < filtered.length - 1 ? '1px solid rgba(99,102,241,0.06)' : 'none', transition: 'background 0.15s', cursor: 'default' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.05)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <td style={{ padding: '0.9rem 1.25rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                                                                {t.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t.name}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.9rem 1.25rem' }}>
                                                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#a5b4fc', background: 'rgba(99,102,241,0.1)', padding: '0.2rem 0.5rem', borderRadius: '5px' }}>
                                                            {t.subdomain}.garisphere.com
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.9rem 1.25rem' }}>
                                                        <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'capitalize', color: planColor, background: `${planColor}18`, border: `1px solid ${planColor}30`, padding: '0.2rem 0.55rem', borderRadius: '5px' }}>{t.plan || 'starter'}</span>
                                                    </td>
                                                    <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>
                                                        {t.owner_email || '—'}
                                                    </td>
                                                    <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>{t.userCount}</td>
                                                    <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>{t.vehicleCount}</td>
                                                    <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>{t.dealCount}</td>
                                                    <td style={{ padding: '0.9rem 1.25rem' }}>
                                                        <span style={{
                                                            fontSize: '0.68rem', fontWeight: 700, textTransform: 'capitalize',
                                                            background: t.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
                                                            color: t.status === 'active' ? '#34d399' : '#fca5a5',
                                                            border: `1px solid ${t.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)'}`,
                                                            padding: '0.2rem 0.55rem', borderRadius: '5px',
                                                        }}>{t.status || 'active'}</span>
                                                    </td>
                                                    <td style={{ padding: '0.9rem 1.25rem' }}>
                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                            <a
                                                                href={`https://${t.subdomain}.garisphere.com`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                style={{ fontSize: '0.72rem', color: '#a5b4fc', fontWeight: 600, textDecoration: 'none', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '5px', padding: '0.25rem 0.6rem', whiteSpace: 'nowrap' }}
                                                            >
                                                                Open ↗
                                                            </a>
                                                            <button
                                                                onClick={() => setEditingTenant(t)}
                                                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '5px', padding: '0.25rem 0.5rem', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                                                            >
                                                                ✏️ Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleStatus(t)}
                                                                style={{
                                                                    background: t.status === 'active' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                                                                    border: t.status === 'active' ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(16,185,129,0.2)',
                                                                    color: t.status === 'active' ? '#f59e0b' : '#10b981',
                                                                    borderRadius: '5px', padding: '0.25rem 0.5rem', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600
                                                                }}
                                                            >
                                                                {t.status === 'active' ? '⏸ Suspend' : '▶ Activate'}
                                                            </button>
                                                            <button
                                                                onClick={() => { setDeletingTenant(t); setConfirmDeleteText(''); setDeleteError(null); }}
                                                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '5px', padding: '0.25rem 0.5rem', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                                                            >
                                                                🗑️ Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Provision Modal */}
            {showProvision && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 200, overflowY: 'auto', padding: '2rem 1rem' }}>
                    <div style={{ width: '100%', maxWidth: '480px', background: '#0d0d2b', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '20px', padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Provision Workspace</h2>
                                <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>Create a new isolated tenant environment</p>
                            </div>
                            <button onClick={() => setShowProvision(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                        </div>

                        {provisionSuccess ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '1rem', fontSize: '0.82rem', color: '#34d399', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                                    {provisionSuccess}
                                </div>

                                {/* Magic link — copy & share with owner */}
                                {provisionMagicLink && (
                                    <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '10px', padding: '1rem' }}>
                                        <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🔗 Owner Login / Set-Password Link</p>
                                        <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                                            Share this link with the owner — they click it to set their password and log in. Link expires in 24h.
                                        </p>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <input
                                                readOnly
                                                value={provisionMagicLink}
                                                style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', padding: '0.5rem 0.75rem', color: '#a5b4fc', fontSize: '0.7rem', fontFamily: 'monospace', outline: 'none', cursor: 'text' }}
                                                onFocus={e => e.target.select()}
                                            />
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(provisionMagicLink);
                                                    setCopiedMagicLink(true);
                                                    setTimeout(() => setCopiedMagicLink(false), 2500);
                                                }}
                                                style={{ background: copiedMagicLink ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)', border: `1px solid ${copiedMagicLink ? 'rgba(16,185,129,0.4)' : 'rgba(99,102,241,0.3)'}`, borderRadius: '6px', color: copiedMagicLink ? '#34d399' : '#a5b4fc', padding: '0.5rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
                                            >
                                                {copiedMagicLink ? '✓ Copied!' : '📋 Copy'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <button onClick={() => { setShowProvision(false); setProvisionSuccess(null); setProvisionMagicLink(null); }} style={{ width: '100%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '10px', padding: '0.85rem', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}>
                                    Done
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleProvision} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dealership Name</label>
                                    <input type="text" placeholder="e.g. Tesla Auto Group" value={newTenant.name} onChange={e => setNewTenant(p => ({ ...p, name: e.target.value }))} required style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subdomain</label>
                                    <div style={{ position: 'relative' }}>
                                        <input type="text" placeholder="e.g. tesla" value={newTenant.subdomain} onChange={e => setNewTenant(p => ({ ...p, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} required style={{ ...inputStyle, paddingRight: '8rem' }} />
                                        <span style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>.garisphere.com</span>
                                    </div>
                                    <p style={{ margin: '0.3rem 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Lowercase letters, numbers and hyphens only. Used as the workspace subdomain on the platform.</p>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Owner Email</label>
                                    <input type="email" placeholder="owner@dealership.com" value={newTenant.owner_email} onChange={e => setNewTenant(p => ({ ...p, owner_email: e.target.value }))} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Owner Password {newTenant.owner_email && <span style={{ color: '#a5b4fc', fontWeight: 400 }}>(sets login password)</span>}</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showProvisionPassword ? 'text' : 'password'}
                                            placeholder="Min 6 characters…"
                                            value={newTenant.owner_password}
                                            onChange={e => setNewTenant(p => ({ ...p, owner_password: e.target.value }))}
                                            style={{ ...inputStyle, paddingRight: '3rem' }}
                                        />
                                        <button type="button" onClick={() => setShowProvisionPassword(p => !p)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1rem', padding: 0 }}>
                                            {showProvisionPassword ? '🙈' : '👁'}
                                        </button>
                                    </div>
                                    {newTenant.owner_password && newTenant.owner_password.length < 6 && (
                                        <p style={{ margin: '0.3rem 0 0', fontSize: '0.7rem', color: '#fca5a5' }}>⚠ At least 6 characters required</p>
                                    )}
                                </div>
                                {newTenant.owner_password && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Confirm Password</label>
                                        <input
                                            type={showProvisionPassword ? 'text' : 'password'}
                                            placeholder="Re-enter password…"
                                            value={newTenant.owner_password_confirm}
                                            onChange={e => setNewTenant(p => ({ ...p, owner_password_confirm: e.target.value }))}
                                            style={{ ...inputStyle, borderColor: newTenant.owner_password_confirm && newTenant.owner_password !== newTenant.owner_password_confirm ? 'rgba(239,68,68,0.6)' : undefined }}
                                        />
                                        {newTenant.owner_password_confirm && newTenant.owner_password !== newTenant.owner_password_confirm && (
                                            <p style={{ margin: '0.3rem 0 0', fontSize: '0.7rem', color: '#fca5a5' }}>⚠ Passwords do not match</p>
                                        )}
                                    </div>
                                )}
                                {!newTenant.owner_password && newTenant.owner_email && (
                                    <p style={{ margin: '-0.5rem 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
                                        💡 Leave password blank to send a <strong style={{ color: '#a5b4fc' }}>password reset email</strong> to the owner instead.
                                    </p>
                                )}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subscription Plan</label>
                                    <select value={newTenant.plan} onChange={e => setNewTenant(p => ({ ...p, plan: e.target.value }))} style={selectStyle}>
                                        <option value="starter">Starter Plan</option>
                                        <option value="professional">Professional Plan</option>
                                        <option value="enterprise">Enterprise Plan</option>
                                    </select>
                                </div>

                                {newTenant.subdomain && (
                                    <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '8px', padding: '0.65rem 0.9rem', fontSize: '0.78rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Production URL: </span>
                                        <span style={{ color: '#a5b4fc', fontFamily: 'monospace' }}>https://{newTenant.subdomain}.garisphere.com</span>
                                    </div>
                                )}

                                {provisionError && (
                                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '0.65rem 0.9rem', fontSize: '0.8rem', color: '#fca5a5' }}>⚠️ {provisionError}</div>
                                )}
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    <button type="submit" disabled={provisioning || !newTenant.name || !newTenant.subdomain} style={{ flex: 1, background: provisioning ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '10px', padding: '0.85rem', color: 'white', fontWeight: 700, cursor: provisioning ? 'not-allowed' : 'pointer', fontSize: '0.88rem' }}>
                                        {provisioning ? '⏳ Provisioning...' : '🚀 Create Workspace'}
                                    </button>
                                    <button type="button" onClick={() => setShowProvision(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingTenant && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 200, overflowY: 'auto', padding: '2rem 1rem' }}>
                    <div style={{ width: '100%', maxWidth: '680px', background: '#0a0a20', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '24px', padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', marginBottom: '2rem' }}>
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Edit Workspace</h2>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>Modify tenant details for <span style={{ color: '#a5b4fc', fontFamily: 'monospace' }}>{editingTenant.subdomain}</span></p>
                            </div>
                            <button onClick={() => setEditingTenant(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                        </div>

                        {/* Modal Tabs */}
                        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem', marginBottom: '1.5rem', flexShrink: 0 }}>
                            {[
                                { id: 'general', label: 'ℹ️ General' },
                                { id: 'modules', label: '🧱 Modules' },
                                { id: 'billing', label: '💳 Billing' },
                                { id: 'staff', label: '👥 Staff' },
                                { id: 'branches', label: '🏪 Branches' }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setModalTab(t.id as any)}
                                    style={{
                                        background: modalTab === t.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                                        border: `1px solid ${modalTab === t.id ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
                                        color: modalTab === t.id ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Modal Body (Scrollable Content) */}
                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.25rem' }}>
                            <form onSubmit={handleUpdateTenant} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {/* General Tab */}
                                {modalTab === 'general' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dealership Name</label>
                                                <input type="text" value={editingTenant.name} onChange={e => setEditingTenant((p: any) => ({ ...p, name: e.target.value }))} required style={inputStyle} />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subdomain (Read-only)</label>
                                                <input type="text" value={`${editingTenant.subdomain}.garisphere.com`} disabled style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Owner Email</label>
                                            <input type="email" value={editingTenant.owner_email || ''} onChange={e => setEditingTenant((p: any) => ({ ...p, owner_email: e.target.value }))} style={inputStyle} />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subscription Plan</label>
                                                <select value={editingTenant.plan} onChange={e => setEditingTenant((p: any) => ({ ...p, plan: e.target.value }))} style={selectStyle}>
                                                    <option value="starter">Starter Plan</option>
                                                    <option value="professional">Professional Plan</option>
                                                    <option value="enterprise">Enterprise Plan</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</label>
                                                <select value={editingTenant.status} onChange={e => setEditingTenant((p: any) => ({ ...p, status: e.target.value }))} style={selectStyle}>
                                                    <option value="active">Active</option>
                                                    <option value="suspended">Suspended</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Modules Tab */}
                                {modalTab === 'modules' && (
                                    <div>
                                        <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                                            Enable or disable access to specific DMS feature sets for this workspace. Disabled modules will be hidden from sidebar menus and blocked via security page guards.
                                        </p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            {[
                                                { name: 'dashboard', label: '📈 Dashboard & KPIs' },
                                                { name: 'inventory', label: '🚗 Vehicle Inventory' },
                                                { name: 'logistics', label: '🚢 Import Logistics' },
                                                { name: 'crm', label: '👥 Lead CRM Manager' },
                                                { name: 'sales', label: '💰 Sales & Pipeline' },
                                                { name: 'appointments', label: '📅 Booking Appointments' },
                                                { name: 'quotes', label: '📝 Invoices & Quotes' },
                                                { name: 'suppliers', label: '🏢 Supplier Management' },
                                                { name: 'compliance', label: '⚖️ Compliance & URA' },
                                                { name: 'service', label: '🛠️ Service Workshop' },
                                                { name: 'parts', label: '📦 Parts Inventory' },
                                                { name: 'notifications', label: '🔔 Alerts & Notifications' },
                                                { name: 'finance', label: '💵 Ledger & Finance' },
                                                { name: 'reports', label: '📊 Business Reports' }
                                            ].map(mod => {
                                                const enabledModules = editingTenant.modules || [];
                                                const isEnabled = enabledModules.includes(mod.name);
                                                return (
                                                    <div
                                                        key={mod.name}
                                                        onClick={() => {
                                                            let nextMods = [...enabledModules];
                                                            if (isEnabled) {
                                                                nextMods = nextMods.filter((m: string) => m !== mod.name);
                                                            } else {
                                                                nextMods.push(mod.name);
                                                            }
                                                            setEditingTenant((p: any) => ({ ...p, modules: nextMods }));
                                                        }}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                            background: isEnabled ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
                                                            border: `1px solid ${isEnabled ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)'}`,
                                                            borderRadius: '10px', padding: '0.75rem 1rem', cursor: 'pointer',
                                                            transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isEnabled ? 'white' : 'rgba(255,255,255,0.5)' }}>{mod.label}</span>
                                                        {/* Custom Switch Visual */}
                                                        <div style={{
                                                            width: '38px', height: '20px', borderRadius: '10px',
                                                            background: isEnabled ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.1)',
                                                            position: 'relative', transition: 'background-color 0.2s'
                                                        }}>
                                                            <div style={{
                                                                width: '14px', height: '14px', borderRadius: '50%', background: 'white',
                                                                position: 'absolute', top: '3px', left: isEnabled ? '21px' : '3px',
                                                                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                                                            }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Billing Tab */}
                                {modalTab === 'billing' && (() => {
                                    const billing = editingTenant.billing || {
                                        billing_plan: editingTenant.plan || 'starter',
                                        billing_status: editingTenant.status || 'active',
                                        billing_cycle: 'monthly',
                                        billing_amount: '$49',
                                        next_bill_date: '2026-07-19',
                                        invoices: []
                                    };
                                    const invoices = billing.invoices || [];

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Cycle Billing</label>
                                                    <select
                                                        value={billing.billing_cycle || 'monthly'}
                                                        onChange={e => setEditingTenant((p: any) => ({ ...p, billing: { ...billing, billing_cycle: e.target.value } }))}
                                                        style={selectStyle}
                                                    >
                                                        <option value="monthly">Monthly Cycle</option>
                                                        <option value="annual">Annual Cycle</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Cycle Cost</label>
                                                    <input
                                                        type="text"
                                                        value={billing.billing_amount || ''}
                                                        onChange={e => setEditingTenant((p: any) => ({ ...p, billing: { ...billing, billing_amount: e.target.value } }))}
                                                        style={inputStyle}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Next Invoice Date</label>
                                                    <input
                                                        type="date"
                                                        value={billing.next_bill_date || ''}
                                                        onChange={e => setEditingTenant((p: any) => ({ ...p, billing: { ...billing, next_bill_date: e.target.value } }))}
                                                        style={inputStyle}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                                                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>Subscription Invoice Ledger</h4>
                                                
                                                {/* Invoices list */}
                                                <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '0.5rem', maxHeight: '180px', overflowY: 'auto', marginBottom: '1rem' }}>
                                                    {invoices.length === 0 ? (
                                                        <p style={{ margin: '1rem', textAlign: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>No billing invoices logged.</p>
                                                    ) : (
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                                                            <thead>
                                                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                                                                    <th style={{ padding: '0.4rem', textAlign: 'left' }}>Invoice ID</th>
                                                                    <th style={{ padding: '0.4rem', textAlign: 'left' }}>Date</th>
                                                                    <th style={{ padding: '0.4rem', textAlign: 'left' }}>Amount</th>
                                                                    <th style={{ padding: '0.4rem', textAlign: 'left' }}>Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {invoices.map((inv: any) => (
                                                                    <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                                        <td style={{ padding: '0.4rem', fontFamily: 'monospace', color: '#a5b4fc' }}>{inv.id}</td>
                                                                        <td style={{ padding: '0.4rem' }}>{inv.date}</td>
                                                                        <td style={{ padding: '0.4rem', fontWeight: 600 }}>{inv.amount}</td>
                                                                        <td style={{ padding: '0.4rem' }}>
                                                                            <span style={{
                                                                                fontSize: '0.68rem', padding: '0.1rem 0.35rem', borderRadius: '4px',
                                                                                background: inv.status === 'Paid' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                                                                color: inv.status === 'Paid' ? '#34d399' : '#f59e0b'
                                                                            }}>{inv.status}</span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>

                                                {/* Form to log invoice */}
                                                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.75rem', alignItems: 'flex-end' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.2rem' }}>Log Date</label>
                                                        <input type="date" value={newInvoice.date} onChange={e => setNewInvoice(prev => ({ ...prev, date: e.target.value }))} style={{ ...inputStyle, padding: '0.4rem 0.6rem', fontSize: '0.78rem' }} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.2rem' }}>Paid Amount</label>
                                                        <input type="text" value={newInvoice.amount} onChange={e => setNewInvoice(prev => ({ ...prev, amount: e.target.value }))} style={{ ...inputStyle, padding: '0.4rem 0.6rem', fontSize: '0.78rem' }} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.2rem' }}>Status</label>
                                                        <select value={newInvoice.status} onChange={e => setNewInvoice(prev => ({ ...prev, status: e.target.value }))} style={{ ...selectStyle, padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}>
                                                            <option value="Paid">Paid</option>
                                                            <option value="Pending">Pending</option>
                                                        </select>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const nextInvoices = [...invoices, { id: `inv-${Date.now().toString().slice(-6)}`, ...newInvoice }];
                                                            setEditingTenant((p: any) => ({ ...p, billing: { ...billing, invoices: nextInvoices } }));
                                                        }}
                                                        style={{
                                                            background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)',
                                                            borderRadius: '6px', color: 'white', padding: '0.45rem 0.85rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer'
                                                        }}
                                                    >
                                                        Add Entry
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Staff Tab */}
                                {modalTab === 'staff' && (
                                    <div>
                                        <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                                            Manage user accounts for this workspace. You can view user credentials, verify branch assignments, or override staff passwords.
                                        </p>

                                        {loadingUsers ? (
                                            <p style={{ textAlign: 'center', margin: '2rem 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>⏳ Loading users...</p>
                                        ) : tenantUsers.length === 0 ? (
                                            <div style={{ margin: '1rem 0', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '1.25rem' }}>
                                                <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: '#fca5a5', fontWeight: 600 }}>&#9888;&#65039; No login accounts found for this workspace.</p>
                                                <p style={{ margin: '0 0 1rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>This usually means user provisioning failed during workspace creation. Use the form below to create the owner&apos;s login account now.</p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                    <input
                                                        type="email"
                                                        placeholder={editingTenant?.owner_email || 'owner@email.com'}
                                                        value={repairEmail || editingTenant?.owner_email || ''}
                                                        onChange={e => setRepairEmail(e.target.value)}
                                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.82rem', outline: 'none' }}
                                                    />
                                                    <input
                                                        type="password"
                                                        placeholder="Set login password (min 6 chars)"
                                                        value={repairPw}
                                                        onChange={e => setRepairPw(e.target.value)}
                                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.82rem', outline: 'none' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        disabled={repairLoading || repairPw.length < 6}
                                                        onClick={async () => {
                                                            setRepairLoading(true); setRepairResult(null);
                                                            const email = repairEmail || editingTenant?.owner_email || '';
                                                            if (!email) { setRepairResult({ ok: false, msg: 'Please enter an email address.' }); setRepairLoading(false); return; }
                                                            try {
                                                                const res = await fetch(`/api/platform/tenants/${editingTenant.id}/users`, {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ email, password: repairPw }),
                                                                });
                                                                const data = await res.json();
                                                                if (res.ok) {
                                                                    setRepairResult({ ok: true, msg: data.message, link: data.magicLink });
                                                                    // Reload users list
                                                                    const usersRes = await fetch(`/api/platform/tenants/${editingTenant.id}/users`);
                                                                    if (usersRes.ok) setTenantUsers(await usersRes.json());
                                                                } else {
                                                                    setRepairResult({ ok: false, msg: data.error || 'Failed to provision account.' });
                                                                }
                                                            } catch { setRepairResult({ ok: false, msg: 'Network error — try again.' }); }
                                                            finally { setRepairLoading(false); }
                                                        }}
                                                        style={{ background: repairLoading || repairPw.length < 6 ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: '8px', padding: '0.6rem 1.25rem', color: 'white', fontWeight: 700, cursor: repairLoading || repairPw.length < 6 ? 'not-allowed' : 'pointer', fontSize: '0.82rem', alignSelf: 'flex-start' }}
                                                    >
                                                        {repairLoading ? '&#9203; Creating...' : '&#128295; Provision Owner Login'}
                                                    </button>
                                                    {repairResult && (
                                                        <div style={{ fontSize: '0.78rem', color: repairResult.ok ? '#34d399' : '#fca5a5', lineHeight: 1.5 }}>
                                                            {repairResult.ok ? '&#10003; ' : '&#9888; '}{repairResult.msg}
                                                            {repairResult.link && (
                                                                <div style={{ marginTop: '0.5rem' }}>
                                                                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Magic link: </span>
                                                                    <a href={repairResult.link} target="_blank" rel="noreferrer" style={{ color: '#a5b4fc', wordBreak: 'break-all' }}>{repairResult.link}</a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                                    <thead>
                                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                                                            <th style={{ padding: '0.6rem 0.85rem', textAlign: 'left' }}>User Name</th>
                                                            <th style={{ padding: '0.6rem 0.85rem', textAlign: 'left' }}>Email Address</th>
                                                            <th style={{ padding: '0.6rem 0.85rem', textAlign: 'left' }}>Role</th>
                                                            <th style={{ padding: '0.6rem 0.85rem', textAlign: 'left' }}>Branch</th>
                                                            <th style={{ padding: '0.6rem 0.85rem', textAlign: 'center' }}>Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {tenantUsers.map((u: any) => (
                                                            <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                                <td style={{ padding: '0.6rem 0.85rem', fontWeight: 600 }}>{u.name}</td>
                                                                <td style={{ padding: '0.6rem 0.85rem', color: 'rgba(255,255,255,0.6)' }}>{u.email || '—'}</td>
                                                                <td style={{ padding: '0.6rem 0.85rem' }}>
                                                                    <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: '#fff' }}>{u.role}</span>
                                                                </td>
                                                                <td style={{ padding: '0.6rem 0.85rem', color: 'rgba(255,255,255,0.5)' }}>{u.branch || '—'}</td>
                                                                <td style={{ padding: '0.6rem 0.85rem', textAlign: 'center' }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setResetUser(u);
                                                                            setNewPassword('');
                                                                            setResetError(null);
                                                                            setResetSuccess(null);
                                                                        }}
                                                                        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc', borderRadius: '5px', padding: '0.2rem 0.5rem', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                                                                    >
                                                                        🔑 Reset
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {/* Reset Password Overlay Popup Form */}
                                        {resetUser && (
                                            <div style={{ marginTop: '1rem', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '12px', padding: '1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                    <h5 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>Reset Password for {resetUser.name}</h5>
                                                    <button type="button" onClick={() => setResetUser(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>✕</button>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <input
                                                        type="password"
                                                        placeholder="Enter new password (min 6 chars)..."
                                                        value={newPassword}
                                                        onChange={e => setNewPassword(e.target.value)}
                                                        style={{ ...inputStyle, padding: '0.4rem 0.6rem', fontSize: '0.8rem', flex: 1 }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleResetPassword}
                                                        disabled={resettingPassword || newPassword.length < 6}
                                                        style={{
                                                            background: resettingPassword || newPassword.length < 6 ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                            border: 'none', borderRadius: '6px', color: 'white', padding: '0.5rem 1rem', fontSize: '0.78rem', fontWeight: 700,
                                                            cursor: resettingPassword || newPassword.length < 6 ? 'not-allowed' : 'pointer'
                                                        }}
                                                    >
                                                        {resettingPassword ? 'Updating...' : 'Update Password'}
                                                    </button>
                                                </div>
                                                {resetError && <div style={{ fontSize: '0.72rem', color: '#fca5a5', marginTop: '0.4rem' }}>⚠️ {resetError}</div>}
                                                {resetSuccess && <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '0.4rem' }}>✓ {resetSuccess}</div>}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Branches Tab */}
                                {modalTab === 'branches' && (() => {
                                    const tenantBranches: string[] = editingTenant.branches || ['Kampala Main', 'Jinja Showroom', 'Entebbe Hub'];

                                    const saveTenantBranches = async (updated: string[]) => {
                                        setSavingBranches(true);
                                        setBranchSaveMsg(null);
                                        setEditingTenant((p: any) => ({ ...p, branches: updated }));
                                        try {
                                            const res = await fetch(`/api/tenants/${editingTenant.id}`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ branches: updated })
                                            });
                                            if (res.ok) {
                                                setBranchSaveMsg({ ok: true, text: 'Branches saved successfully.' });
                                            } else {
                                                setBranchSaveMsg({ ok: false, text: 'Failed to save — changes kept locally.' });
                                            }
                                        } catch {
                                            setBranchSaveMsg({ ok: false, text: 'Network error — changes kept locally.' });
                                        } finally {
                                            setSavingBranches(false);
                                            setTimeout(() => setBranchSaveMsg(null), 3000);
                                        }
                                    };

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                            {/* Info banner */}
                                            <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                                                🏪 Manage the branch locations for <strong style={{ color: '#a5b4fc' }}>{editingTenant.name}</strong>. These branches appear in the dealer's sidebar, staff assignments, and all data filters.
                                            </div>

                                            {/* Add branch */}
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Add New Branch</label>
                                                <div style={{ display: 'flex', gap: '0.6rem' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Mombasa Hub, Nairobi Branch…"
                                                        value={newPlatformBranch}
                                                        onChange={e => setNewPlatformBranch(e.target.value)}
                                                        onKeyDown={async e => {
                                                            if (e.key === 'Enter' && newPlatformBranch.trim() && !tenantBranches.includes(newPlatformBranch.trim())) {
                                                                await saveTenantBranches([...tenantBranches, newPlatformBranch.trim()]);
                                                                setNewPlatformBranch('');
                                                            }
                                                        }}
                                                        style={{ ...inputStyle, flex: 1, padding: '0.55rem 0.85rem' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        disabled={!newPlatformBranch.trim() || tenantBranches.includes(newPlatformBranch.trim()) || savingBranches}
                                                        onClick={async () => {
                                                            if (!newPlatformBranch.trim() || tenantBranches.includes(newPlatformBranch.trim())) return;
                                                            await saveTenantBranches([...tenantBranches, newPlatformBranch.trim()]);
                                                            setNewPlatformBranch('');
                                                        }}
                                                        style={{
                                                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                            border: 'none', borderRadius: '8px', color: 'white',
                                                            padding: '0.55rem 1rem', fontSize: '0.8rem', fontWeight: 700,
                                                            cursor: 'pointer', whiteSpace: 'nowrap',
                                                            opacity: !newPlatformBranch.trim() || tenantBranches.includes(newPlatformBranch.trim()) ? 0.4 : 1
                                                        }}
                                                    >
                                                        + Add
                                                    </button>
                                                </div>
                                                {newPlatformBranch.trim() && tenantBranches.includes(newPlatformBranch.trim()) && (
                                                    <p style={{ fontSize: '0.72rem', color: '#fca5a5', marginTop: '0.3rem' }}>⚠ That branch name already exists.</p>
                                                )}
                                            </div>

                                            {/* Branch list */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Branches ({tenantBranches.length})</label>
                                                {tenantBranches.length === 0 && (
                                                    <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', margin: '1rem 0' }}>No branches yet. Add one above.</p>
                                                )}
                                                {tenantBranches.map((b: string, idx: number) => (
                                                    <div key={b} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '0.6rem 0.85rem' }}>
                                                        <span style={{ opacity: 0.6 }}>🏪</span>
                                                        {renamingPlatformBranch === b ? (
                                                            <>
                                                                <input
                                                                    autoFocus
                                                                    value={platformRenameValue}
                                                                    onChange={e => setPlatformRenameValue(e.target.value)}
                                                                    onKeyDown={async e => {
                                                                        if (e.key === 'Enter' && platformRenameValue.trim()) {
                                                                            await saveTenantBranches(tenantBranches.map((x: string) => x === b ? platformRenameValue.trim() : x));
                                                                            setRenamingPlatformBranch(null);
                                                                        }
                                                                        if (e.key === 'Escape') setRenamingPlatformBranch(null);
                                                                    }}
                                                                    style={{ ...inputStyle, flex: 1, padding: '0.3rem 0.6rem', fontSize: '0.82rem' }}
                                                                />
                                                                <button type="button" onClick={async () => { if (!platformRenameValue.trim()) return; await saveTenantBranches(tenantBranches.map((x: string) => x === b ? platformRenameValue.trim() : x)); setRenamingPlatformBranch(null); }} style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '6px', color: '#a5b4fc', padding: '0.3rem 0.7rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Save</button>
                                                                <button type="button" onClick={() => setRenamingPlatformBranch(null)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'rgba(255,255,255,0.5)', padding: '0.3rem 0.7rem', fontSize: '0.75rem', cursor: 'pointer' }}>Cancel</button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600 }}>{b}</span>
                                                                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.04)', padding: '0.15rem 0.45rem', borderRadius: '12px' }}>#{idx + 1}</span>
                                                                <button type="button" onClick={() => { setRenamingPlatformBranch(b); setPlatformRenameValue(b); }} style={{ background: 'none', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '6px', color: '#a5b4fc', padding: '0.25rem 0.6rem', fontSize: '0.72rem', cursor: 'pointer' }}>✏ Rename</button>
                                                                <button type="button" onClick={async () => { if (!confirm(`Remove "${b}" from ${editingTenant.name}?`)) return; await saveTenantBranches(tenantBranches.filter((x: string) => x !== b)); }} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px', color: '#f87171', padding: '0.25rem 0.6rem', fontSize: '0.72rem', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>🗑 Remove</button>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Save feedback */}
                                            {branchSaveMsg && (
                                                <div style={{ fontSize: '0.78rem', color: branchSaveMsg.ok ? '#34d399' : '#fca5a5', padding: '0.5rem 0.85rem', background: branchSaveMsg.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${branchSaveMsg.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '8px' }}>
                                                    {branchSaveMsg.ok ? '✓' : '⚠️'} {branchSaveMsg.text}
                                                </div>
                                            )}
                                            {savingBranches && <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>⏳ Saving changes...</p>}
                                        </div>
                                    );
                                })()}

                                {/* Overall Updates Submit Error */}
                                {updateError && (
                                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '0.65rem 0.9rem', fontSize: '0.8rem', color: '#fca5a5' }}>
                                        ⚠️ {updateError}
                                    </div>
                                )}

                                {/* Overall Modal Footer Actions */}
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem', flexShrink: 0 }}>
                                    <button type="submit" disabled={updating} style={{ flex: 1, background: updating ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '10px', padding: '0.85rem', color: 'white', fontWeight: 700, cursor: updating ? 'not-allowed' : 'pointer', fontSize: '0.88rem' }}>
                                        {updating ? 'Saving Workspace Changes...' : '💾 Save Workspace Settings'}
                                    </button>
                                    <button type="button" onClick={() => setEditingTenant(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}>
                                        Close & Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deletingTenant && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
                    <div style={{ width: '100%', maxWidth: '480px', background: '#0d0d2b', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '20px', padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f87171' }}>Wipe & Delete Workspace</h2>
                                <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>Action cannot be undone. All data in this workspace will be deleted.</p>
                            </div>
                            <button onClick={() => setDeletingTenant(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                        </div>

                        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                            ⚠️ This will permanently delete <strong>{deletingTenant.name}</strong> along with all:
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 1rem', marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#fca5a5', paddingLeft: '0.5rem' }}>
                                <div>• {deletingTenant.vehicleCount} Vehicles</div>
                                <div>• {deletingTenant.userCount} Users</div>
                                <div>• {deletingTenant.dealCount} Deals</div>
                                <div>• Settings & Invoices</div>
                            </div>
                        </div>

                        <form onSubmit={handleDeleteTenant} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Type <strong style={{ color: '#fca5a5', fontFamily: 'monospace' }}>{deletingTenant.subdomain}</strong> to confirm
                                </label>
                                <input
                                    type="text"
                                    placeholder="Type subdomain..."
                                    value={confirmDeleteText}
                                    onChange={e => setConfirmDeleteText(e.target.value)}
                                    required
                                    style={{
                                        ...inputStyle,
                                        borderColor: confirmDeleteText === deletingTenant.subdomain ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)'
                                    }}
                                />
                            </div>

                            {deleteError && (
                                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '0.65rem 0.9rem', fontSize: '0.8rem', color: '#fca5a5' }}>⚠️ {deleteError}</div>
                            )}

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button
                                    type="submit"
                                    disabled={deleting || confirmDeleteText !== deletingTenant.subdomain}
                                    style={{
                                        flex: 1,
                                        background: deleting || confirmDeleteText !== deletingTenant.subdomain ? 'rgba(239,68,68,0.2)' : '#ef4444',
                                        border: 'none', borderRadius: '10px', padding: '0.85rem', color: 'white', fontWeight: 700,
                                        cursor: deleting || confirmDeleteText !== deletingTenant.subdomain ? 'not-allowed' : 'pointer', fontSize: '0.88rem',
                                        boxShadow: deleting || confirmDeleteText !== deletingTenant.subdomain ? 'none' : '0 4px 15px rgba(239,68,68,0.2)'
                                    }}
                                >
                                    {deleting ? '💥 Deleting Workspace...' : '💥 Confirm Wipe & Delete'}
                                </button>
                                <button type="button" onClick={() => setDeletingTenant(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
