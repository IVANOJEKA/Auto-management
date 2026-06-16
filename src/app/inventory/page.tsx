'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useData, Vehicle } from '../../context/DataContext';
import Sidebar from '../../components/Sidebar';
import { useCurrency } from '../../context/CurrencyContext';
import '../globals.css';

const EMPTY_VEHICLE = { vin: '', make: '', model: '', year: '', color: 'Obsidian Black', price: '', cost: '', mileage: '0', status: 'In Stock' as const, notes: '', type: 'Car' as 'Car' | 'Motorcycle' | 'Truck' | 'SUV' | 'Van' | 'Other' };

export default function InventoryPage() {
    const { user, isAuthenticated } = useAuth();
    const { vehicles, addVehicle, editVehicle, deleteVehicle, exportToCSV, selectedBranch } = useData();
    const { formatCurrency, formatUSDToStore } = useCurrency();
    const router = useRouter();

    useEffect(() => {
        if (!isAuthenticated) router.push('/login');
    }, [isAuthenticated, router]);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Statuses');
    const [sortField, setSortField] = useState<'year' | 'price' | 'cost' | 'mileage' | 'make'>('make');
    const [sortAsc, setSortAsc] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<Vehicle | null>(null);
    const [isDecoding, setIsDecoding] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_VEHICLE });

    const [activeTab, setActiveTab] = useState<'Shipped' | 'Local'>('Shipped');
    const [showAcquisitionModal, setShowAcquisitionModal] = useState(false);
    const [acqForm, setAcqForm] = useState({
        sellerName: '', sellerContact: '', sellerEmail: '', sellerAddress: '', sellerId: '',
        make: '', model: '', year: '2024', vin: '', mileage: '0', condition: 'Excellent', color: '', notes: '',
        agreedPrice: '', paymentType: 'Bank Transfer' as any, paymentOption: 'Full' as any, amountPaid: '', balanceLeft: 0,
        isSwap: false, swapMake: '', swapModel: '', swapYear: '2020', swapMileage: '50000', swapCondition: 'Good', swapValue: '', swapTopUp: '',
        type: 'Car' as 'Car' | 'Motorcycle' | 'Truck' | 'SUV' | 'Van' | 'Other',
        swapType: 'Car' as 'Car' | 'Motorcycle' | 'Truck' | 'SUV' | 'Van' | 'Other'
    });

    if (!isAuthenticated || !user) return null;

    const handleDecodeVIN = () => {
        if (!form.vin || form.vin.length < 4) return;
        setIsDecoding(true);
        setTimeout(() => {
            const decodes = [
                { make: 'Audi', model: 'RSQ8', year: '2024' },
                { make: 'Aston Martin', model: 'DBX 707', year: '2024' },
                { make: 'Ferrari', model: 'Roma', year: '2023' },
                { make: 'Tesla', model: 'Model S Plaid', year: '2024' },
                { make: 'BMW', model: 'M8 Competition', year: '2024' },
                { make: 'Lamborghini', model: 'Urus S', year: '2024' },
            ];
            const motoDecodes = [
                { make: 'Yamaha', model: 'YZF-R1', year: '2024' },
                { make: 'Honda', model: 'CBR1000RR-R Fireblade', year: '2024' },
                { make: 'Kawasaki', model: 'Ninja H2R', year: '2023' },
                { make: 'Suzuki', model: 'Hayabusa', year: '2024' },
                { make: 'Ducati', model: 'Panigale V4 S', year: '2024' },
                { make: 'BMW Motorrad', model: 'S1000RR', year: '2024' },
            ];
            const charSum = form.vin.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
            const isMoto = form.type === 'Motorcycle';
            const choice = isMoto 
                ? motoDecodes[charSum % motoDecodes.length] 
                : decodes[charSum % decodes.length];
            setForm(prev => ({ ...prev, make: choice.make, model: choice.model, year: choice.year }));
            setIsDecoding(false);
        }, 1200);
    };

    const openEdit = (v: Vehicle) => {
        setEditingVehicle(v);
        setForm({ vin: v.vin, make: v.make, model: v.model, year: v.year.toString(), color: v.color, price: formatCurrency(v.price), cost: formatCurrency(v.cost), mileage: v.mileage.toString(), status: v.status as any, notes: v.notes || '', type: v.type || 'Car' });
    };

    const handleSave = () => {
        const payload = {
            vin: form.vin || 'VIN-' + Math.random().toString(36).substring(2, 11).toUpperCase(),
            make: form.make || 'Unknown',
            model: form.model || 'Unknown',
            year: Number(form.year) || 2024,
            color: form.color,
            price: formatUSDToStore(form.price),
            cost: formatUSDToStore(form.cost),
            mileage: Number(form.mileage) || 0,
            status: form.status,
            notes: form.notes,
            type: form.type
        };
        if (editingVehicle) {
            editVehicle(editingVehicle.id, payload);
            setEditingVehicle(null);
        } else {
            addVehicle({ ...payload, branch: (selectedBranch !== 'All' ? selectedBranch : user.branch) as any, source: 'Shipped' });
            setShowAddModal(false);
        }
        setForm({ ...EMPTY_VEHICLE });
    };

    const handleAcquireSave = () => {
        const agreedNum = parseFloat(acqForm.agreedPrice.replace(/[^0-9.-]+/g, '')) || 0;
        const paidNum = parseFloat(acqForm.amountPaid.replace(/[^0-9.-]+/g, '')) || 0;
        const swapVal = parseFloat(acqForm.swapValue.replace(/[^0-9.-]+/g, '')) || 0;
        const topUpVal = parseFloat(acqForm.swapTopUp.replace(/[^0-9.-]+/g, '')) || 0;
        const bal = acqForm.paymentOption === 'Full' ? 0 : (agreedNum - paidNum);

        const newVehicle: Omit<Vehicle, 'id'> = {
            vin: acqForm.vin || 'VIN-' + Math.random().toString(36).substring(2, 11).toUpperCase(),
            make: acqForm.make || 'Unknown',
            model: acqForm.model || 'Unknown',
            year: Number(acqForm.year) || new Date().getFullYear(),
            color: acqForm.color || 'Unknown',
            mileage: Number(acqForm.mileage) || 0,
            cost: formatUSDToStore(agreedNum),
            price: formatUSDToStore(agreedNum * 1.15), // Default 15% margin markup
            status: 'In Stock',
            notes: acqForm.notes,
            type: acqForm.type,
            branch: (selectedBranch !== 'All' ? selectedBranch : user.branch) as any,
            source: acqForm.isSwap ? 'Swap Trade-in' : 'Local Acquisition',
            acquisitionDetails: {
                sellerName: acqForm.sellerName,
                sellerContact: acqForm.sellerContact,
                sellerEmail: acqForm.sellerEmail,
                sellerAddress: acqForm.sellerAddress,
                sellerId: acqForm.sellerId,
                agreedPrice: agreedNum,
                paymentType: acqForm.paymentType,
                paymentOption: acqForm.paymentOption,
                amountPaid: paidNum,
                balanceLeft: bal,
                isSwap: acqForm.isSwap,
                swapVehicleMake: acqForm.isSwap ? acqForm.swapMake : undefined,
                swapVehicleModel: acqForm.isSwap ? acqForm.swapModel : undefined,
                swapVehicleYear: acqForm.isSwap ? Number(acqForm.swapYear) : undefined,
                swapVehicleMileage: acqForm.isSwap ? Number(acqForm.swapMileage) : undefined,
                swapVehicleCondition: acqForm.isSwap ? acqForm.swapCondition : undefined,
                swapTradeInValue: acqForm.isSwap ? swapVal : undefined,
                swapTopUpAmount: acqForm.isSwap ? topUpVal : undefined,
                swapVehicleType: acqForm.isSwap ? acqForm.swapType : undefined,
                acquisitionDate: new Date().toISOString().split('T')[0]
            }
        };

        addVehicle(newVehicle);
        
        // Print Document
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Vehicle Purchase & Acquisition Agreement</title>
                        <style>
                            body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 3rem; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.5; }
                            h2 { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; color: #0f172a; }
                            .section-title { background: #f8fafc; padding: 0.5rem; margin-top: 2rem; border-left: 4px solid #3b82f6; font-weight: bold; }
                            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
                            .field { margin-bottom: 0.5rem; }
                            .label { font-weight: 600; color: #475569; display: inline-block; width: 140px; }
                            .val { color: #0f172a; }
                            .signatures { margin-top: 4rem; display: flex; justify-content: space-between; }
                            .sig-box { text-align: center; }
                            .sig-line { border-top: 1px solid #cbd5e1; width: 250px; margin-bottom: 0.5rem; }
                        </style>
                    </head>
                    <body>
                        <h2>VEHICLE ${acqForm.isSwap ? 'SWAP & TRADE-IN' : 'PURCHASE'} AGREEMENT</h2>
                        <div style="text-align: right; color: #64748b; font-size: 0.9rem;">Date: ${new Date().toLocaleDateString()}</div>
                        
                        <div class="section-title">1. Seller Information (Individual)</div>
                        <div class="grid">
                            <div class="field"><span class="label">Full Name:</span> <span class="val">${acqForm.sellerName}</span></div>
                            <div class="field"><span class="label">ID/Passport:</span> <span class="val">${acqForm.sellerId}</span></div>
                            <div class="field"><span class="label">Contact:</span> <span class="val">${acqForm.sellerContact}</span></div>
                            <div class="field"><span class="label">Email:</span> <span class="val">${acqForm.sellerEmail}</span></div>
                            <div class="field"><span class="label" style="width:100%">Address:</span> <span class="val">${acqForm.sellerAddress}</span></div>
                        </div>

                        <div class="section-title">2. Acquired Vehicle Details (To Dealership)</div>
                        <div class="grid">
                            <div class="field"><span class="label">Vehicle:</span> <span class="val">${acqForm.year} ${acqForm.make} ${acqForm.model}</span></div>
                            <div class="field"><span class="label">Type:</span> <span class="val">${acqForm.type}</span></div>
                            <div class="field"><span class="label">VIN / Frame No:</span> <span class="val">${acqForm.vin || 'Pending'}</span></div>
                            <div class="field"><span class="label">Mileage:</span> <span class="val">${acqForm.mileage} km</span></div>
                            <div class="field"><span class="label">Condition:</span> <span class="val">${acqForm.condition}</span></div>
                        </div>

                        ${acqForm.isSwap ? `
                        <div class="section-title">3. Swap Vehicle Details (From Dealership)</div>
                        <div class="grid">
                            <div class="field"><span class="label">Vehicle:</span> <span class="val">${acqForm.swapYear} ${acqForm.swapMake} ${acqForm.swapModel}</span></div>
                            <div class="field"><span class="label">Type:</span> <span class="val">${acqForm.swapType}</span></div>
                            <div class="field"><span class="label">Mileage:</span> <span class="val">${acqForm.swapMileage} km</span></div>
                            <div class="field"><span class="label">Trade-in Val:</span> <span class="val">${formatCurrency(swapVal)}</span></div>
                            <div class="field"><span class="label">Top-Up Amount:</span> <span class="val">${formatCurrency(topUpVal)}</span></div>
                        </div>
                        ` : ''}

                        <div class="section-title">4. Financial & Payment Settlement</div>
                        <div class="grid">
                            <div class="field"><span class="label">Agreed Price:</span> <span class="val">${formatCurrency(agreedNum)}</span></div>
                            <div class="field"><span class="label">Payment Type:</span> <span class="val">${acqForm.paymentType}</span></div>
                            <div class="field"><span class="label">Payment Option:</span> <span class="val">${acqForm.paymentOption}</span></div>
                            <div class="field"><span class="label">Amount Paid:</span> <span class="val">${formatCurrency(paidNum)}</span></div>
                            <div class="field"><span class="label">Balance Due:</span> <span class="val">${formatCurrency(bal)}</span></div>
                        </div>

                        <div style="margin-top: 2rem; font-size: 0.85rem; color: #64748b; font-style: italic;">
                            By signing below, the Seller transfers all rights, title, and interest in the Acquired Vehicle to the Dealership, 
                            free and clear of all liens and encumbrances. The Seller acknowledges receipt of the Amount Paid.
                        </div>

                        <div class="signatures">
                            <div class="sig-box">
                                <div class="sig-line"></div>
                                <div>Seller Signature</div>
                                <div style="color: #94a3b8; font-size: 0.8rem; margin-top: 0.2rem;">${acqForm.sellerName}</div>
                            </div>
                            <div class="sig-box">
                                <div class="sig-line"></div>
                                <div>Dealership Representative</div>
                                <div style="color: #94a3b8; font-size: 0.8rem; margin-top: 0.2rem;">GariSphere Dealers Ltd</div>
                            </div>
                        </div>
                    </body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 250);
        }

        setShowAcquisitionModal(false);
    };

    const handleDelete = () => {
        if (!confirmDelete) return;
        deleteVehicle(confirmDelete.id);
        setConfirmDelete(null);
    };

    const handleSort = (field: typeof sortField) => {
        if (sortField === field) setSortAsc(!sortAsc);
        else { setSortField(field); setSortAsc(true); }
    };

    const filtered = vehicles
        .filter(car => {
            const s = searchTerm.toLowerCase();
            const branchMatch = selectedBranch === 'All' || car.branch === selectedBranch;
            const sourceMatch = activeTab === 'Shipped' ? (!car.source || car.source === 'Shipped') : (car.source === 'Local Acquisition' || car.source === 'Swap Trade-in');
            return branchMatch && sourceMatch
                && (!s || car.vin.toLowerCase().includes(s) || car.make.toLowerCase().includes(s) || car.model.toLowerCase().includes(s) || car.color.toLowerCase().includes(s))
                && (statusFilter === 'All Statuses' || car.status === statusFilter);
        })
        .sort((a, b) => {
            let av: number | string = a[sortField] ?? '';
            let bv: number | string = b[sortField] ?? '';
            if (sortField === 'price' || sortField === 'cost') {
                av = parseFloat(String(av).replace(/[^0-9.-]+/g, '')) || 0;
                bv = parseFloat(String(bv).replace(/[^0-9.-]+/g, '')) || 0;
            }
            return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });

    const renderSortTh = (label: string, field: typeof sortField) => (
        <th style={thStyle} onClick={() => handleSort(field)} className="sortable-col">
            {label} {sortField === field ? (sortAsc ? '↑' : '↓') : <span style={{ opacity: 0.3 }}>↕</span>}
        </th>
    );

    const statusCounts = { 'In Stock': 0, 'In Transit': 0, 'Reserved': 0, 'Sold': 0 };
    vehicles.filter(car => {
        const branchMatch = selectedBranch === 'All' || car.branch === selectedBranch;
        const sourceMatch = activeTab === 'Shipped' ? (!car.source || car.source === 'Shipped') : (car.source === 'Local Acquisition' || car.source === 'Swap Trade-in');
        return branchMatch && sourceMatch;
    }).forEach(v => statusCounts[v.status]++);

    const modalForm = (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ width: '560px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.4rem' }}>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
                    <button onClick={() => { setShowAddModal(false); setEditingVehicle(null); setForm({ ...EMPTY_VEHICLE }); }} style={closeBtnStyle}>✕</button>
                </div>

                {/* VIN / Frame Number Row */}
                <div>
                    <label style={labelStyle}>VIN / Frame Number</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="text" placeholder="Enter 17-digit VIN or Frame Number" value={form.vin}
                            onChange={e => setForm({ ...form, vin: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                        <button className="btn-outline" onClick={handleDecodeVIN} disabled={isDecoding || !form.vin}
                            style={{ borderColor: 'var(--secondary-accent)', color: 'var(--secondary-accent)', padding: '0 1rem', whiteSpace: 'nowrap' }}>
                            {isDecoding ? '⏳ Decoding...' : '🔍 Decode VIN'}
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={labelStyle}>Vehicle Type</label>
                        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })} style={{ ...inputStyle, height: '45px' }}>
                            <option value="Car">🚗 Car</option>
                            <option value="Motorcycle">🏍️ Motorcycle</option>
                            <option value="Truck">🚚 Truck</option>
                            <option value="SUV">🚙 SUV</option>
                            <option value="Van">🚐 Van</option>
                            <option value="Other">📦 Other</option>
                        </select>
                    </div>
                    <FormField label="Make" value={form.make} onChange={v => setForm({ ...form, make: v })} />
                    <FormField label="Model" value={form.model} onChange={v => setForm({ ...form, model: v })} />
                    <FormField label="Year" value={form.year} onChange={v => setForm({ ...form, year: v })} type="number" />
                    <FormField label="Color" value={form.color} onChange={v => setForm({ ...form, color: v })} />
                    <FormField label="Asking Price" value={form.price} onChange={v => setForm({ ...form, price: v })} placeholder="$95,000" />
                    <FormField label="Purchase Cost" value={form.cost} onChange={v => setForm({ ...form, cost: v })} placeholder="$80,000" />
                    <FormField label="Mileage (km)" value={form.mileage} onChange={v => setForm({ ...form, mileage: v })} type="number" />
                    <div>
                        <label style={labelStyle}>Status</label>
                        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })} style={{ ...inputStyle, height: '45px' }}>
                            <option value="In Stock">In Stock</option>
                            <option value="In Transit">In Transit</option>
                            <option value="Reserved">Reserved</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label style={labelStyle}>Notes / Spec Highlights</label>
                    <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                        placeholder="e.g. Full spec, panoramic roof, 4 years warranty..."
                        style={{ ...inputStyle, height: '70px', resize: 'none' }} />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button className="btn-primary" onClick={handleSave} style={{ flex: 1 }}>
                        {editingVehicle ? '✓ Save Changes' : '+ Add to Inventory'}
                    </button>
                    <button className="btn-outline" onClick={() => { setShowAddModal(false); setEditingVehicle(null); setForm({ ...EMPTY_VEHICLE }); }}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto' }}>

                {/* Header */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '1.9rem', marginBottom: '0.2rem' }}>Inventory Management</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{filtered.length} vehicles shown · {vehicles.length} total</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn-outline" onClick={() => exportToCSV(vehicles.map(v => ({ ...v })), 'inventory.csv')}>⬇ Export CSV</button>
                        {activeTab === 'Shipped' ? (
                            <button className="btn-primary" onClick={() => setShowAddModal(true)}>+ Add Vehicle</button>
                        ) : (
                            <button className="btn-primary" onClick={() => setShowAcquisitionModal(true)}>🤝 Acquire / Swap Vehicle</button>
                        )}
                    </div>
                </header>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-color)', marginBottom: '-0.75rem' }}>
                    <button onClick={() => setActiveTab('Shipped')} style={{ background: 'none', border: 'none', color: activeTab === 'Shipped' ? 'white' : 'var(--text-muted)', borderBottom: activeTab === 'Shipped' ? '2px solid var(--accent)' : '2px solid transparent', paddingBottom: '0.5rem', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                        🚢 Shipped Stock
                    </button>
                    <button onClick={() => setActiveTab('Local')} style={{ background: 'none', border: 'none', color: activeTab === 'Local' ? 'white' : 'var(--text-muted)', borderBottom: activeTab === 'Local' ? '2px solid var(--accent)' : '2px solid transparent', paddingBottom: '0.5rem', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                        🤝 Local Acquisitions & Swaps
                    </button>
                </div>

                {/* Stats Strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                    {Object.entries(statusCounts).map(([status, count]) => (
                        <div key={status} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', cursor: 'pointer' }}
                            onClick={() => setStatusFilter(status === statusFilter ? 'All Statuses' : status)}>
                            <div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{status}</p>
                                <h3 style={{ fontSize: '1.6rem', margin: 0 }}>{count}</h3>
                            </div>
                            <span className={`badge ${status === 'In Stock' ? 'badge-success' : status === 'In Transit' ? 'badge-info' : status === 'Reserved' ? 'badge-warning' : 'badge-danger'}`}>{status}</span>
                        </div>
                    ))}
                </div>

                {/* Toolbar */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <input type="text" placeholder="🔍 Search VIN, Make, Model, Color..." value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)} style={{ flex: 1, ...inputStyle }} />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, height: '45px', minWidth: '150px' }}>
                        <option>All Statuses</option>
                        <option>In Stock</option>
                        <option>In Transit</option>
                        <option>Reserved</option>
                        <option>Sold</option>
                    </select>
                </div>

                {/* Table */}
                <div className="glass-panel" style={{ overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={thStyle}>VIN / Frame No</th>
                                {renderSortTh("Vehicle", "make")}
                                <th style={thStyle}>Color</th>
                                <th style={thStyle}>Branch</th>
                                {renderSortTh("Year", "year")}
                                {renderSortTh("Mileage", "mileage")}
                                {renderSortTh("Cost", "cost")}
                                {renderSortTh("Price", "price")}
                                <th style={thStyle}>Status</th>
                                <th style={thStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((car, i) => (
                                <tr key={car.id} style={{ borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                                    <td style={tdStyle}><span style={{ fontFamily: 'monospace', color: 'var(--secondary-accent)', fontSize: '0.8rem' }}>{car.vin}</span></td>
                                    <td style={tdStyle}>
                                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span>
                                                {car.type === 'Motorcycle' ? '🏍️' :
                                                 car.type === 'Truck' ? '🚚' :
                                                 car.type === 'SUV' ? '🚙' :
                                                 car.type === 'Van' ? '🚐' :
                                                 car.type === 'Other' ? '📦' : '🚗'}
                                            </span>
                                            <span>{car.make} {car.model}</span>
                                        </div>
                                        {car.notes && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{car.notes.slice(0, 40)}{car.notes.length > 40 ? '…' : ''}</div>}
                                    </td>
                                    <td style={tdStyle}>{car.color}</td>
                                    <td style={tdStyle}><span style={{ fontSize: '0.75rem', color: 'var(--secondary-accent)' }}>{car.branch || '—'}</span></td>
                                    <td style={tdStyle}>{car.year}</td>
                                    <td style={tdStyle}>{(car.mileage ?? 0).toLocaleString()} km</td>
                                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{car.cost ? formatCurrency(car.cost) : '—'}</td>
                                    <td style={{ ...tdStyle, fontWeight: 700, color: 'white' }}>{formatCurrency(car.price)}</td>
                                    <td style={tdStyle}>
                                        <span className={`badge ${car.status === 'In Stock' ? 'badge-success' : car.status === 'In Transit' ? 'badge-info' : car.status === 'Sold' ? 'badge-danger' : 'badge-warning'}`}>
                                            {car.status}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => openEdit(car)} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}>✏ Edit</button>
                                            <button onClick={() => setConfirmDelete(car)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}>🗑</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No vehicles match the filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Add/Edit Modal */}
            {(showAddModal || editingVehicle) && modalForm}

            {/* Delete Confirm Modal */}
            {confirmDelete && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ width: '420px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <h3 style={{ fontSize: '1.3rem', color: 'var(--danger)' }}>⚠ Remove Vehicle?</h3>
                        <p style={{ color: 'var(--text-muted)' }}>
                            This will permanently remove <strong style={{ color: 'white' }}>{confirmDelete.year} {confirmDelete.make} {confirmDelete.model}</strong> (VIN: {confirmDelete.vin}) from inventory and its compliance record.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={handleDelete} style={{ flex: 1, background: 'var(--danger)', border: 'none', color: 'white', padding: '0.75rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>Yes, Remove</button>
                            <button className="btn-outline" onClick={() => setConfirmDelete(null)} style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            {showAcquisitionModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
                    <div className="glass-panel" style={{ width: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.5rem', margin: 0 }}>🤝 Vehicle Acquisition & Swap Agreement</h3>
                            <button onClick={() => setShowAcquisitionModal(false)} style={closeBtnStyle}>✕</button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            {/* Column 1 */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--secondary-accent)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>1. Seller (Individual) Details</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <FormField label="Full Name" value={acqForm.sellerName} onChange={v => setAcqForm({ ...acqForm, sellerName: v })} />
                                        <FormField label="ID / Passport No" value={acqForm.sellerId} onChange={v => setAcqForm({ ...acqForm, sellerId: v })} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                        <FormField label="Contact" value={acqForm.sellerContact} onChange={v => setAcqForm({ ...acqForm, sellerContact: v })} />
                                        <FormField label="Email" value={acqForm.sellerEmail} onChange={v => setAcqForm({ ...acqForm, sellerEmail: v })} />
                                    </div>
                                    <div style={{ marginTop: '1rem' }}>
                                        <FormField label="Physical Address" value={acqForm.sellerAddress} onChange={v => setAcqForm({ ...acqForm, sellerAddress: v })} />
                                    </div>
                                </div>

                                <div>
                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--secondary-accent)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>2. Vehicle Acquired (To Dealership)</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label style={labelStyle}>Vehicle Type</label>
                                            <select value={acqForm.type} onChange={e => setAcqForm({ ...acqForm, type: e.target.value as any })} style={inputStyle}>
                                                <option value="Car">🚗 Car</option>
                                                <option value="Motorcycle">🏍️ Motorcycle</option>
                                                <option value="Truck">🚚 Truck</option>
                                                <option value="SUV">🚙 SUV</option>
                                                <option value="Van">🚐 Van</option>
                                                <option value="Other">📦 Other</option>
                                            </select>
                                        </div>
                                        <FormField label="Color" value={acqForm.color} onChange={v => setAcqForm({ ...acqForm, color: v })} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                        <FormField label="Make" value={acqForm.make} onChange={v => setAcqForm({ ...acqForm, make: v })} />
                                        <FormField label="Model" value={acqForm.model} onChange={v => setAcqForm({ ...acqForm, model: v })} />
                                        <FormField label="Year" value={acqForm.year} onChange={v => setAcqForm({ ...acqForm, year: v })} type="number" />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                        <FormField label="VIN / Frame No (Optional)" value={acqForm.vin} onChange={v => setAcqForm({ ...acqForm, vin: v })} />
                                        <FormField label="Mileage (km)" value={acqForm.mileage} onChange={v => setAcqForm({ ...acqForm, mileage: v })} type="number" />
                                    </div>
                                </div>
                            </div>

                            {/* Column 2 */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h4 style={{ fontSize: '0.9rem', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>3. Financial & Payment Info</h4>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', color: acqForm.isSwap ? 'var(--accent)' : 'var(--text-muted)' }}>
                                            <input type="checkbox" checked={acqForm.isSwap} onChange={e => setAcqForm({ ...acqForm, isSwap: e.target.checked })} style={{ cursor: 'pointer' }} />
                                            Deal includes Trade-in / Swap
                                        </label>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <FormField label="Agreed Price ($)" value={acqForm.agreedPrice} onChange={v => setAcqForm({ ...acqForm, agreedPrice: v })} placeholder="e.g. 45000" />
                                        <div>
                                            <label style={labelStyle}>Payment Method</label>
                                            <select value={acqForm.paymentType} onChange={e => setAcqForm({ ...acqForm, paymentType: e.target.value as any })} style={inputStyle}>
                                                <option value="Bank Transfer">Bank Transfer</option>
                                                <option value="Cash">Cash</option>
                                                <option value="Mobile Money">Mobile Money</option>
                                            </select>
                                        </div>
                                    </div>

                                    {!acqForm.isSwap && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                            <div>
                                                <label style={labelStyle}>Payment Option</label>
                                                <select value={acqForm.paymentOption} onChange={e => setAcqForm({ ...acqForm, paymentOption: e.target.value as any })} style={inputStyle}>
                                                    <option value="Full">Full Payment</option>
                                                    <option value="Partial">Partial / Deposit</option>
                                                </select>
                                            </div>
                                            {acqForm.paymentOption === 'Partial' && (
                                                <FormField label="Amount Paid Now ($)" value={acqForm.amountPaid} onChange={v => setAcqForm({ ...acqForm, amountPaid: v })} />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {acqForm.isSwap && (
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                                        <h4 style={{ fontSize: '0.9rem', color: 'var(--warning)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>4. Trade-in / Swap Vehicle</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                            <div>
                                                <label style={labelStyle}>Swap Vehicle Type</label>
                                                <select value={acqForm.swapType} onChange={e => setAcqForm({ ...acqForm, swapType: e.target.value as any })} style={inputStyle}>
                                                    <option value="Car">🚗 Car</option>
                                                    <option value="Motorcycle">🏍️ Motorcycle</option>
                                                    <option value="Truck">🚚 Truck</option>
                                                    <option value="SUV">🚙 SUV</option>
                                                    <option value="Van">🚐 Van</option>
                                                    <option value="Other">📦 Other</option>
                                                </select>
                                            </div>
                                            <FormField label="Condition" value={acqForm.swapCondition} onChange={v => setAcqForm({ ...acqForm, swapCondition: v })} />
                                            <FormField label="Mileage" value={acqForm.swapMileage} onChange={v => setAcqForm({ ...acqForm, swapMileage: v })} />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                            <FormField label="Make" value={acqForm.swapMake} onChange={v => setAcqForm({ ...acqForm, swapMake: v })} />
                                            <FormField label="Model" value={acqForm.swapModel} onChange={v => setAcqForm({ ...acqForm, swapModel: v })} />
                                            <FormField label="Year" value={acqForm.swapYear} onChange={v => setAcqForm({ ...acqForm, swapYear: v })} />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                            <FormField label="Trade-in Allowance ($)" value={acqForm.swapValue} onChange={v => setAcqForm({ ...acqForm, swapValue: v })} placeholder="Discount Value" />
                                            <FormField label="Top-Up Amount ($)" value={acqForm.swapTopUp} onChange={v => setAcqForm({ ...acqForm, swapTopUp: v })} placeholder="Difference" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                            <button className="btn-primary" onClick={handleAcquireSave} style={{ flex: 1, padding: '1rem', fontSize: '1rem' }}>
                                ✓ Save & Add to Local Inventory
                            </button>
                            <button className="btn-secondary" onClick={handleAcquireSave} style={{ flex: 1, padding: '1rem', fontSize: '1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)' }}>
                                🖨️ Generate Purchase Agreement
                            </button>
                            <button className="btn-outline" onClick={() => setShowAcquisitionModal(false)} style={{ padding: '0 2rem' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function FormField({ label, value, onChange, type = 'text', placeholder }: any) {
    return (
        <div>
            <label style={labelStyle}>{label}</label>
            <input type={type} value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} placeholder={placeholder}
                style={inputStyle} />
        </div>
    );
}

const labelStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' };
const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-color)', padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box' };
const closeBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' };
const thStyle: React.CSSProperties = { padding: '1rem 1.25rem', fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '1rem 1.25rem', verticalAlign: 'middle', fontSize: '0.9rem' };
