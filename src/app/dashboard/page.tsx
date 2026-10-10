'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useCurrency } from '../../context/CurrencyContext';
import Sidebar from '../../components/Sidebar';
import MobileDashboard from '../../components/MobileDashboard';
import { LineChart, DonutChart } from '../../components/Charts';
import '../globals.css';

// ─── Clean Professional SVG Icons (Zero informal emojis) ───────────────────
function IconCart({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
    );
}

function IconMoney({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <circle cx="12" cy="12" r="3" />
            <path d="M6 12h.01M18 12h.01" />
        </svg>
    );
}

function IconInvoice({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
        </svg>
    );
}

function IconReturn({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m17 2 4 4-4 4" />
            <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
            <path d="m7 22-4-4 4-4" />
            <path d="M21 13v1a4 4 0 0 1-4 4H3" />
        </svg>
    );
}

function IconPurchase({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    );
}

function IconAlert({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

function IconFreight({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="15" height="13" rx="1" />
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
    );
}

function IconExpense({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    );
}

function IconCalendar({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="18" y2="10" />
        </svg>
    );
}

function IconChevronDown({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

function IconInfo({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    );
}

function IconPlus({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

function IconSearch({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

function IconWrench({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
    );
}

function IconBox({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
    );
}

function IconCar({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2" />
            <circle cx="7" cy="17" r="2" />
            <path d="M9 17h6" />
            <circle cx="17" cy="17" r="2" />
        </svg>
    );
}

type DateFilterType = 'today' | 'week' | '30days' | 'year' | 'all';

const DATE_OPTIONS: { key: DateFilterType; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: '30days', label: 'This Month (30 Days)' },
    { key: 'year', label: 'This Year' },
    { key: 'all', label: 'All Time' },
];

export default function DashboardPage() {
    const { user, isAuthenticated } = useAuth();
    const {
        vehicles,
        leads,
        deals,
        complianceRecords,
        invoices,
        repairOrders,
        shipments,
        selectedBranch,
        partsInventory,
        partsPurchaseOrders,
        partsSales,
        supplierTransactions,
        ledgerEntries
    } = useData();
    const { formatCurrency: fmt } = useCurrency();
    const router = useRouter();

    const [globalSearch, setGlobalSearch] = useState('');
    const [dateFilter, setDateFilter] = useState<DateFilterType>('30days');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showcaseTab, setShowcaseTab] = useState<'parts' | 'workshop' | 'vehicles'>('parts');

    useEffect(() => {
        if (!isAuthenticated) router.push('/login');
    }, [isAuthenticated, router]);

    // Intelligently select default tab based on tenant inventory presence
    useEffect(() => {
        if (partsInventory && partsInventory.length > 0) {
            setShowcaseTab('parts');
        } else if (repairOrders && repairOrders.length > 0) {
            setShowcaseTab('workshop');
        } else if (vehicles && vehicles.length > 0) {
            setShowcaseTab('vehicles');
        }
    }, [partsInventory?.length, repairOrders?.length, vehicles?.length]);

    if (!isAuthenticated || !user) {
        return <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;
    }

    // ─── Scoping & Filtering ──────────────────────────────────────────────────
    const bVehicles = vehicles.filter(v => selectedBranch === 'All' || v.branch === selectedBranch);
    const bDeals = deals.filter(d => selectedBranch === 'All' || d.branch === selectedBranch);
    const bInvoices = invoices.filter(i => selectedBranch === 'All' || i.branch === selectedBranch);
    const bROs = repairOrders.filter(r => selectedBranch === 'All' || r.branch === selectedBranch);
    const bShipments = shipments?.filter(s => selectedBranch === 'All' || s.branch === selectedBranch) || [];
    const bPartsSales = (partsSales || []).filter(s => selectedBranch === 'All' || s.branch === selectedBranch);

    const now = new Date();
    const formattedCurrentDate = now.toLocaleDateString('en-GB'); // DD/MM/YYYY

    const filterByDate = (dateStr?: string) => {
        if (!dateStr || dateFilter === 'all') return true;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return true;
        if (dateFilter === 'today') {
            return d.toDateString() === now.toDateString();
        }
        if (dateFilter === 'week') {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return d >= sevenDaysAgo;
        }
        if (dateFilter === '30days') {
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return d >= thirtyDaysAgo;
        }
        if (dateFilter === 'year') {
            return d.getFullYear() === now.getFullYear();
        }
        return true;
    };

    // ─── Universal 8 Summary Metrics (Vehicles + Parts POS + Workshop) ─────────
    const closedDeals = bDeals.filter(d => d.status === 'Closed');
    const filteredClosedDeals = closedDeals.filter(d => filterByDate(d.date));
    const filteredPaidInvoices = bInvoices.filter(i => i.status === 'Paid' && filterByDate(i.date));
    const filteredPartsSales = bPartsSales.filter(s => filterByDate(s.date));

    // 1. Total Sales (Universal: Deals + Parts POS Sales + Paid Service/General Invoices)
    const dealSalesSum = filteredClosedDeals.reduce((acc, d) => {
        const v = parseFloat((d.salePrice ?? '0').replace(/[^0-9.-]+/g, ''));
        return isNaN(v) ? acc : acc + v;
    }, 0);
    const partsSalesSum = filteredPartsSales.reduce((acc, s) => acc + (s.total || 0), 0);
    const paidInvoiceSum = filteredPaidInvoices.reduce((acc, i) => {
        const v = parseFloat((i.amount ?? '0').replace(/[^0-9.-]+/g, ''));
        return isNaN(v) ? acc : acc + v;
    }, 0);
    const totalSalesVolume = dealSalesSum + partsSalesSum + (paidInvoiceSum > (dealSalesSum + partsSalesSum) ? paidInvoiceSum - (dealSalesSum + partsSalesSum) : 0);

    // 2. Net Margin (Universal: Vehicle gross margin + Parts retail margin + Service profit)
    const dealMarginSum = filteredClosedDeals.reduce((acc, d) => {
        const v = parseFloat((d.margin ?? '0').replace(/[^0-9.-]+/g, ''));
        return isNaN(v) ? acc : acc + v;
    }, 0);
    const partsMarginSum = filteredPartsSales.reduce((acc, s) => {
        const saleMargin = (s.items || []).reduce((itemAcc, item) => itemAcc + ((item.unitPrice - (item.unitCost || 0)) * item.quantity), 0);
        return acc + (saleMargin > 0 ? saleMargin : (s.total * 0.25)); // 25% default markup if cost unset
    }, 0);
    const netMargin = dealMarginSum + partsMarginSum;

    // 3. Invoice Due (Receivables across all operations)
    const invoicesDueSum = bInvoices
        .filter(i => (i.status === 'Pending Finance' || i.status === 'Overdue') && filterByDate(i.date))
        .reduce((acc, i) => {
            const v = parseFloat((i.amount ?? '0').replace(/[^0-9.-]+/g, ''));
            return isNaN(v) ? acc : acc + v;
        }, 0);

    // 4. Returns & Credits (Trade-in allowances + customer sales returns)
    const tradeInCreditsSum = filteredClosedDeals.reduce((acc, d) => acc + (d.tradeIn?.value || 0), 0);

    // 5. Total Purchases / Stock (Spare parts catalog cost + vehicle inventory acquisitions)
    const totalPurchasesCost = bVehicles.reduce((acc, v) => {
        const c = parseFloat((v.cost ?? '0').replace(/[^0-9.-]+/g, ''));
        return isNaN(c) ? acc : acc + c;
    }, 0) + (partsInventory || []).reduce((acc, p) => acc + ((p.cost || 0) * (p.stockQuantity || 0)), 0);

    // 6. Purchase Due (Supplier restock payables & purchase orders)
    const purchaseDueSum = (partsPurchaseOrders || []).filter(p => p.status === 'Ordered' || p.status === 'Partially Received').reduce((acc, p) => acc + (p.totalCost || 0), 0) +
        (supplierTransactions || []).filter(t => (t.type === 'Vehicle Purchase' || t.type === 'Parts Restock') && t.status === 'Outstanding').reduce((acc, t) => acc + (t.amount || 0), 0);

    // 7. In-Transit Freight / Logistics (Stock consignments on the way)
    const inTransitFreightSum = bShipments.filter(s => s.status !== 'Delivered').reduce((acc, s) => {
        const c = parseFloat((s.cost ?? '0').replace(/[^0-9.-]+/g, ''));
        return isNaN(c) ? acc : acc + c;
    }, 0);

    // 8. Operating Expenses (Shop maintenance, ledger overhead, repair labor)
    const totalExpensesSum = (ledgerEntries || []).filter(e => e.type === 'Expense' && filterByDate(e.date)).reduce((acc, e) => acc + (e.amount || 0), 0) +
        bROs.filter(ro => filterByDate(ro.due)).reduce((acc, ro) => {
            const c = parseFloat((ro.cost ?? '0').replace(/[^0-9.-]+/g, ''));
            return isNaN(c) ? acc : acc + c;
        }, 0);

    // ─── Universal Monthly Revenue & Activity Trend ───────────────────────────
    const thisYear = now.getFullYear();
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Tracks completed commercial transactions per month (Deals + Parts Receipts + Completed ROs)
    const transactionsTrendData = monthLabels.map((label, i) => {
        const dealsCount = closedDeals.filter(d => {
            const dt = new Date(d.date);
            return dt.getMonth() === i && dt.getFullYear() === thisYear;
        }).length;
        const partsCount = (bPartsSales || []).filter(s => {
            const dt = new Date(s.date);
            return dt.getMonth() === i && dt.getFullYear() === thisYear;
        }).length;
        const roCount = bROs.filter(r => {
            const dt = new Date(r.due);
            return dt.getMonth() === i && dt.getFullYear() === thisYear && r.status === 'Completed';
        }).length;
        return { label, value: dealsCount + partsCount + roCount };
    });

    const leadTrafficData = monthLabels.map((label, i) => ({
        label,
        value: leads.filter(l => {
            const dt = new Date((l as any).created_at || (l as any).date || now);
            return dt.getMonth() === i && dt.getFullYear() === thisYear;
        }).length
    }));

    // ─── Resource Allocation Donut Data ───────────────────────────────────────
    const inStockVehicles = bVehicles.filter(v => v.status === 'In Stock').length;
    const activePartsSKUs = (partsInventory || []).filter(p => (p.stockQuantity || 0) > 0).length;
    const activeWorkshopBays = bROs.filter(r => r.status !== 'Completed').length;
    const lowStockPartsCount = (partsInventory || []).filter(p => (p.stockQuantity || 0) <= (p.reorderPoint || 3)).length;

    // ─── Operational Alerts Queue (Universal) ─────────────────────────────────
    const alerts: { title: string; unit: string; badge: string; icon: React.ReactNode; link: string }[] = [];

    // 1. Low stock spare parts alert
    (partsInventory || []).forEach(p => {
        if ((p.stockQuantity || 0) <= (p.reorderPoint || 3)) {
            alerts.push({
                title: 'Low Stock Restock Alert',
                unit: `${p.name} (${p.partNumber}): only ${p.stockQuantity} remaining`,
                badge: 'warning',
                icon: <IconBox />,
                link: '/parts'
            });
        }
    });

    // 2. Active Workshop Repair Orders
    bROs.forEach(ro => {
        if (ro.status === 'In Bay' || ro.status === 'Awaiting Parts') {
            alerts.push({
                title: `Service Bay: ${ro.status}`,
                unit: `${ro.ro} - ${ro.vehicle} (${ro.issue})`,
                badge: ro.status === 'Awaiting Parts' ? 'danger' : 'info',
                icon: <IconWrench />,
                link: '/service'
            });
        }
    });

    // 3. Overdue client invoices
    bInvoices.forEach(inv => {
        if (inv.status === 'Overdue') {
            const invDate = new Date(inv.date);
            const diffDays = Math.ceil((now.getTime() - invDate.getTime()) / (1000 * 3600 * 24));
            alerts.push({
                title: 'Overdue Client Invoice',
                unit: `${inv.client}: ${inv.amount} (${diffDays} days overdue)`,
                badge: 'danger',
                icon: <IconInvoice />,
                link: '/finance'
            });
        }
    });

    // 4. Inbound stock shipments
    bShipments.forEach(s => {
        if (s.status === 'At Sea' || s.status === 'Port Clearance') {
            const etaDate = new Date(s.eta);
            const diffDays = Math.ceil((etaDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
            if (diffDays >= 0 && diffDays <= 7) {
                alerts.push({
                    title: 'Inbound Freight Arrival',
                    unit: `${s.vehicle} arriving in ${diffDays} days (${s.eta})`,
                    badge: 'info',
                    icon: <IconFreight />,
                    link: '/logistics'
                });
            }
        }
    });

    // ─── Consolidated Unified Activity Feed ───────────────────────────────────
    interface UnifiedActivity {
        id: string;
        type: 'Vehicle Sale' | 'Parts POS' | 'Service Order';
        title: string;
        subtitle: string;
        amount: string;
        staff: string;
        status: string;
        statusType: 'success' | 'warning' | 'info';
    }

    const unifiedActivities: UnifiedActivity[] = [];

    // Add closed deals
    bDeals.forEach(d => {
        unifiedActivities.push({
            id: d.id,
            type: 'Vehicle Sale',
            title: d.client,
            subtitle: d.vehicle,
            amount: fmt(d.margin || d.salePrice),
            staff: d.agent || 'Sales Desk',
            status: d.status,
            statusType: d.status === 'Closed' ? 'success' : 'warning'
        });
    });

    // Add POS Parts Sales
    (bPartsSales || []).forEach(s => {
        const itemCount = (s.items || []).reduce((acc, i) => acc + i.quantity, 0);
        unifiedActivities.push({
            id: s.saleNumber || s.id,
            type: 'Parts POS',
            title: s.customerName || 'Walk-in Retail Customer',
            subtitle: `${itemCount} part item${itemCount !== 1 ? 's' : ''} sold via ${s.paymentMethod}`,
            amount: fmt(s.total),
            staff: s.createdBy || 'Cashier',
            status: 'Completed',
            statusType: 'success'
        });
    });

    // Add Repair Orders
    bROs.forEach(ro => {
        unifiedActivities.push({
            id: ro.ro,
            type: 'Service Order',
            title: `${ro.client} (${ro.vehicle})`,
            subtitle: ro.issue,
            amount: ro.cost ? fmt(ro.cost) : '—',
            staff: ro.technician || 'Workshop Lead',
            status: ro.status,
            statusType: ro.status === 'Completed' ? 'success' : ro.status === 'In Bay' ? 'info' : 'warning'
        });
    });

    const searchFilter = (itemStr: string) => !globalSearch || itemStr.toLowerCase().includes(globalSearch.toLowerCase());
    const activeDateOption = DATE_OPTIONS.find(o => o.key === dateFilter) || DATE_OPTIONS[2];

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />

            <main style={{ flex: 1, padding: '1.75rem 2.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
                {/* Mobile Responsive View */}
                <MobileDashboard />

                {/* Desktop Executive Neutral Workspace */}
                <div className="gs-desktop-dashboard">
                    {/* ─── Top Blue Corporate Hero Header ───────────────────────── */}
                    <div className="gs-dashboard-hero">
                        <div className="gs-hero-left">
                            <h1 className="gs-hero-title">
                                Welcome {user.name.split(' ')[0] || user.name},
                            </h1>
                            <p className="gs-hero-subtitle">
                                <span>{selectedBranch === 'All' ? 'All Branches' : selectedBranch}</span>
                                <span>•</span>
                                <span>Commercial POS, Workshop & Operations Overview</span>
                            </p>
                        </div>

                        <div className="gs-hero-right">
                            {/* Filter by date dropdown */}
                            <div className="gs-date-filter-wrap">
                                <button
                                    className="gs-date-filter-btn"
                                    onClick={() => setShowDatePicker(!showDatePicker)}
                                    type="button"
                                >
                                    <IconCalendar size={16} />
                                    <span>Filter by date: {activeDateOption.label}</span>
                                    <IconChevronDown size={14} />
                                </button>

                                {showDatePicker && (
                                    <div className="gs-date-dropdown">
                                        {DATE_OPTIONS.map(opt => (
                                            <button
                                                key={opt.key}
                                                type="button"
                                                className={`gs-date-dropdown-item ${dateFilter === opt.key ? 'active' : ''}`}
                                                onClick={() => {
                                                    setDateFilter(opt.key);
                                                    setShowDatePicker(false);
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Today's Date Chip */}
                            <div className="gs-hero-date-badge">
                                <IconCalendar size={15} />
                                <span>{formattedCurrentDate}</span>
                            </div>

                            {/* Quick Action Navigation */}
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button
                                    className="gs-hero-action-btn"
                                    onClick={() => router.push('/parts')}
                                    type="button"
                                    title="Open Parts Retail POS"
                                >
                                    <IconPlus size={15} />
                                    <span>Parts POS</span>
                                </button>
                                <button
                                    className="gs-hero-action-btn"
                                    onClick={() => router.push('/service')}
                                    type="button"
                                    title="Create Service Repair Order"
                                >
                                    <IconPlus size={15} />
                                    <span>Service RO</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ─── 8 Summary Metric Cards (Universal POS & Operations) ──── */}
                    <div className="gs-summary-grid">
                        {/* 1. Total Sales */}
                        <MetricSummaryCard
                            label="Total Sales"
                            value={totalSalesVolume === 0 ? '—' : fmt(totalSalesVolume)}
                            icon={<IconCart size={22} />}
                            iconBg="#e0f2fe"
                            iconColor="#0284c7"
                        />

                        {/* 2. Net Margin */}
                        <MetricSummaryCard
                            label="Net Margin"
                            value={netMargin === 0 ? '—' : fmt(netMargin)}
                            icon={<IconMoney size={22} />}
                            iconBg="#dcfce7"
                            iconColor="#16a34a"
                            hasInfo
                            infoText="Net commercial margin realized across sales, parts retail & services"
                        />

                        {/* 3. Invoices Due */}
                        <MetricSummaryCard
                            label="Invoice due"
                            value={invoicesDueSum === 0 ? '0.00' : fmt(invoicesDueSum)}
                            icon={<IconInvoice size={22} />}
                            iconBg="#fef3c7"
                            iconColor="#d97706"
                        />

                        {/* 4. Sales Returns / Credits */}
                        <MetricSummaryCard
                            label="Total Sell Return"
                            value={tradeInCreditsSum === 0 ? '0.00' : fmt(tradeInCreditsSum)}
                            icon={<IconReturn size={22} />}
                            iconBg="#ffedd5"
                            iconColor="#ea580c"
                            hasInfo
                            infoText="Trade-in vehicles and return credits applied against customer orders"
                        />

                        {/* 5. Total Purchases / Stock Cost */}
                        <MetricSummaryCard
                            label="Total purchase"
                            value={totalPurchasesCost === 0 ? '0.00' : fmt(totalPurchasesCost)}
                            icon={<IconPurchase size={22} />}
                            iconBg="#cffafe"
                            iconColor="#0891b2"
                        />

                        {/* 6. Purchase Due */}
                        <MetricSummaryCard
                            label="Purchase due"
                            value={purchaseDueSum === 0 ? '0.00' : fmt(purchaseDueSum)}
                            icon={<IconAlert size={22} />}
                            iconBg="#fef9c3"
                            iconColor="#ca8a04"
                        />

                        {/* 7. In-Transit Cargo */}
                        <MetricSummaryCard
                            label="Total Purchase Return"
                            value={inTransitFreightSum === 0 ? '0.00' : fmt(inTransitFreightSum)}
                            icon={<IconFreight size={22} />}
                            iconBg="#ffe4e6"
                            iconColor="#e11d48"
                        />

                        {/* 8. Expenses */}
                        <MetricSummaryCard
                            label="Expense"
                            value={totalExpensesSum === 0 ? '0.00' : fmt(totalExpensesSum)}
                            icon={<IconExpense size={22} />}
                            iconBg="#fee2e2"
                            iconColor="#dc2626"
                        />
                    </div>

                    {/* ─── Search & Quick Module Shortcuts Row ────────────────────── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', position: 'relative', width: '340px' }}>
                            <div style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                                <IconSearch size={16} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search by ID, Customer, Part No, Vehicle..."
                                value={globalSearch}
                                onChange={e => setGlobalSearch(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '10px',
                                    padding: '0.6rem 0.9rem 0.6rem 2.4rem',
                                    color: 'var(--text-main)',
                                    fontSize: '0.86rem',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => router.push('/parts')}
                                className="btn-outline"
                                style={{ fontSize: '0.82rem', padding: '0.5rem 0.85rem' }}
                                type="button"
                            >
                                Spare Parts POS ({(partsInventory || []).length})
                            </button>
                            <button
                                onClick={() => router.push('/service')}
                                className="btn-outline"
                                style={{ fontSize: '0.82rem', padding: '0.5rem 0.85rem' }}
                                type="button"
                            >
                                Service Bays ({activeWorkshopBays})
                            </button>
                            <button
                                onClick={() => router.push('/inventory')}
                                className="btn-outline"
                                style={{ fontSize: '0.82rem', padding: '0.5rem 0.85rem' }}
                                type="button"
                            >
                                Vehicles ({bVehicles.length})
                            </button>
                        </div>
                    </div>

                    {/* ─── Performance Chart & Resource Allocation Donut ─────────── */}
                    <div className="grid-2col-2-1" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                        {/* Universal Activity & Revenue Trend */}
                        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '12px',
                                        background: '#e0f2fe',
                                        color: '#0284c7',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <IconCart size={20} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 800 }}>
                                            Commercial Activity (Last 30 Days)
                                        </h3>
                                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                                            Transactions completed across Parts POS, Service & Sales
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.76rem', fontWeight: 600 }}>
                                    <span style={{ color: '#0066ff' }}>● Transactions Completed</span>
                                    <span style={{ color: '#38bdf8' }}>● Inquiries & Quotes</span>
                                </div>
                            </div>

                            <LineChart
                                data={transactionsTrendData}
                                data2={leadTrafficData}
                                height={220}
                                color="#0066ff"
                                color2="#38bdf8"
                                formatValue={v => `${v} orders`}
                            />
                        </div>

                        {/* Inventory & Operational Resources Donut */}
                        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 800 }}>
                                    Operations Mix
                                </h3>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    Live Status
                                </span>
                            </div>

                            <DonutChart
                                segments={[
                                    { label: 'Active Parts SKUs', value: activePartsSKUs || 1, color: '#10b981' },
                                    { label: 'Active Service Bays', value: activeWorkshopBays || 1, color: '#f59e0b' },
                                    { label: 'Vehicles Yard Stock', value: inStockVehicles || 1, color: '#0066ff' },
                                    { label: 'In-Transit Freight', value: bShipments.length || 1, color: '#38bdf8' },
                                ]}
                                size={130}
                                label={`${activePartsSKUs + activeWorkshopBays + inStockVehicles}`}
                                sublabel="Active Assets"
                            />

                            <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto' }}>
                                <button
                                    className="btn-outline"
                                    style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}
                                    onClick={() => router.push('/parts')}
                                    type="button"
                                >
                                    Stock POS →
                                </button>
                                <button
                                    className="btn-outline"
                                    style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}
                                    onClick={() => router.push('/service')}
                                    type="button"
                                >
                                    Service Bays →
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ─── Operational Queue & Universal Showcase ───────────────── */}
                    <div className="grid-2col-1-2" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                        {/* Action Required Queue */}
                        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '440px', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                                <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 800 }}>
                                    Operational Queue
                                </h3>
                                <span className="badge badge-warning">{alerts.length}</span>
                            </div>

                            {alerts.length > 0 ? alerts.filter(a => searchFilter(`${a.title} ${a.unit}`)).slice(0, 10).map((item, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => router.push(item.link)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        justifyContent: 'space-between',
                                        paddingBottom: '0.75rem',
                                        borderBottom: '1px solid var(--border-color)',
                                        gap: '0.75rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                        <div style={{ color: item.badge === 'danger' ? 'var(--danger)' : item.badge === 'warning' ? 'var(--warning)' : 'var(--primary)', marginTop: '2px', flexShrink: 0 }}>
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h4 style={{ fontSize: '0.86rem', margin: '0 0 0.15rem 0', fontWeight: 700, color: 'var(--text-main)' }}>{item.title}</h4>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{item.unit}</p>
                                        </div>
                                    </div>
                                    <span className={`badge badge-${item.badge}`} style={{ flexShrink: 0, fontSize: '0.65rem' }}>
                                        {item.badge === 'danger' ? 'Urgent' : 'Action'}
                                    </span>
                                </div>
                            )) : (
                                <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>All operational queues clear.</p>
                                </div>
                            )}
                        </div>

                        {/* Universal Product & Service Showcase */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <button
                                        type="button"
                                        className={`gs-tab-pill ${showcaseTab === 'parts' ? 'active' : ''}`}
                                        onClick={() => setShowcaseTab('parts')}
                                    >
                                        <IconBox size={14} />
                                        <span>Spare Parts POS ({(partsInventory || []).length})</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`gs-tab-pill ${showcaseTab === 'workshop' ? 'active' : ''}`}
                                        onClick={() => setShowcaseTab('workshop')}
                                    >
                                        <IconWrench size={14} />
                                        <span>Workshop Jobs ({bROs.length})</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`gs-tab-pill ${showcaseTab === 'vehicles' ? 'active' : ''}`}
                                        onClick={() => setShowcaseTab('vehicles')}
                                    >
                                        <IconCar size={14} />
                                        <span>Vehicles ({bVehicles.length})</span>
                                    </button>
                                </div>

                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (showcaseTab === 'parts') router.push('/parts');
                                        else if (showcaseTab === 'workshop') router.push('/service');
                                        else router.push('/inventory');
                                    }}
                                    style={{ color: 'var(--primary)', fontSize: '0.84rem', fontWeight: 600 }}
                                >
                                    Manage All →
                                </a>
                            </div>

                            {/* TAB 1: SPARE PARTS CATALOG */}
                            {showcaseTab === 'parts' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.9rem' }}>
                                    {(partsInventory || [])
                                        .filter(p => searchFilter(`${p.name} ${p.partNumber} ${p.category} ${p.brand || ''}`))
                                        .slice(0, 4)
                                        .map(p => (
                                            <div key={p.id} className="gs-item-card">
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                            {p.category || 'Spare Part'} • {p.partNumber}
                                                        </span>
                                                        <h4 style={{ fontSize: '0.95rem', margin: '0.2rem 0 0.1rem 0', fontWeight: 700, color: 'var(--text-main)' }}>
                                                            {p.name}
                                                        </h4>
                                                        {p.brand && (
                                                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                                                                Brand: {p.brand}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className={`badge ${(p.stockQuantity || 0) <= (p.reorderPoint || 3) ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.65rem' }}>
                                                        {p.stockQuantity} in stock
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                                                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--secondary-accent)' }}>
                                                        {fmt(p.price)}
                                                    </span>
                                                    <button
                                                        onClick={() => router.push('/parts')}
                                                        className="btn-outline"
                                                        style={{ fontSize: '0.74rem', padding: '0.25rem 0.6rem' }}
                                                        type="button"
                                                    >
                                                        Sell in POS
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                    {(!partsInventory || partsInventory.length === 0) && (
                                        <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '2.5rem', background: 'var(--bg-card)', borderRadius: '12px' }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.5rem 0' }}>No spare parts registered yet.</p>
                                            <button className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }} onClick={() => router.push('/parts')}>
                                                + Add Spare Part to POS
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 2: WORKSHOP JOBS (e-RO) */}
                            {showcaseTab === 'workshop' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.9rem' }}>
                                    {bROs
                                        .filter(ro => searchFilter(`${ro.ro} ${ro.client} ${ro.vehicle} ${ro.issue}`))
                                        .slice(0, 4)
                                        .map(ro => (
                                            <div key={ro.ro} className="gs-item-card">
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--secondary-accent)', fontWeight: 700, fontFamily: 'monospace' }}>
                                                            {ro.ro}
                                                        </span>
                                                        <h4 style={{ fontSize: '0.92rem', margin: '0.2rem 0 0.1rem 0', fontWeight: 700, color: 'var(--text-main)' }}>
                                                            {ro.client} ({ro.vehicle})
                                                        </h4>
                                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                                                            Issue: {ro.issue}
                                                        </p>
                                                    </div>
                                                    <span className={`badge ${ro.status === 'Completed' ? 'badge-success' : ro.status === 'In Bay' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                                                        {ro.status}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        Tech: <strong style={{ color: 'var(--text-main)' }}>{ro.technician}</strong>
                                                    </span>
                                                    <button
                                                        onClick={() => router.push('/service')}
                                                        className="btn-outline"
                                                        style={{ fontSize: '0.74rem', padding: '0.25rem 0.6rem' }}
                                                        type="button"
                                                    >
                                                        Manage Bay
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                    {bROs.length === 0 && (
                                        <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '2.5rem', background: 'var(--bg-card)', borderRadius: '12px' }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.5rem 0' }}>No active workshop repair orders.</p>
                                            <button className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }} onClick={() => router.push('/service')}>
                                                + Open Repair Order
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 3: VEHICLES IN STOCK */}
                            {showcaseTab === 'vehicles' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.9rem' }}>
                                    {bVehicles
                                        .filter(car => searchFilter(`${car.make} ${car.model} ${car.vin}`))
                                        .slice(0, 4)
                                        .map(car => (
                                            <div key={car.id} className="gs-item-card">
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                                                            {car.year} {car.make}
                                                        </span>
                                                        <h4 style={{ fontSize: '0.95rem', margin: '0.2rem 0 0.1rem 0', fontWeight: 700, color: 'var(--text-main)' }}>
                                                            {car.model}
                                                        </h4>
                                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                            VIN: {car.vin}
                                                        </span>
                                                    </div>
                                                    <span className={`badge ${car.status === 'In Stock' ? 'badge-success' : 'badge-info'}`} style={{ fontSize: '0.65rem' }}>
                                                        {car.status}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                                                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--secondary-accent)' }}>
                                                        {fmt(car.price)}
                                                    </span>
                                                    <button
                                                        onClick={() => router.push('/inventory')}
                                                        className="btn-outline"
                                                        style={{ fontSize: '0.74rem', padding: '0.25rem 0.6rem' }}
                                                        type="button"
                                                    >
                                                        Details
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                    {bVehicles.length === 0 && (
                                        <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '2.5rem', background: 'var(--bg-card)', borderRadius: '12px' }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No vehicles registered in inventory.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ─── Consolidated Recent Transactions & Work Orders Table ──── */}
                    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 800 }}>Recent Commercial Transactions & Work Orders</h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>Combined operations across Parts POS, Service & Sales</p>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                        {['Reference ID', 'Type', 'Customer / Item', 'Amount / Margin', 'Staff / Tech', 'Status'].map(h => (
                                            <th key={h} style={{ padding: '0.75rem 1.5rem', fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {unifiedActivities.filter(a => searchFilter(`${a.id} ${a.title} ${a.subtitle} ${a.staff}`)).slice(0, 8).map((act, idx, arr) => (
                                        <tr key={act.id + idx} style={{ borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', color: 'var(--secondary-accent)', fontSize: '0.85rem', fontWeight: 600 }}>{act.id}</td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <span style={{
                                                    fontSize: '0.68rem',
                                                    fontWeight: 700,
                                                    padding: '0.2rem 0.55rem',
                                                    borderRadius: '6px',
                                                    background: act.type === 'Parts POS' ? 'rgba(16, 185, 129, 0.12)' : act.type === 'Service Order' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(0, 102, 255, 0.12)',
                                                    color: act.type === 'Parts POS' ? '#10b981' : act.type === 'Service Order' ? '#f59e0b' : '#0066ff'
                                                }}>
                                                    {act.type}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{act.title}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{act.subtitle}</div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', fontWeight: 700, color: 'var(--success)' }}>{act.amount}</td>
                                            <td style={{ padding: '1rem 1.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>{act.staff}</td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <span className={`badge badge-${act.statusType}`}>{act.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {unifiedActivities.length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No recent transactions recorded across parts, service, or vehicle sales.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// ─── Metric Summary Card (Matching Reference Screenshot) ───────────────────
function MetricSummaryCard({
    label,
    value,
    icon,
    iconBg,
    iconColor,
    hasInfo = false,
    infoText = ''
}: {
    label: string;
    value: string;
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    hasInfo?: boolean;
    infoText?: string;
}) {
    return (
        <div className="gs-metric-card">
            <div className="gs-metric-icon-wrap" style={{ background: iconBg, color: iconColor }}>
                {icon}
            </div>
            <div className="gs-metric-content">
                <div className="gs-metric-label-row">
                    <span className="gs-metric-label">{label}</span>
                    {hasInfo && (
                        <span className="gs-metric-info-pill" title={infoText || label}>
                            <IconInfo size={13} />
                        </span>
                    )}
                </div>
                <div className="gs-metric-value">{value}</div>
            </div>
        </div>
    );
}
