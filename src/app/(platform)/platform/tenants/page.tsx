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
    const [newTenant, setNewTenant] = useState({ name: '', subdomain: '', plan: 'starter', owner_email: '' });
    const [provisioning, setProvisioning] = useState(false);
    const [provisionError, setProvisionError] = useState<string | null>(null);
    const [provisionSuccess, setProvisionSuccess] = useState<string | null>(null);

    // Editing workspace states
    const [editingTenant, setEditingTenant] = useState<any | null>(null);
    const [updating, setUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);

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
            console.error(err);
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
        setProvisioning(true);
        try {
            const res = await fetch('/api/tenants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newTenant.name,
                    subdomain: newTenant.subdomain.toLowerCase().replace(/\s+/g, '-'),
                    plan: newTenant.plan,
                    owner_email: newTenant.owner_email || undefined
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setProvisionError(data.error || 'Failed to provision workspace');
            } else {
                setProvisionSuccess(`✅ Workspace "${newTenant.name}" provisioned successfully!`);
                setNewTenant({ name: '', subdomain: '', plan: 'starter', owner_email: '' });
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
                    owner_email: editingTenant.owner_email
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
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
                    <div style={{ width: '100%', maxWidth: '480px', background: '#0d0d2b', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '20px', padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Provision Workspace</h2>
                                <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>Create a new isolated tenant environment</p>
                            </div>
                            <button onClick={() => setShowProvision(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                        </div>

                        {provisionSuccess ? (
                            <div>
                                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#34d399', lineHeight: 1.5 }}>
                                    {provisionSuccess}
                                </div>
                                <button onClick={() => { setShowProvision(false); setProvisionSuccess(null); }} style={{ width: '100%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '10px', padding: '0.85rem', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}>
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
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
                    <div style={{ width: '100%', maxWidth: '480px', background: '#0d0d2b', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '20px', padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Edit Workspace</h2>
                                <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>Modify tenant details for <span style={{ color: '#a5b4fc', fontFamily: 'monospace' }}>{editingTenant.subdomain}</span></p>
                            </div>
                            <button onClick={() => setEditingTenant(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                        </div>

                        <form onSubmit={handleUpdateTenant} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dealership Name</label>
                                <input type="text" value={editingTenant.name} onChange={e => setEditingTenant((p: any) => ({ ...p, name: e.target.value }))} required style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Owner Email</label>
                                <input type="email" value={editingTenant.owner_email || ''} onChange={e => setEditingTenant((p: any) => ({ ...p, owner_email: e.target.value }))} style={inputStyle} />
                            </div>
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

                            {updateError && (
                                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '0.65rem 0.9rem', fontSize: '0.8rem', color: '#fca5a5' }}>⚠️ {updateError}</div>
                            )}

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button type="submit" disabled={updating} style={{ flex: 1, background: updating ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '10px', padding: '0.85rem', color: 'white', fontWeight: 700, cursor: updating ? 'not-allowed' : 'pointer', fontSize: '0.88rem' }}>
                                    {updating ? 'Saving...' : '💾 Save Changes'}
                                </button>
                                <button type="button" onClick={() => setEditingTenant(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}>
                                    Cancel
                                </button>
                            </div>
                        </form>
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
