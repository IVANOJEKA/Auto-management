'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../../components/Sidebar';
import { useAuth } from '../../../context/AuthContext';
import { useCurrency } from '../../../context/CurrencyContext';
import { useRouter } from 'next/navigation';

export interface AuditLogItem {
    id: string;
    tenant_id: string;
    user_id: string;
    employee_name: string;
    employee_role: string;
    branch: string;
    action: string;
    category: string;
    entity_type: string;
    entity_id?: string;
    entity_name?: string;
    description: string;
    old_values?: Record<string, any> | null;
    new_values?: Record<string, any> | null;
    changed_fields?: string[];
    severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: 'SUCCESS' | 'FAILED' | 'BLOCKED';
    ip_address?: string;
    user_agent?: string;
    created_at: string;
}

export interface AuditSummary {
    totalCount: number;
    uniqueEmployees: number;
    financialCount: number;
    highRiskCount: number;
    blockedCount: number;
}

export default function AdminAuditTrailPage() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const { formatCurrency: fmt } = useCurrency();

    const [logs, setLogs] = useState<AuditLogItem[]>([]);
    const [summary, setSummary] = useState<AuditSummary>({
        totalCount: 0,
        uniqueEmployees: 0,
        financialCount: 0,
        highRiskCount: 0,
        blockedCount: 0,
    });
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

    // Filter states
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [severity, setSeverity] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [employeeFilter, setEmployeeFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Employee Daily Report Modal
    const [showDailyReport, setShowDailyReport] = useState(false);
    const [reportEmployee, setReportEmployee] = useState('');
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (!isLoading && (!isAuthenticated || user?.role !== 'Admin')) {
            router.push('/dashboard');
        }
    }, [isLoading, isAuthenticated, user, router]);

    const fetchLogs = async () => {
        setLoadingLogs(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('q', search);
            if (category) params.append('category', category);
            if (severity) params.append('severity', severity);
            if (statusFilter) params.append('status', statusFilter);
            if (branchFilter) params.append('branch', branchFilter);
            if (employeeFilter) params.append('employee', employeeFilter);
            if (fromDate) params.append('fromDate', fromDate);
            if (toDate) params.append('toDate', toDate);

            const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
                if (data.summary) {
                    setSummary(data.summary);
                }
            }
        } catch (err) {
            console.error('Failed to load audit logs:', err);
        } finally {
            setLoadingLogs(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated && user?.role === 'Admin') {
            fetchLogs();
        }
    }, [isAuthenticated, user, search, category, severity, statusFilter, branchFilter, employeeFilter, fromDate, toDate]);

    const exportAuditCSV = () => {
        if (logs.length === 0) return;
        const headers = ['Timestamp', 'Employee', 'Role', 'Branch', 'Action', 'Category', 'Target Entity', 'Severity', 'Status', 'Description', 'IP Address'];
        const rows = logs.map(l => [
            new Date(l.created_at).toLocaleString(),
            `"${l.employee_name}"`,
            `"${l.employee_role}"`,
            `"${l.branch}"`,
            `"${l.action}"`,
            `"${l.category}"`,
            `"${l.entity_name || l.entity_id || ''}"`,
            l.severity,
            l.status,
            `"${(l.description || '').replace(/"/g, '""')}"`,
            `"${l.ip_address || ''}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `garisphere_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getSeverityBadgeClass = (sev: string) => {
        switch (sev) {
            case 'CRITICAL': return 'badge-danger';
            case 'HIGH': return 'badge-danger';
            case 'MEDIUM': return 'badge-warning';
            default: return 'badge-info';
        }
    };

    const getStatusBadgeClass = (st: string) => {
        switch (st) {
            case 'SUCCESS': return 'badge-success';
            case 'BLOCKED': return 'badge-danger';
            default: return 'badge-warning';
        }
    };

    if (isLoading || !isAuthenticated || user?.role !== 'Admin') {
        return null;
    }

    // Filter logs for employee daily report
    const dailyReportLogs = logs.filter(l => {
        const matchesEmp = !reportEmployee || l.employee_name.toLowerCase().includes(reportEmployee.toLowerCase());
        const logDateStr = new Date(l.created_at).toISOString().split('T')[0];
        const matchesDate = !reportDate || logDateStr === reportDate;
        return matchesEmp && matchesDate;
    });

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>Employee Activity & Audit Trail</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                            Immutable server-side event tracking, accountability, and operational security history.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn-outline" onClick={() => setShowDailyReport(true)}>
                            Daily Employee Report
                        </button>
                        <button className="btn-primary" onClick={exportAuditCSV}>
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    <div className="card">
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Audit Events</p>
                        <h3 style={{ fontSize: '1.65rem', margin: '0.2rem 0', color: 'white' }}>{summary.totalCount}</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recorded activities</p>
                    </div>
                    <div className="card">
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Active Employees</p>
                        <h3 style={{ fontSize: '1.65rem', margin: '0.2rem 0', color: '#6366f1' }}>{summary.uniqueEmployees}</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Staff active in log</p>
                    </div>
                    <div className="card">
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Financial & Invoicing Events</p>
                        <h3 style={{ fontSize: '1.65rem', margin: '0.2rem 0', color: '#10b981' }}>{summary.financialCount}</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>High-value ledger updates</p>
                    </div>
                    <div className="card">
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>High-Risk & Security Events</p>
                        <h3 style={{ fontSize: '1.65rem', margin: '0.2rem 0', color: '#ef4444' }}>{summary.highRiskCount}</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Critical & High severity</p>
                    </div>
                </div>

                {/* Filter Panel */}
                <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Search Record / Action</label>
                            <input
                                type="text"
                                placeholder="Search VIN, customer, action..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Category</label>
                            <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
                                <option value="">All Categories</option>
                                <option value="AUTHENTICATION">Authentication</option>
                                <option value="USER_MANAGEMENT">User Management</option>
                                <option value="CRM">CRM & Customers</option>
                                <option value="VEHICLES">Vehicles & Inventory</option>
                                <option value="SALES">Sales Desk</option>
                                <option value="INVOICING">Invoicing</option>
                                <option value="PAYMENTS">Payments & Receipts</option>
                                <option value="INVENTORY">Stock & Spares</option>
                                <option value="WORKSHOP">Workshop & Service</option>
                                <option value="FINANCE">Finance & Ledger</option>
                                <option value="REPORTING">Reports & Exports</option>
                                <option value="SYSTEM">System Settings</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Severity</label>
                            <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={inputStyle}>
                                <option value="">All Severities</option>
                                <option value="INFO">INFO</option>
                                <option value="LOW">LOW</option>
                                <option value="MEDIUM">MEDIUM</option>
                                <option value="HIGH">HIGH</option>
                                <option value="CRITICAL">CRITICAL</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Status</label>
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
                                <option value="">All Statuses</option>
                                <option value="SUCCESS">SUCCESS</option>
                                <option value="FAILED">FAILED</option>
                                <option value="BLOCKED">BLOCKED</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>From Date</label>
                            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>To Date</label>
                            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
                        </div>
                    </div>
                </div>

                {/* Audit Activity Table */}
                <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left' }}>Timestamp</th>
                                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left' }}>Employee</th>
                                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left' }}>Branch</th>
                                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left' }}>Action & Category</th>
                                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left' }}>Target Record</th>
                                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Severity</th>
                                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Status</th>
                                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingLogs ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Loading audit history...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No audit records found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                                        <td style={{ padding: '0.85rem 1.25rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                                            {new Date(log.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' })}
                                        </td>
                                        <td style={{ padding: '0.85rem 1.25rem' }}>
                                            <div style={{ fontWeight: 600 }}>{log.employee_name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.employee_role}</div>
                                        </td>
                                        <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)' }}>{log.branch}</td>
                                        <td style={{ padding: '0.85rem 1.25rem' }}>
                                            <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{log.action}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{log.category}</div>
                                        </td>
                                        <td style={{ padding: '0.85rem 1.25rem' }}>
                                            <div style={{ fontWeight: 500 }}>{log.entity_name || log.entity_type}</div>
                                            {log.entity_id && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ID: {log.entity_id}</div>}
                                        </td>
                                        <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                                            <span className={`badge ${getSeverityBadgeClass(log.severity)}`}>
                                                {log.severity}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                                            <span className={`badge ${getStatusBadgeClass(log.status)}`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                                            <button
                                                className="btn-outline"
                                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                                                onClick={() => setSelectedLog(log)}
                                            >
                                                Inspect
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Audit Log Detail Drawer / Modal */}
            {selectedLog && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ width: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Audit Event Inspector</h3>
                            <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>ACTION</span>
                                <strong style={{ color: 'var(--primary)' }}>{selectedLog.action}</strong>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>CATEGORY</span>
                                <span>{selectedLog.category}</span>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>EMPLOYEE</span>
                                <strong>{selectedLog.employee_name} ({selectedLog.employee_role})</strong>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>BRANCH</span>
                                <span>{selectedLog.branch}</span>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>TIMESTAMP</span>
                                <span>{new Date(selectedLog.created_at).toLocaleString()}</span>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>IP ADDRESS / AGENT</span>
                                <span>{selectedLog.ip_address || '127.0.0.1'}</span>
                            </div>
                        </div>

                        <div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>DESCRIPTION</span>
                            <div style={{ padding: '0.75rem', background: 'rgba(15,23,42,0.6)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                                {selectedLog.description}
                            </div>
                        </div>

                        {/* Diff Viewer for Updates */}
                        {(selectedLog.old_values || selectedLog.new_values) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>State Transition & Values Comparison</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.75rem', borderRadius: '6px' }}>
                                        <h5 style={{ margin: '0 0 0.5rem 0', color: '#ef4444', fontSize: '0.78rem', textTransform: 'uppercase' }}>Before (Old Values)</h5>
                                        <pre style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', margin: 0, wordBreak: 'break-all' }}>
                                            {selectedLog.old_values ? JSON.stringify(selectedLog.old_values, null, 2) : 'N/A'}
                                        </pre>
                                    </div>
                                    <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '0.75rem', borderRadius: '6px' }}>
                                        <h5 style={{ margin: '0 0 0.5rem 0', color: '#10b981', fontSize: '0.78rem', textTransform: 'uppercase' }}>After (New Values)</h5>
                                        <pre style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', margin: 0, wordBreak: 'break-all' }}>
                                            {selectedLog.new_values ? JSON.stringify(selectedLog.new_values, null, 2) : 'N/A'}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button className="btn-outline" onClick={() => setSelectedLog(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Daily Employee Activity Report Modal */}
            {showDailyReport && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Daily Employee Activity Report</h3>
                            <button onClick={() => setShowDailyReport(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Employee Name</label>
                                <input type="text" placeholder="Type employee name..." value={reportEmployee} onChange={(e) => setReportEmployee(e.target.value)} style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Date</label>
                                <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} style={inputStyle} />
                            </div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Report Summary for {reportDate}</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                                <div>Total Logged Activities: <strong>{dailyReportLogs.length}</strong></div>
                                <div>High-Risk Actions: <strong style={{ color: '#ef4444' }}>{dailyReportLogs.filter(l => l.severity === 'HIGH' || l.severity === 'CRITICAL').length}</strong></div>
                            </div>
                        </div>

                        <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {dailyReportLogs.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No activity logged for this selection.</p>
                            ) : (
                                dailyReportLogs.map((l, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                                        <span>{new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — <strong>{l.action}</strong> ({l.entity_name || l.entity_type})</span>
                                        <span style={{ color: 'var(--text-muted)' }}>{l.employee_name}</span>
                                    </div>
                                ))
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button className="btn-outline" onClick={() => setShowDailyReport(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid var(--border-color)',
    padding: '0.6rem 0.8rem',
    borderRadius: '6px',
    color: 'white',
    outline: 'none',
    fontSize: '0.85rem',
    boxSizing: 'border-box'
};
