'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useData, PartItem, PartsPurchaseOrder, PartsPurchaseOrderItem } from '../../context/DataContext';
import { useCurrency } from '../../context/CurrencyContext';
import Sidebar from '../../components/Sidebar';
import '../globals.css';
import { usePageGuard } from '../../hooks/usePageGuard';

export default function PartsPage() {
    const { user, isAuthenticated } = useAuth();
    const { isAllowed } = usePageGuard('parts');
    if (!isAllowed) return null;
    const { formatCurrency: fmt } = useCurrency();
    const { 
        partsInventory, 
        suppliers, 
        partsPurchaseOrders, 
        createPartsPurchaseOrder, 
        updatePartsPurchaseOrderStatus, 
        deletePartsPurchaseOrder,
        showToast 
    } = useData();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'Inventory' | 'POs'>('Inventory');
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

    // Modals
    const [showAddPart, setShowAddPart] = useState(false);
    const [showCreatePO, setShowCreatePO] = useState(false);
    const [viewPO, setViewPO] = useState<PartsPurchaseOrder | null>(null);

    // Form: New Part
    const emptyPartForm = { partNumber: '', name: '', description: '', cost: '', price: '', stockQuantity: '', category: 'Engine' as PartItem['category'] };
    const [partForm, setPartForm] = useState({ ...emptyPartForm });

    // Form: New PO
    const emptyPOForm = { poNumber: `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`, supplierId: '', branch: 'Kampala Main', notes: '' };
    const [poForm, setPoForm] = useState({ ...emptyPOForm });
    
    // Items builder for new PO
    const [poItems, setPoItems] = useState<PartsPurchaseOrderItem[]>([]);
    const [newItem, setNewItem] = useState({ partNumber: '', name: '', quantity: '1', unitCost: '' });

    useEffect(() => {
        if (!isAuthenticated) router.push('/login');
    }, [isAuthenticated, router]);

    if (!isAuthenticated || !user) return null;

    // Filter parts
    const filteredParts = partsInventory
        .filter(p => categoryFilter === 'All' || p.category === categoryFilter)
        .filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.partNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    // KPIs
    const totalPartsCount = partsInventory.length;
    const lowStockCount = partsInventory.filter(p => p.stockQuantity < 5).length;
    const totalValuation = partsInventory.reduce((sum, p) => sum + (p.cost * p.stockQuantity), 0);
    const activePOsCount = partsPurchaseOrders.filter(p => p.status === 'Ordered').length;

    // Handlers
    const handleAddPartSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!partForm.partNumber || !partForm.name) return;
        
        try {
            // Add part manually via standard POST
            const sessionRes = await fetch('/api/parts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    partNumber: partForm.partNumber,
                    name: partForm.name,
                    description: partForm.description,
                    cost: parseFloat(partForm.cost) || 0,
                    price: parseFloat(partForm.price) || 0,
                    stockQuantity: parseInt(partForm.stockQuantity) || 0,
                    category: partForm.category
                })
            });
            if (sessionRes.ok) {
                showToast(`Part ${partForm.name} added.`, 'success');
                // Reload in background
                window.location.reload();
            } else {
                showToast('Failed to save part.', 'danger');
            }
        } catch (err: any) {
            showToast(err.message, 'danger');
        }

        setShowAddPart(false);
        setPartForm({ ...emptyPartForm });
    };

    const handleAddItemToPO = () => {
        if (!newItem.partNumber || !newItem.name || !newItem.unitCost) {
            showToast('Please fill out all item fields.', 'warning');
            return;
        }
        const qty = parseInt(newItem.quantity) || 1;
        const costVal = parseFloat(newItem.unitCost) || 0;

        const item: PartsPurchaseOrderItem = {
            partNumber: newItem.partNumber,
            name: newItem.name,
            quantity: qty,
            unitCost: costVal
        };

        setPoItems(prev => [...prev, item]);
        setNewItem({ partNumber: '', name: '', quantity: '1', unitCost: '' });
    };

    const handleRemoveItemFromPO = (idx: number) => {
        setPoItems(prev => prev.filter((_, i) => i !== idx));
    };

    const handleCreatePOSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (poItems.length === 0) {
            showToast('Please add at least one item to the Purchase Order.', 'warning');
            return;
        }

        await createPartsPurchaseOrder({
            poNumber: poForm.poNumber,
            supplierId: poForm.supplierId || undefined,
            branch: poForm.branch as any,
            notes: poForm.notes,
            status: 'Ordered'
        }, poItems);

        setShowCreatePO(false);
        setPoItems([]);
        setPoForm({ ...emptyPOForm });
    };

    const handleMarkPOReceived = async (id: string, poNum: string) => {
        if (confirm(`Confirm receipt of Purchase Order ${poNum}? This will auto-replenish parts inventory quantities.`)) {
            await updatePartsPurchaseOrderStatus(id, 'Received');
        }
    };

    const handleCancelPO = async (id: string, poNum: string) => {
        if (confirm(`Are you sure you want to cancel Purchase Order ${poNum}?`)) {
            await updatePartsPurchaseOrderStatus(id, 'Cancelled');
        }
    };

    // Style helper objects
    const flexRow: React.CSSProperties = { display: 'flex', gap: '1rem', alignItems: 'center' };
    const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' };
    const modalContent: React.CSSProperties = { background: '#0e172a', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '2rem', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' };
    const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-color)', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box' };
    const labelStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' };
    const thStyle: React.CSSProperties = { padding: '0.85rem 1.25rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' };
    const tdStyle: React.CSSProperties = { padding: '0.85rem 1.25rem', fontSize: '0.875rem', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'var(--text-light)' };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
            <Sidebar />

            <main style={{ flex: 1, padding: '2rem', overflowX: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', margin: 0 }}>Parts Stock & Purchase Orders</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Monitor inventory levels, trigger low stock restock requests, and track PO lifecycles.</p>
                    </div>

                    <div style={flexRow}>
                        <button className="btn-outline" onClick={() => setShowAddPart(true)}>+ Add Part Manually</button>
                        <button className="btn-primary" onClick={() => setShowCreatePO(true)}>📦 New Purchase Order</button>
                    </div>
                </div>

                {/* KPI Panel */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Cataloged Parts</span>
                        <h3 style={{ fontSize: '1.75rem', margin: '0.5rem 0 0 0', fontWeight: 800 }}>{totalPartsCount}</h3>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Low Stock Alert ⚠️</span>
                        <h3 style={{ fontSize: '1.75rem', margin: '0.5rem 0 0 0', fontWeight: 800, color: lowStockCount > 0 ? 'var(--danger)' : 'inherit' }}>{lowStockCount}</h3>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Inventory Valuation</span>
                        <h3 style={{ fontSize: '1.75rem', margin: '0.5rem 0 0 0', fontWeight: 800, color: 'var(--secondary-accent)' }}>{fmt(totalValuation)}</h3>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active restock POs</span>
                        <h3 style={{ fontSize: '1.75rem', margin: '0.5rem 0 0 0', fontWeight: 800, color: 'var(--warning)' }}>{activePOsCount}</h3>
                    </div>
                </div>

                {/* Tab selector */}
                <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                    <button 
                        style={{ fontSize: '1rem', fontWeight: 600, background: 'none', border: 'none', color: activeTab === 'Inventory' ? 'white' : 'var(--text-muted)', borderBottom: activeTab === 'Inventory' ? '2px solid var(--primary)' : '2px solid transparent', paddingBottom: '0.5rem', cursor: 'pointer' }}
                        onClick={() => setActiveTab('Inventory')}
                    >
                        Parts Inventory Catalog
                    </button>
                    <button 
                        style={{ fontSize: '1rem', fontWeight: 600, background: 'none', border: 'none', color: activeTab === 'POs' ? 'white' : 'var(--text-muted)', borderBottom: activeTab === 'POs' ? '2px solid var(--primary)' : '2px solid transparent', paddingBottom: '0.5rem', cursor: 'pointer' }}
                        onClick={() => setActiveTab('POs')}
                    >
                        Supplier Purchase Orders ({partsPurchaseOrders.length})
                    </button>
                </div>

                {/* TAB CONTENT: INVENTORY */}
                {activeTab === 'Inventory' && (
                    <div>
                        {/* Filters */}
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                            <input 
                                style={{ ...inputStyle, width: '280px' }}
                                placeholder="Search by name or part #..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />

                            <select 
                                style={{ ...inputStyle, width: '180px' }}
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                            >
                                <option value="All">All Categories</option>
                                <option value="Engine">Engine</option>
                                <option value="Electrical">Electrical</option>
                                <option value="Suspension">Suspension</option>
                                <option value="Body">Body</option>
                                <option value="Consumable">Consumable</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        {/* Inventory Table */}
                        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
                            <div className="table-responsive"><table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    <tr>
                                        <th style={thStyle}>Part Number</th>
                                        <th style={thStyle}>Name</th>
                                        <th style={thStyle}>Category</th>
                                        <th style={thStyle}>Stock level</th>
                                        <th style={thStyle}>Cost (USD)</th>
                                        <th style={thStyle}>Selling Price</th>
                                        <th style={thStyle}>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredParts.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No parts cataloged matching search criteria.</td>
                                        </tr>
                                    ) : (
                                        filteredParts.map(p => (
                                            <tr key={p.id}>
                                                <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--secondary-accent)' }}>{p.partNumber}</td>
                                                <td style={tdStyle}>{p.name}</td>
                                                <td style={tdStyle}>
                                                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)' }}>{p.category}</span>
                                                </td>
                                                <td style={tdStyle}>
                                                    <div style={flexRow}>
                                                        <span style={{ fontWeight: 'bold', color: p.stockQuantity < 5 ? 'var(--danger)' : 'white' }}>{p.stockQuantity}</span>
                                                        {p.stockQuantity < 5 && (
                                                            <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>⚠️ LOW STOCK</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={tdStyle}>{fmt(p.cost)}</td>
                                                <td style={tdStyle}>{fmt(p.price)}</td>
                                                <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.8rem' }}>{p.description || '—'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table></div>
                        </div>
                    </div>
                )}

                {/* TAB CONTENT: PURCHASE ORDERS */}
                {activeTab === 'POs' && (
                    <div>
                        {/* POs Table */}
                        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
                            <div className="table-responsive"><table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    <tr>
                                        <th style={thStyle}>PO Number</th>
                                        <th style={thStyle}>Supplier</th>
                                        <th style={thStyle}>Total Cost</th>
                                        <th style={thStyle}>Branch</th>
                                        <th style={thStyle}>Date created</th>
                                        <th style={thStyle}>Status</th>
                                        <th style={thStyle}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {partsPurchaseOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No parts purchase orders placed yet.</td>
                                        </tr>
                                    ) : (
                                        partsPurchaseOrders.map(po => {
                                            const supplier = suppliers.find(s => s.id === po.supplierId);
                                            return (
                                                <tr key={po.id}>
                                                    <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--primary)' }}>{po.poNumber}</td>
                                                    <td style={tdStyle}>{supplier?.name || '—'}</td>
                                                    <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt(po.totalCost)}</td>
                                                    <td style={tdStyle}>{po.branch}</td>
                                                    <td style={tdStyle}>
                                                        {po.createdAt ? new Date(po.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Just now'}
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <span style={{ 
                                                            padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                                            background: po.status === 'Received' ? 'rgba(34, 197, 94, 0.1)' : po.status === 'Cancelled' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                            color: po.status === 'Received' ? 'var(--success)' : po.status === 'Cancelled' ? 'var(--danger)' : 'var(--warning)'
                                                        }}>
                                                            {po.status}
                                                        </span>
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <button className="btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setViewPO(po)}>🔍 View Items</button>
                                                            {po.status === 'Ordered' && (
                                                                <>
                                                                    <button className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'var(--success)' }} onClick={() => handleMarkPOReceived(po.id, po.poNumber)}>✓ Receive</button>
                                                                    <button className="btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleCancelPO(po.id, po.poNumber)}>✕ Cancel</button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table></div>
                        </div>
                    </div>
                )}
            </main>

            {/* MODAL: ADD PART MANUALLY */}
            {showAddPart && (
                <div style={modalOverlay}>
                    <div style={modalContent}>
                        <h3 style={{ margin: '0 0 1.5rem 0', fontWeight: 800 }}>+ Add Part to Catalog</h3>
                        <form onSubmit={handleAddPartSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Part Number *</label>
                                    <input style={inputStyle} required value={partForm.partNumber} onChange={e => setPartForm({ ...partForm, partNumber: e.target.value })} placeholder="e.g. SP-8812" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Part Name *</label>
                                    <input style={inputStyle} required value={partForm.name} onChange={e => setPartForm({ ...partForm, name: e.target.value })} placeholder="e.g. Spark Plug Iridium" />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Cost Price (USD) *</label>
                                    <input style={inputStyle} required type="number" step="0.01" value={partForm.cost} onChange={e => setPartForm({ ...partForm, cost: e.target.value })} placeholder="45.00" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Retail Selling Price *</label>
                                    <input style={inputStyle} required type="number" step="0.01" value={partForm.price} onChange={e => setPartForm({ ...partForm, price: e.target.value })} placeholder="65.00" />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Initial Stock Qty *</label>
                                    <input style={inputStyle} required type="number" value={partForm.stockQuantity} onChange={e => setPartForm({ ...partForm, stockQuantity: e.target.value })} placeholder="10" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Category</label>
                                    <select style={inputStyle} value={partForm.category} onChange={e => setPartForm({ ...partForm, category: e.target.value as any })}>
                                        <option value="Engine">Engine</option>
                                        <option value="Electrical">Electrical</option>
                                        <option value="Suspension">Suspension</option>
                                        <option value="Body">Body</option>
                                        <option value="Consumable">Consumable</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Description</label>
                                <input style={inputStyle} value={partForm.description} onChange={e => setPartForm({ ...partForm, description: e.target.value })} placeholder="OEM replacement spark plug" />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button type="button" className="btn-outline" onClick={() => setShowAddPart(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Save to Catalog</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: CREATE PURCHASE ORDER */}
            {showCreatePO && (
                <div style={modalOverlay}>
                    <div style={{ ...modalContent, maxWidth: '800px' }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', fontWeight: 800 }}>📦 Draft Supplier Purchase Order</h3>
                        <form onSubmit={handleCreatePOSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>PO Number</label>
                                    <input style={{ ...inputStyle, background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)' }} readOnly value={poForm.poNumber} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Select Supplier</label>
                                    <select style={inputStyle} value={poForm.supplierId} onChange={e => setPoForm({ ...poForm, supplierId: e.target.value })}>
                                        <option value="">Choose Supplier...</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.country})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Target Branch</label>
                                    <select style={inputStyle} value={poForm.branch} onChange={e => setPoForm({ ...poForm, branch: e.target.value })}>
                                        <option value="Kampala Main">Kampala Main</option>
                                        <option value="Jinja Showroom">Jinja Showroom</option>
                                        <option value="Entebbe Hub">Entebbe Hub</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Internal Notes</label>
                                <input style={inputStyle} value={poForm.notes} onChange={e => setPoForm({ ...poForm, notes: e.target.value })} placeholder="Requesting urgent shipping via air freight." />
                            </div>

                            {/* Items Builder */}
                            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
                                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', fontWeight: 700, color: 'var(--secondary-accent)' }}>Add Purchase Items:</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 80px 100px auto', gap: '0.5rem', alignItems: 'end', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Part Number</label>
                                        <input style={{ ...inputStyle, padding: '0.5rem 0.75rem' }} value={newItem.partNumber} onChange={e => setNewItem({ ...newItem, partNumber: e.target.value })} placeholder="SP-10" />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Name</label>
                                        <input style={{ ...inputStyle, padding: '0.5rem 0.75rem' }} value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="Brake Pad" />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Qty</label>
                                        <input style={{ ...inputStyle, padding: '0.5rem 0.75rem' }} type="number" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unit Cost</label>
                                        <input style={{ ...inputStyle, padding: '0.5rem 0.75rem' }} type="number" value={newItem.unitCost} onChange={e => setNewItem({ ...newItem, unitCost: e.target.value })} placeholder="45" />
                                    </div>
                                    <button type="button" className="btn-primary" style={{ padding: '0.55rem 1rem', fontSize: '0.8rem' }} onClick={handleAddItemToPO}>+ Add</button>
                                </div>

                                {/* Items List */}
                                <div className="table-responsive"><table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            <th style={{ textAlign: 'left', padding: '0.35rem' }}>Part #</th>
                                            <th style={{ textAlign: 'left', padding: '0.35rem' }}>Name</th>
                                            <th style={{ textAlign: 'right', padding: '0.35rem' }}>Qty</th>
                                            <th style={{ textAlign: 'right', padding: '0.35rem' }}>Unit Cost</th>
                                            <th style={{ textAlign: 'right', padding: '0.35rem' }}>Total</th>
                                            <th style={{ padding: '0.35rem' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {poItems.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No restock items added yet.</td>
                                            </tr>
                                        ) : (
                                            poItems.map((item, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.82rem' }}>
                                                    <td style={{ padding: '0.5rem 0.35rem' }}>{item.partNumber}</td>
                                                    <td style={{ padding: '0.5rem 0.35rem' }}>{item.name}</td>
                                                    <td style={{ padding: '0.5rem 0.35rem', textAlign: 'right' }}>{item.quantity}</td>
                                                    <td style={{ padding: '0.5rem 0.35rem', textAlign: 'right' }}>{fmt(item.unitCost)}</td>
                                                    <td style={{ padding: '0.5rem 0.35rem', textAlign: 'right', fontWeight: 600 }}>{fmt(item.quantity * item.unitCost)}</td>
                                                    <td style={{ padding: '0.5rem 0.35rem', textAlign: 'center' }}>
                                                        <button type="button" style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => handleRemoveItemFromPO(idx)}>✕</button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table></div>
                            </div>

                            {/* Total and actions */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                <div>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Estimated PO Valuation:</span>
                                    <h4 style={{ margin: '0.2rem 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>
                                        {fmt(poItems.reduce((acc, i) => acc + (i.quantity * i.unitCost), 0))}
                                    </h4>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button type="button" className="btn-outline" onClick={() => { setShowCreatePO(false); setPoItems([]); }}>Cancel</button>
                                    <button type="submit" className="btn-primary">Place Order</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: VIEW PURCHASE ORDER ITEMS */}
            {viewPO && (
                <div style={modalOverlay}>
                    <div style={{ ...modalContent, maxWidth: '600px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontWeight: 800 }}>Purchase Order {viewPO.poNumber}</h3>
                            <span style={{ 
                                padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                background: viewPO.status === 'Received' ? 'rgba(34, 197, 94, 0.1)' : viewPO.status === 'Cancelled' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                color: viewPO.status === 'Received' ? 'var(--success)' : viewPO.status === 'Cancelled' ? 'var(--danger)' : 'var(--warning)'
                            }}>
                                {viewPO.status}
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Target Branch: <strong style={{ color: 'white' }}>{viewPO.branch}</strong></p>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Total Cost: <strong style={{ color: 'white' }}>{fmt(viewPO.totalCost)}</strong></p>
                            {viewPO.notes && (
                                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Notes: <span style={{ color: 'white', fontStyle: 'italic' }}>"{viewPO.notes}"</span></p>
                            )}
                        </div>

                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 700 }}>Ordered Items list:</h4>
                        <div className="table-responsive"><table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    <th style={{ textAlign: 'left', padding: '0.35rem' }}>Part #</th>
                                    <th style={{ textAlign: 'left', padding: '0.35rem' }}>Name</th>
                                    <th style={{ textAlign: 'right', padding: '0.35rem' }}>Qty</th>
                                    <th style={{ textAlign: 'right', padding: '0.35rem' }}>Unit Cost</th>
                                    <th style={{ textAlign: 'right', padding: '0.35rem' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(viewPO.items || []).length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No items found.</td>
                                    </tr>
                                ) : (
                                    (viewPO.items || []).map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.01)', fontSize: '0.82rem' }}>
                                            <td style={{ padding: '0.5rem 0.35rem', fontWeight: 600 }}>{item.partNumber}</td>
                                            <td style={{ padding: '0.5rem 0.35rem' }}>{item.name}</td>
                                            <td style={{ padding: '0.5rem 0.35rem', textAlign: 'right' }}>{item.quantity}</td>
                                            <td style={{ padding: '0.5rem 0.35rem', textAlign: 'right' }}>{fmt(item.unitCost)}</td>
                                            <td style={{ padding: '0.5rem 0.35rem', textAlign: 'right', fontWeight: 600 }}>{fmt(item.quantity * item.unitCost)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table></div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            {viewPO.status === 'Ordered' && (
                                <>
                                    <button className="btn-primary" style={{ background: 'var(--success)' }} onClick={() => { handleMarkPOReceived(viewPO.id, viewPO.poNumber); setViewPO(null); }}>✓ Mark Received</button>
                                    <button className="btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => { handleCancelPO(viewPO.id, viewPO.poNumber); setViewPO(null); }}>✕ Cancel PO</button>
                                </>
                            )}
                            <button className="btn-outline" onClick={() => setViewPO(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
