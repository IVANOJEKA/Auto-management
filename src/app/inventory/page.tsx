'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useData, Vehicle } from '../../context/DataContext';
import { useBranches } from '../../context/BranchContext';
import Sidebar from '../../components/Sidebar';
import { useCurrency } from '../../context/CurrencyContext';
import { supabase } from '../../lib/supabase';
import '../globals.css';
import { usePageGuard } from '../../hooks/usePageGuard';

const EMPTY_VEHICLE = { vin: '', make: '', model: '', year: '', color: 'Obsidian Black', price: '', cost: '', reconditioningCost: '', photos: [] as string[], mileage: '0', status: 'In Stock' as const, notes: '', type: 'Car' as 'Car' | 'Motorcycle' | 'Truck' | 'SUV' | 'Van' | 'Other', numberPlate: '' };

export default function InventoryPage() {
    const { user, isAuthenticated } = useAuth();
    const { isAllowed } = usePageGuard('inventory');
    if (!isAllowed) return null;
    const { vehicles, addVehicle, editVehicle, deleteVehicle, exportToCSV, selectedBranch } = useData();
    const { branches } = useBranches();
    const { currency, formatCurrency, formatUSDToStore } = useCurrency();
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
    const [galleryVehicle, setGalleryVehicle] = useState<Vehicle | null>(null);
    const [activePhotoIdx, setActivePhotoIdx] = useState(0);
    const [isDecoding, setIsDecoding] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_VEHICLE });

    // Transfer state
    const [transferVehicle, setTransferVehicle] = useState<Vehicle | null>(null);
    const [transferBranch, setTransferBranch] = useState('');
    const [transferNotes, setTransferNotes] = useState('');
    const [transferring, setTransferring] = useState(false);

    const [activeTab, setActiveTab] = useState<'Shipped' | 'Local'>('Shipped');
    const [showAcquisitionModal, setShowAcquisitionModal] = useState(false);
    const [acqForm, setAcqForm] = useState({
        sellerName: '', sellerContact: '', sellerEmail: '', sellerAddress: '', sellerId: '',
        make: '', model: '', year: '2024', vin: '', mileage: '0', condition: 'Excellent', color: '', notes: '',
        agreedPrice: '', reconditioningCost: '', photos: [] as string[], paymentType: 'Bank Transfer' as any, paymentOption: 'Full' as any, amountPaid: '', balanceLeft: 0,
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

    const [isUploading, setIsUploading] = useState(false);
    const [isAcqUploading, setIsAcqUploading] = useState(false);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setIsUploading(true);
        const uploadedUrls = [...(form.photos || [])];
        for (let i = 0; i < e.target.files.length; i++) {
            const file = e.target.files[i];
            const fd = new FormData();
            fd.append('file', file);
            try {
                const sessionRes = await supabase.auth.getSession();
                const token = sessionRes.data.session?.access_token;
                const headers: Record<string, string> = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch('/api/documents/upload', {
                    method: 'POST',
                    headers,
                    body: fd
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.url) uploadedUrls.push(data.url);
                }
            } catch (err) {
                console.error("Photo upload failed:", err);
            }
        }
        setForm(prev => ({ ...prev, photos: uploadedUrls }));
        setIsUploading(false);
    };

    const handleRemovePhoto = (index: number) => {
        setForm(prev => ({ ...prev, photos: prev.photos.filter((_, idx) => idx !== index) }));
    };

    const handleAcqPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setIsAcqUploading(true);
        const uploadedUrls = [...(acqForm.photos || [])];
        for (let i = 0; i < e.target.files.length; i++) {
            const file = e.target.files[i];
            const fd = new FormData();
            fd.append('file', file);
            try {
                const sessionRes = await supabase.auth.getSession();
                const token = sessionRes.data.session?.access_token;
                const headers: Record<string, string> = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch('/api/documents/upload', {
                    method: 'POST',
                    headers,
                    body: fd
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.url) uploadedUrls.push(data.url);
                }
            } catch (err) {
                console.error("Acq photo upload failed:", err);
            }
        }
        setAcqForm(prev => ({ ...prev, photos: uploadedUrls }));
        setIsAcqUploading(false);
    };

    const handleAcqRemovePhoto = (index: number) => {
        setAcqForm(prev => ({ ...prev, photos: prev.photos.filter((_, idx) => idx !== index) }));
    };

    const openEdit = (v: Vehicle) => {
        setEditingVehicle(v);
        setForm({
            vin: v.vin,
            make: v.make,
            model: v.model,
            year: v.year.toString(),
            color: v.color,
            price: formatCurrency(v.price),
            cost: formatCurrency(v.cost),
            reconditioningCost: v.reconditioningCost ? formatCurrency(v.reconditioningCost) : '',
            photos: v.photos || [],
            mileage: v.mileage.toString(),
            status: v.status as any,
            notes: v.notes || '',
            type: v.type || 'Car',
            numberPlate: v.numberPlate || ''
        });
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
            reconditioningCost: formatUSDToStore(form.reconditioningCost || '0'),
            photos: form.photos || [],
            mileage: Number(form.mileage) || 0,
            status: form.status,
            notes: form.notes,
            type: form.type,
            numberPlate: (form as any).numberPlate || ''
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
        const recNum = parseFloat(acqForm.reconditioningCost.replace(/[^0-9.-]+/g, '')) || 0;
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
            reconditioningCost: formatUSDToStore(recNum),
            photos: acqForm.photos || [],
            price: formatUSDToStore((agreedNum + recNum) * 1.15), // Default 15% margin markup on total cost
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

    const parsedPrice = parseFloat(String(form.price).replace(/[^0-9.-]+/g, '')) || 0;
    const parsedCost = parseFloat(String(form.cost).replace(/[^0-9.-]+/g, '')) || 0;
    const parsedReconditioning = parseFloat(String(form.reconditioningCost).replace(/[^0-9.-]+/g, '')) || 0;
    const totalInvestment = parsedCost + parsedReconditioning;
    const projectedProfit = parsedPrice - totalInvestment;
    const marginPct = parsedPrice > 0 ? ((projectedProfit / parsedPrice) * 100).toFixed(1) : '0.0';

    const modalForm = (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ width: '560px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                    <FormField label="Mileage (km)" value={form.mileage} onChange={v => setForm({ ...form, mileage: v })} type="number" />
                    <FormField label="Purchase Cost" value={form.cost} onChange={v => setForm({ ...form, cost: v })} placeholder="$80,000" />
                    <FormField label="Reconditioning Cost" value={form.reconditioningCost} onChange={v => setForm({ ...form, reconditioningCost: v })} placeholder="$2,000" />
                    <FormField label="Asking Price" value={form.price} onChange={v => setForm({ ...form, price: v })} placeholder="$95,000" />
                    <div>
                        <label style={labelStyle}>Status</label>
                        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })} style={{ ...inputStyle, height: '45px' }}>
                            <option value="In Stock">In Stock</option>
                            <option value="In Transit">In Transit</option>
                            <option value="Reserved">Reserved</option>
                        </select>
                    </div>
                </div>

                {/* Profit Margin Calculations Panel */}
                <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.85rem 1.1rem',
                    fontSize: '0.8rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Total Cost Investment:</span>
                        <span style={{ fontWeight: 600 }}>${totalInvestment.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Projected Profit:</span>
                        <span style={{ fontWeight: 700, color: projectedProfit >= 0 ? '#10b981' : '#ef4444' }}>
                            {projectedProfit >= 0 ? '+' : ''}${projectedProfit.toLocaleString()}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Margin Rate:</span>
                        <span className={`badge ${projectedProfit >= 0 ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}>
                            {marginPct}%
                        </span>
                    </div>
                </div>

                {/* Multiple Photos Upload Section */}
                <div>
                    <label style={labelStyle}>Vehicle Photos (Stored in Registry)</label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                        {(form.photos || []).map((url, idx) => (
                            <div key={idx} style={{ position: 'relative', width: '56px', height: '56px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                <img src={url} alt={`photo-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button type="button" onClick={() => handleRemovePhoto(idx)}
                                    style={{
                                        position: 'absolute', top: 2, right: 2, width: '16px', height: '16px', borderRadius: '50%',
                                        background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', fontSize: '0.65rem',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                    }}>✕</button>
                            </div>
                        ))}
                        <label style={{
                            width: '56px', height: '56px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', background: 'rgba(255, 255, 255, 0.01)', fontSize: '0.65rem', color: 'var(--text-muted)',
                            transition: 'all 0.2s', userSelect: 'none'
                        }}>
                            {isUploading ? '⏳...' : '➕ Photo'}
                            <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} disabled={isUploading} />
                        </label>
                    </div>
                </div>

                <div>
                    <label style={labelStyle}>Number Plate</label>
                    <input
                        style={{ ...inputStyle, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, fontSize: '0.95rem' }}
                        value={(form as any).numberPlate || ''}
                        onChange={e => setForm({ ...form, numberPlate: e.target.value.toUpperCase() } as any)}
                        placeholder="e.g. UAW 123X"
                    />
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
                <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
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
                    <div className="table-responsive"><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={thStyle}>Photo</th>
                                <th style={thStyle}>VIN / Frame No</th>
                                <th style={thStyle}>Plate No</th>
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
                                    <td style={{ ...tdStyle, padding: '0.5rem 1.25rem' }}>
                                        {car.photos && car.photos.length > 0 ? (
                                            <div
                                                onClick={() => { setGalleryVehicle(car); setActivePhotoIdx(0); }}
                                                style={{
                                                    width: '38px',
                                                    height: '38px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    overflow: 'hidden',
                                                    border: '1px solid var(--border-color)',
                                                    cursor: 'pointer',
                                                    transition: 'transform 0.2s',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                                title="Click to view photo gallery"
                                            >
                                                <img src={car.photos[0]} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        ) : (
                                            <div style={{
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: 'var(--radius-sm)',
                                                border: '1px dashed var(--border-color)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.9rem',
                                                color: 'var(--text-muted)',
                                                background: 'rgba(255,255,255,0.01)',
                                                userSelect: 'none'
                                            }} title="No photos uploaded">
                                                📷
                                            </div>
                                        )}
                                    </td>
                                    <td style={tdStyle}><span style={{ fontFamily: 'monospace', color: 'var(--secondary-accent)', fontSize: '0.8rem' }}>{car.vin}</span></td>
                                    <td style={tdStyle}>
                                        {car.numberPlate ? (
                                            <span style={{
                                                fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem',
                                                background: 'rgba(234,179,8,0.12)', color: '#fbbf24',
                                                border: '1px solid rgba(234,179,8,0.3)',
                                                padding: '0.2rem 0.5rem', borderRadius: '4px',
                                                letterSpacing: '0.08em', whiteSpace: 'nowrap'
                                            }}>{car.numberPlate}</span>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                                        )}
                                    </td>
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
                                    <td style={{ ...tdStyle, verticalAlign: 'middle' }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{car.cost ? formatCurrency(car.cost) : '—'}</div>
                                        {car.reconditioningCost && parseFloat(String(car.reconditioningCost).replace(/[^0-9.-]+/g, '')) > 0 && (
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                                                +{formatCurrency(car.reconditioningCost)} rec
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ ...tdStyle, verticalAlign: 'middle' }}>
                                        <div style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>{formatCurrency(car.price)}</div>
                                        {(() => {
                                            const parsedP = parseFloat(String(car.price).replace(/[^0-9.-]+/g, '')) || 0;
                                            const parsedC = parseFloat(String(car.cost).replace(/[^0-9.-]+/g, '')) || 0;
                                            const parsedR = parseFloat(String(car.reconditioningCost || '0').replace(/[^0-9.-]+/g, '')) || 0;
                                            const totalInv = parsedC + parsedR;
                                            const profit = parsedP - totalInv;
                                            const pct = parsedP > 0 ? ((profit / parsedP) * 100).toFixed(1) : '0.0';
                                            if (totalInv <= 0) return null;
                                            return (
                                                <div style={{ fontSize: '0.72rem', color: profit >= 0 ? '#10b981' : '#ef4444', marginTop: '2px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                                    {profit >= 0 ? '+' : ''}{formatCurrency(profit)} ({pct}%)
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td style={tdStyle}>
                                        <span className={`badge ${car.status === 'In Stock' ? 'badge-success' : car.status === 'In Transit' ? 'badge-info' : car.status === 'Sold' ? 'badge-danger' : 'badge-warning'}`}>
                                            {car.status}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            <button onClick={() => openEdit(car)} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}>✏ Edit</button>
                                            <button
                                                onClick={() => {
                                                    setTransferVehicle(car);
                                                    setTransferBranch('');
                                                    setTransferNotes('');
                                                }}
                                                style={{ color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}
                                                title="Transfer to another branch"
                                            >🔄 Transfer</button>
                                            <button onClick={() => setConfirmDelete(car)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}>🗑</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={11} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No vehicles match the filters.</td></tr>
                            )}
                        </tbody>
                    </table></div>
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

            {/* Transfer Modal */}
            {transferVehicle && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>🔄 Transfer Vehicle</h3>
                                <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {transferVehicle.year} {transferVehicle.make} {transferVehicle.model} &nbsp;·&nbsp;
                                    <span style={{ fontFamily: 'monospace', color: 'var(--secondary-accent)' }}>{transferVehicle.vin}</span>
                                </p>
                            </div>
                            <button onClick={() => setTransferVehicle(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                        </div>

                        {/* From → To */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1rem' }}>
                            <div style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>From</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f87171' }}>🏪 {transferVehicle.branch || 'Unassigned'}</div>
                            </div>
                            <div style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.2)' }}>→</div>
                            <div style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>To</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: transferBranch ? '#34d399' : 'rgba(255,255,255,0.3)' }}>
                                    {transferBranch ? `🏪 ${transferBranch}` : '— select below —'}
                                </div>
                            </div>
                        </div>

                        {/* Destination selector */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Destination Branch</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {branches
                                    .filter(b => b !== transferVehicle.branch)
                                    .map(b => (
                                        <button
                                            key={b}
                                            type="button"
                                            onClick={() => setTransferBranch(b)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                background: transferBranch === b ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                                                border: `1px solid ${transferBranch === b ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
                                                borderRadius: '8px', padding: '0.75rem 1rem', cursor: 'pointer',
                                                color: 'white', fontSize: '0.88rem', fontWeight: transferBranch === b ? 700 : 400,
                                                transition: 'all 0.15s', textAlign: 'left'
                                            }}
                                        >
                                            <span style={{ fontSize: '1rem' }}>{transferBranch === b ? '✅' : '🏪'}</span>
                                            {b}
                                        </button>
                                    ))
                                }
                                {branches.filter(b => b !== transferVehicle.branch).length === 0 && (
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', margin: '0.5rem 0' }}>No other branches available. Add branches in Settings.</p>
                                )}
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Transfer Notes <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                            <textarea
                                placeholder="e.g. Customer request, stock balancing, showroom display..."
                                value={transferNotes}
                                onChange={e => setTransferNotes(e.target.value)}
                                rows={2}
                                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.65rem 0.85rem', color: 'white', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
                            />
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                disabled={!transferBranch || transferring}
                                onClick={async () => {
                                    if (!transferBranch) return;
                                    setTransferring(true);
                                    const timestamp = new Date().toLocaleString();
                                    const transferLog = `[Transfer] ${transferVehicle.branch || 'Unknown'} → ${transferBranch} on ${timestamp}${transferNotes ? `: ${transferNotes}` : ''}`;
                                    const updatedNotes = transferVehicle.notes
                                        ? `${transferVehicle.notes}\n${transferLog}`
                                        : transferLog;
                                    editVehicle(transferVehicle.id, {
                                        branch: transferBranch as any,
                                        status: 'In Transit',
                                        notes: updatedNotes,
                                    });
                                    setTransferring(false);
                                    setTransferVehicle(null);
                                }}
                                style={{
                                    flex: 1,
                                    background: !transferBranch ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    border: 'none', borderRadius: '10px', padding: '0.85rem', color: 'white',
                                    fontWeight: 700, cursor: !transferBranch ? 'not-allowed' : 'pointer', fontSize: '0.88rem',
                                    opacity: !transferBranch ? 0.6 : 1
                                }}
                            >
                                {transferring ? '⏳ Transferring...' : '🔄 Confirm Transfer'}
                            </button>
                            <button
                                onClick={() => setTransferVehicle(null)}
                                style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
                            >
                                Cancel
                            </button>
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
                                        <FormField label={`Agreed Price (${currency.symbol})`} value={acqForm.agreedPrice} onChange={v => setAcqForm({ ...acqForm, agreedPrice: v })} placeholder="e.g. 45000" />
                                        <FormField label={`Reconditioning Cost (${currency.symbol})`} value={acqForm.reconditioningCost} onChange={v => setAcqForm({ ...acqForm, reconditioningCost: v })} placeholder="e.g. 1500" />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                        <div>
                                            <label style={labelStyle}>Payment Method</label>
                                            <select value={acqForm.paymentType} onChange={e => setAcqForm({ ...acqForm, paymentType: e.target.value as any })} style={inputStyle}>
                                                <option value="Bank Transfer">Bank Transfer</option>
                                                <option value="Cash">Cash</option>
                                                <option value="Mobile Money">Mobile Money</option>
                                            </select>
                                        </div>
                                        {!acqForm.isSwap ? (
                                            <div>
                                                <label style={labelStyle}>Payment Option</label>
                                                <select value={acqForm.paymentOption} onChange={e => setAcqForm({ ...acqForm, paymentOption: e.target.value as any })} style={inputStyle}>
                                                    <option value="Full">Full Payment</option>
                                                    <option value="Partial">Partial / Deposit</option>
                                                </select>
                                            </div>
                                        ) : (
                                            <div />
                                        )}
                                    </div>

                                    {!acqForm.isSwap && acqForm.paymentOption === 'Partial' && (
                                        <div style={{ marginTop: '1rem' }}>
                                            <FormField label="Amount Paid Now ($)" value={acqForm.amountPaid} onChange={v => setAcqForm({ ...acqForm, amountPaid: v })} />
                                        </div>
                                    )}

                                    {/* Acquisition Photos Section */}
                                    <div style={{ marginTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                                        <label style={labelStyle}>Vehicle Photos (Stored in Registry)</label>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                                            {(acqForm.photos || []).map((url, idx) => (
                                                <div key={idx} style={{ position: 'relative', width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                                    <img src={url} alt={`photo-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <button type="button" onClick={() => handleAcqRemovePhoto(idx)}
                                                        style={{
                                                            position: 'absolute', top: 1, right: 1, width: '14px', height: '14px', borderRadius: '50%',
                                                            background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', fontSize: '0.55rem',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                                        }}>✕</button>
                                                </div>
                                            ))}
                                            <label style={{
                                                width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', background: 'rgba(255, 255, 255, 0.01)', fontSize: '0.6rem', color: 'var(--text-muted)',
                                                transition: 'all 0.2s', userSelect: 'none'
                                            }}>
                                                {isAcqUploading ? '⏳' : '➕'}
                                                <input type="file" multiple accept="image/*" onChange={handleAcqPhotoUpload} style={{ display: 'none' }} disabled={isAcqUploading} />
                                            </label>
                                        </div>
                                    </div>
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

            {/* Image Gallery Lightbox Modal */}
            {galleryVehicle && galleryVehicle.photos && galleryVehicle.photos.length > 0 && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.95)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    {/* Close Button */}
                    <button onClick={() => { setGalleryVehicle(null); setActivePhotoIdx(0); }} style={{ position: 'absolute', top: '1.5rem', right: '2rem', background: 'none', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer', opacity: 0.8 }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}>✕</button>

                    {/* Main Image & Navigation */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', maxWidth: '90%', maxHeight: '70vh' }}>
                        {/* Prev Button */}
                        <button 
                            disabled={galleryVehicle.photos.length <= 1}
                            onClick={() => setActivePhotoIdx(prev => (prev === 0 ? galleryVehicle.photos!.length - 1 : prev - 1))}
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: 'white', width: '50px', height: '50px', borderRadius: '50%',
                                fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: galleryVehicle.photos.length <= 1 ? 0.3 : 0.8, pointerEvents: galleryVehicle.photos.length <= 1 ? 'none' : 'auto',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        >
                            ‹
                        </button>

                        {/* Main Image */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <img 
                                src={galleryVehicle.photos[activePhotoIdx]} 
                                alt={`${galleryVehicle.make} ${galleryVehicle.model}`} 
                                style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: 'var(--radius-md)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} 
                            />
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                {galleryVehicle.year} {galleryVehicle.make} {galleryVehicle.model} ({activePhotoIdx + 1} of {galleryVehicle.photos.length})
                            </div>
                        </div>

                        {/* Next Button */}
                        <button 
                            disabled={galleryVehicle.photos.length <= 1}
                            onClick={() => setActivePhotoIdx(prev => (prev === galleryVehicle.photos!.length - 1 ? 0 : prev + 1))}
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: 'white', width: '50px', height: '50px', borderRadius: '50%',
                                fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: galleryVehicle.photos.length <= 1 ? 0.3 : 0.8, pointerEvents: galleryVehicle.photos.length <= 1 ? 'none' : 'auto',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        >
                            ›
                        </button>
                    </div>

                    {/* Thumbnails strip at the bottom */}
                    {galleryVehicle.photos.length > 1 && (
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', maxWidth: '80%', overflowX: 'auto', padding: '0.5rem' }}>
                            {galleryVehicle.photos.map((url, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => setActivePhotoIdx(idx)}
                                    style={{
                                        width: '64px',
                                        height: '64px',
                                        borderRadius: 'var(--radius-sm)',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        border: activePhotoIdx === idx ? '2px solid var(--accent)' : '2px solid transparent',
                                        opacity: activePhotoIdx === idx ? 1 : 0.6,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                    onMouseLeave={e => activePhotoIdx !== idx && (e.currentTarget.style.opacity = '0.6')}
                                >
                                    <img src={url} alt={`thumb-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            ))}
                        </div>
                    )}
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
