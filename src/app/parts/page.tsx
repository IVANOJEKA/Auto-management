'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useData, PartItem, PartsSaleItem, PartsPurchaseOrder, PartsPurchaseOrderItem } from '../../context/DataContext';
import { useBranches } from '../../context/BranchContext';
import { useCurrency } from '../../context/CurrencyContext';
import Sidebar from '../../components/Sidebar';
import '../globals.css';
import { usePageGuard } from '../../hooks/usePageGuard';

/*  Label size presets  */
const LABEL_SIZES = [
    { id: '58x40',  label: '58  40 mm',  desc: 'Small thermal (most common)',  w: 220, h: 120, barcodeH: 50  },
    { id: '57x32',  label: '57  32 mm',  desc: 'Receipt-width thermal',         w: 216, h: 96,  barcodeH: 42  },
    { id: '100x50', label: '100  50 mm', desc: 'Medium thermal label',           w: 378, h: 189, barcodeH: 65  },
    { id: '38x25',  label: '38  25 mm',  desc: 'Small sticker',                 w: 144, h: 94,  barcodeH: 38  },
    { id: 'a4',     label: 'A4 Sheet',    desc: 'Multiple labels per page',       w: 190, h: 120, barcodeH: 50  },
] as const;
type LabelSizeId = typeof LABEL_SIZES[number]['id'];

/*  Barcode SVG component  */
function BarcodeSVG({ value, height, width: barW }: { value: string; height: number; width: number }) {
    const svgRef = useRef<SVGSVGElement>(null);
    useEffect(() => {
        if (!svgRef.current || !value) return;
        import('jsbarcode').then(({ default: JsBarcode }) => {
            JsBarcode(svgRef.current, value, {
                format: 'CODE128', width: 2, height, displayValue: false, margin: 0,
            });
        }).catch(() => {});
    }, [value, height]);
    return <svg ref={svgRef} style={{ width: '100%', maxWidth: barW, display: 'block', margin: '0 auto' }} />;
}

/*  Single label card  */
function BarcodeLabel({ part, sizeId, showPrice, showPartNum, showName, fmt }: {
    part: { name: string; partNumber: string; price: number; barcode?: string; brand?: string; location?: string };
    sizeId: LabelSizeId; showPrice: boolean; showPartNum: boolean; showName: boolean;
    fmt: (n: number) => string;
}) {
    const sz = LABEL_SIZES.find(s => s.id === sizeId) || LABEL_SIZES[0];
    const value = part.barcode || part.partNumber;
    return (
        <div className="bc-label" style={{
            background: 'white', color: '#000', padding: '6px 10px',
            borderRadius: '4px', textAlign: 'center',
            width: sz.w, boxSizing: 'border-box', fontFamily: 'sans-serif',
            border: '1px solid #ddd',
        }}>
            {showName && <div style={{ fontSize: '9px', fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px', lineHeight: 1.2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{part.name}</div>}
            <BarcodeSVG value={value} height={sz.barcodeH} width={sz.w - 20} />
            <div style={{ fontSize: '9px', letterSpacing: '0.08em', color: '#222', marginTop: '2px' }}>{value}</div>
            {(showPartNum || showPrice) && (
                <div style={{ fontSize: '8px', color: '#555', marginTop: '1px' }}>
                    {showPartNum && <span>{part.partNumber}</span>}
                    {showPartNum && showPrice && <span>  </span>}
                    {showPrice && <span style={{ fontWeight: 700 }}>{fmt(part.price)}</span>}
                </div>
            )}
        </div>
    );
}

/*  ZPL generator for Zebra thermal printers  */
function generateZPL(value: string, name: string, price: string, partNum: string): string {
    return `^XA
^CF0,28
^FO20,20^FD${name.slice(0, 25)}^FS
^FO20,55^BCN,60,N,N
^FD${value}^FS
^FO20,130^CF0,22^FD${partNum} | ${price}^FS
^XZ`;
}


type Tab = 'pos' | 'inventory' | 'orders' | 'reports' | 'alerts';

const DEFAULT_CATEGORIES = ['Engine', 'Electrical', 'Suspension', 'Body', 'Consumable', 'Other'];
const PAY_METHODS = ['Cash', 'MTN Mobile Money', 'Airtel Money', 'Card', 'Credit'] as const;

/*  Shared styles  */
const card = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '12px',
    padding: '1.25rem 1.5rem',
} as React.CSSProperties;

const inputSt: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', padding: '0.6rem 0.85rem',
    color: 'white', fontSize: '0.85rem', outline: 'none',
};

const selectSt: React.CSSProperties = { ...inputSt, cursor: 'pointer' };
const btnPrimary: React.CSSProperties = {
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    border: 'none', borderRadius: '8px', color: 'white',
    fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
    padding: '0.6rem 1.1rem',
};
const btnGhost: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', color: 'rgba(255,255,255,0.6)',
    fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
    padding: '0.6rem 1.1rem',
};
const thSt: React.CSSProperties = {
    padding: '0.65rem 1rem', textAlign: 'left',
    fontSize: '0.7rem', fontWeight: 700,
    color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
    letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.07)',
    whiteSpace: 'nowrap',
};
const tdSt: React.CSSProperties = {
    padding: '0.75rem 1rem', fontSize: '0.85rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.85)',
};

/*  Main Component  */
export default function PartsPage() {
    const { user, isAuthenticated } = useAuth();
    const { isAllowed } = usePageGuard('parts');
    if (!isAllowed) return null;

    const {
        partsInventory, partsSales, partsPurchaseOrders, suppliers, clients,
        addPartsSale, editPartItem, deletePartItem, adjustPartStock,
        createPartsPurchaseOrder, updatePartsPurchaseOrderStatus, deletePartsPurchaseOrder, receivePO,
        showToast,
    } = useData();
    const { branches } = useBranches();
    const { formatCurrency: fmt } = useCurrency();
    const router = useRouter();

    React.useEffect(() => { if (!isAuthenticated) router.push('/login'); }, [isAuthenticated, router]);
    if (!isAuthenticated || !user) return null;

    const [tab, setTab] = useState<Tab>('pos');

    /* """"""""""""""""""" POS STATE """"""""""""""""""" */
    const [posSearch, setPosSearch] = useState('');
    const [cart, setCart] = useState<(PartsSaleItem & { tempId: string })[]>([]);
    const [discount, setDiscount] = useState(0);
    const [payMethod, setPayMethod] = useState<typeof PAY_METHODS[number]>('Cash');
    const [posCustomer, setPosCustomer] = useState('');
    const [posNotes, setPosNotes] = useState('');
    const [processing, setProcessing] = useState(false);
    const [lastReceipt, setLastReceipt] = useState<any>(null);
    const posSearchRef = useRef<HTMLInputElement>(null);

    const posFiltered = posSearch.length > 0
        ? partsInventory.filter(p =>
            p.name.toLowerCase().includes(posSearch.toLowerCase()) ||
            p.partNumber.toLowerCase().includes(posSearch.toLowerCase()))
        : [];

    const addToCart = (part: PartItem) => {
        if (part.stockQuantity <= 0) { showToast('Out of stock', 'warning'); return; }
        setCart(prev => {
            const ex = prev.find(c => c.partId === part.id);
            if (ex) {
                if (ex.quantity >= part.stockQuantity) { showToast('Max stock reached', 'warning'); return prev; }
                return prev.map(c => c.partId === part.id ? { ...c, quantity: c.quantity + 1, lineTotal: (c.quantity + 1) * c.unitPrice } : c);
            }
            return [...prev, {
                tempId: Date.now().toString(),
                partId: part.id, partNumber: part.partNumber, name: part.name,
                quantity: 1, unitPrice: part.price, unitCost: part.cost, lineTotal: part.price,
            }];
        });
        setPosSearch('');
        posSearchRef.current?.focus();
    };

    const removeFromCart = (tempId: string) => setCart(prev => prev.filter(c => c.tempId !== tempId));
    const updateCartQty = (tempId: string, qty: number) => {
        if (qty <= 0) { removeFromCart(tempId); return; }
        setCart(prev => prev.map(c => c.tempId === tempId ? { ...c, quantity: qty, lineTotal: qty * c.unitPrice } : c));
    };

    const subtotal = cart.reduce((s, c) => s + c.lineTotal, 0);
    const discountAmt = (subtotal * discount) / 100;
    const total = subtotal - discountAmt;

    const completeSale = async () => {
        if (cart.length === 0) { showToast('Cart is empty', 'warning'); return; }
        setProcessing(true);
        const saleNum = `SALE-${new Date().getFullYear()}-${String(partsSales.length + 1).padStart(4, '0')}`;
        const sale = {
            saleNumber: saleNum,
            date: new Date().toISOString(),
            customerName: posCustomer || 'Walk-in Customer',
            items: cart,
            subtotal, discount, total,
            paymentMethod: payMethod,
            notes: posNotes,
            branch: user.branch,
            createdBy: user.name || user.email,
        };
        await addPartsSale(sale, cart);
        setLastReceipt(sale);
        setCart([]); setDiscount(0); setPosCustomer(''); setPosNotes('');
        setProcessing(false);
    };

    const printReceipt = () => window.print();

    /* """"""""""""""""""" INVENTORY STATE """"""""""""""""""" */
    const [invSearch, setInvSearch] = useState('');
    const [invCategory, setInvCategory] = useState('All');
    // Dynamic categories (localStorage-backed)
    const [categories, setCategories] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('parts_categories');
            return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
        } catch { return DEFAULT_CATEGORIES; }
    });
    const saveCategories = (cats: string[]) => {
        setCategories(cats);
        try { localStorage.setItem('parts_categories', JSON.stringify(cats)); } catch {}
    };
    const [showManageCats, setShowManageCats] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [catError, setCatError] = useState('');
    const [editingPart, setEditingPart] = useState<PartItem | null>(null);
    const [showAddPart, setShowAddPart] = useState(false);
    const [confirmDeletePart, setConfirmDeletePart] = useState<PartItem | null>(null);
    const [adjustPart, setAdjustPart] = useState<PartItem | null>(null);
    const [adjustDelta, setAdjustDelta] = useState('');
    const [adjustReason, setAdjustReason] = useState('');

    const emptyPart = { partNumber: '', name: '', description: '', cost: '', price: '', stockQuantity: '', category: 'Engine' as PartItem['category'], brand: '', reorderPoint: '5', location: '', compatibility: '', barcode: '' };
    const [partForm, setPartForm] = useState({ ...emptyPart });

    const filteredParts = partsInventory
        .filter(p => invCategory === 'All' || p.category === invCategory)
        .filter(p => !invSearch || p.name.toLowerCase().includes(invSearch.toLowerCase()) || p.partNumber.toLowerCase().includes(invSearch.toLowerCase()));

    const handleSavePart = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload: Partial<PartItem> = {
            partNumber: partForm.partNumber, name: partForm.name,
            description: partForm.description,
            cost: parseFloat(partForm.cost) || 0,
            price: parseFloat(partForm.price) || 0,
            stockQuantity: parseInt(partForm.stockQuantity) || 0,
            category: partForm.category,
            brand: partForm.brand,
            reorderPoint: parseInt(partForm.reorderPoint) || 5,
            location: partForm.location,
            compatibility: partForm.compatibility,
            barcode: partForm.barcode || partForm.partNumber,
        };
        if (editingPart) {
            await editPartItem(editingPart.id, payload);
            showToast('Part updated', 'success');
            setEditingPart(null);
        } else {
            const res = await fetch('/api/parts', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) { showToast('Part added', 'success'); window.location.reload(); }
            else showToast('Failed to add part', 'danger');
            setShowAddPart(false);
        }
        setPartForm({ ...emptyPart });
    };

    // Barcode label print state
    const [labelPart, setLabelPart] = useState<PartItem | null>(null);
    const [labelQty, setLabelQty] = useState(1);
    const [labelSize, setLabelSize] = useState<LabelSizeId>('58x40');
    const [showPrice, setShowPrice] = useState(true);
    const [showPartNum, setShowPartNum] = useState(true);
    const [showName, setShowName] = useState(true);
    const [printMode, setPrintMode] = useState<'browser' | 'zpl'>('browser');
    const [labelsPerRow, setLabelsPerRow] = useState(3);
    const labelPrintRef = useRef<HTMLDivElement>(null);

    const printLabels = () => {
        if (printMode === 'zpl' && labelPart) {
            const zpl = generateZPL(
                labelPart.barcode || labelPart.partNumber,
                labelPart.name, fmt(labelPart.price), labelPart.partNumber
            );
            const blob = new Blob([zpl], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url;
            a.download = `${labelPart.partNumber}_label.zpl`; a.click();
            URL.revokeObjectURL(url);
            return;
        }
        const sz = LABEL_SIZES.find(s => s.id === labelSize) || LABEL_SIZES[0];
        const labelHTML = labelPrintRef.current?.innerHTML || '';
        const w = window.open('', '_blank', 'width=900,height=700');
        if (!w) return;
        const isA4 = labelSize === 'a4';
        w.document.write(`<!DOCTYPE html><html><head><title>Labels</title><style>
            *{box-sizing:border-box;margin:0;padding:0;}
            body{background:#fff;padding:8mm;}
            .label-sheet{display:flex;flex-wrap:wrap;gap:${isA4 ? '3mm' : '2mm'};}
            .bc-label{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;
                       background:white;border:1px solid #ccc;padding:4px 8px;
                       width:${sz.w}px;font-family:sans-serif;page-break-inside:avoid;}
            .bc-label svg{width:100%;max-width:${sz.w-16}px;display:block;}
            .bc-name{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#111;margin-bottom:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:${sz.w-20}px;}
            .bc-code{font-size:8px;letter-spacing:.08em;color:#222;margin-top:2px;}
            .bc-sub{font-size:7px;color:#555;margin-top:1px;}
            @media print{@page{size:${isA4 ? 'A4' : `${sz.w}px ${sz.h}px`};margin:5mm}body{padding:5mm}.label-sheet{gap:2mm}}
        </style></head><body><div class="label-sheet">${labelHTML}</div>
        <script>window.onload=()=>{window.print();}<\/script></body></html>`);
        w.document.close();
    };

    /* """"""""""""""""""" PO STATE """"""""""""""""""" */
    const [showCreatePO, setShowCreatePO] = useState(false);
    const [viewPO, setViewPO] = useState<PartsPurchaseOrder | null>(null);
    const [poForm, setPoForm] = useState({ supplierId: '', branch: user.branch || 'Main', notes: '' });
    const [poItems, setPoItems] = useState<PartsPurchaseOrderItem[]>([]);
    const [newPoItem, setNewPoItem] = useState({ partNumber: '', name: '', quantity: '1', unitCost: '' });

    const addPoItem = () => {
        if (!newPoItem.partNumber || !newPoItem.name) return;
        setPoItems(prev => [...prev, { partNumber: newPoItem.partNumber, name: newPoItem.name, quantity: parseInt(newPoItem.quantity) || 1, unitCost: parseFloat(newPoItem.unitCost) || 0 }]);
        setNewPoItem({ partNumber: '', name: '', quantity: '1', unitCost: '' });
    };

    const handleCreatePO = async (e: React.FormEvent) => {
        e.preventDefault();
        if (poItems.length === 0) { showToast('Add at least one item', 'warning'); return; }
        const poNum = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
        await createPartsPurchaseOrder({ poNumber: poNum, supplierId: poForm.supplierId, status: 'Ordered', branch: poForm.branch as any, notes: poForm.notes }, poItems);
        showToast('Purchase order created', 'success');
        setShowCreatePO(false); setPoItems([]);
        setPoForm({ supplierId: '', branch: user.branch || 'Main', notes: '' });
    };

    /* """"""""""""""""""" REPORTS """"""""""""""""""" */
    const [reportRange, setReportRange] = useState(30);
    const cutoff = new Date(Date.now() - reportRange * 86400000);
    const recentSales = partsSales.filter(s => new Date(s.date) >= cutoff);
    const totalRevenue = recentSales.reduce((s, sale) => s + sale.total, 0);
    const totalCOGS = recentSales.reduce((s, sale) => s + sale.items.reduce((si, i) => si + i.unitCost * i.quantity, 0), 0);
    const totalProfit = totalRevenue - totalCOGS;
    const totalUnits = recentSales.reduce((s, sale) => s + sale.items.reduce((si, i) => si + i.quantity, 0), 0);

    // Top sellers
    const partSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    recentSales.forEach(sale => {
        sale.items.forEach(item => {
            if (!partSalesMap[item.partNumber]) partSalesMap[item.partNumber] = { name: item.name, qty: 0, revenue: 0 };
            partSalesMap[item.partNumber].qty += item.quantity;
            partSalesMap[item.partNumber].revenue += item.lineTotal;
        });
    });
    const topSellers = Object.entries(partSalesMap).sort((a, b) => b[1].qty - a[1].qty).slice(0, 8);
    const maxQty = topSellers[0]?.[1].qty || 1;

    const stockValue = partsInventory.reduce((s, p) => s + p.cost * p.stockQuantity, 0);
    const retailValue = partsInventory.reduce((s, p) => s + p.price * p.stockQuantity, 0);

    /* """"""""""""""""""" ALERTS """"""""""""""""""" */
    const lowStock = partsInventory.filter(p => p.stockQuantity <= (p.reorderPoint ?? 5));

    /* """"""""""""""""""" KPIs """"""""""""""""""" */
    const kpis = [
        { label: 'Total Parts', value: partsInventory.length, icon: '', color: '#6366f1' },
        { label: 'Low Stock Alerts', value: lowStock.length, icon: '!', color: '#f59e0b' },
        { label: 'Stock Value (Cost)', value: fmt(stockValue), icon: '', color: '#10b981' },
        { label: "Today's Sales", value: fmt(partsSales.filter(s => new Date(s.date).toDateString() === new Date().toDateString()).reduce((sum, s) => sum + s.total, 0)), icon: '', color: '#a78bfa' },
    ];

    /* """"""""""""""""""" TAB BUTTONS """"""""""""""""""" */
    const tabs: { id: Tab; label: string; icon: string }[] = [
        { id: 'pos', label: 'Point of Sale', icon: '' },
        { id: 'inventory', label: 'Inventory', icon: '' },
        { id: 'orders', label: 'Purchase Orders', icon: 'PO' },
        { id: 'reports', label: 'Reports', icon: '' },
        { id: 'alerts', label: `Stock Alerts${lowStock.length > 0 ? ` (${lowStock.length})` : ''}`, icon: '' },
    ];

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <Sidebar />
            <main className="parts-module" style={{ flex: 1, padding: '2rem', overflowX: 'hidden' }}>
                {/* Header */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Spare Parts Business</h1>
                    <p style={{ color: 'var(--text-muted)', margin: '0.3rem 0 0', fontSize: '0.85rem' }}>Full spare parts management  POS, stock, suppliers, reports</p>
                </div>

                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    {kpis.map(k => (
                        <div key={k.label} style={{ ...card, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</span>
                                <span style={{ fontSize: '1.2rem' }}>{k.icon}</span>
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: k.color }}>{k.value}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '0.3rem' }}>
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            flex: 1, padding: '0.6rem 0.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer',
                            fontWeight: tab === t.id ? 700 : 500, fontSize: '0.8rem',
                            background: tab === t.id ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
                            color: tab === t.id ? 'white' : 'rgba(255,255,255,0.5)',
                            transition: 'all 0.15s',
                        }}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                {/* """""""""" POS TAB """""""""" */}
                {tab === 'pos' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem' }}>
                        {/* Left: search + results */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ ...card }}>
                                <input
                                    ref={posSearchRef}
                                    value={posSearch}
                                    onChange={e => setPosSearch(e.target.value)}
                                    placeholder="Search part name or part # to add to cart..."
                                    style={{ ...inputSt, fontSize: '1rem', padding: '0.8rem 1rem' }}
                                    autoFocus
                                />
                                {posFiltered.length > 0 && (
                                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '260px', overflowY: 'auto' }}>
                                        {posFiltered.map(p => (
                                            <button key={p.id} onClick={() => addToCart(p)} style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                background: p.stockQuantity <= 0 ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.04)',
                                                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px',
                                                padding: '0.65rem 1rem', cursor: p.stockQuantity <= 0 ? 'not-allowed' : 'pointer',
                                                color: 'white', textAlign: 'left',
                                            }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{p.name}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.partNumber}  {p.category}{p.brand ? `  ${p.brand}` : ''}</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontWeight: 700, color: '#a78bfa' }}>{fmt(p.price)}</div>
                                                    <div style={{ fontSize: '0.72rem', color: p.stockQuantity <= 0 ? '#f87171' : p.stockQuantity <= (p.reorderPoint ?? 5) ? '#f59e0b' : '#34d399' }}>
                                                        {p.stockQuantity <= 0 ? 'Out of Stock' : `${p.stockQuantity} in stock`}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Sales history mini */}
                            <div style={{ ...card }}>
                                <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Recent Sales</h3>
                                {partsSales.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No sales yet. Start by adding items to the cart.</p>}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                                    {partsSales.slice(0, 15).map(sale => (
                                        <div key={sale.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{sale.saleNumber}</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sale.customerName}  {new Date(sale.date).toLocaleDateString()}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 700, color: '#34d399' }}>{fmt(sale.total)}</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sale.paymentMethod}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right: Cart */}
                        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '1rem', height: 'fit-content', position: 'sticky', top: '1rem' }}>
                            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>Cart</h3>
                            {cart.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '2rem 0' }}>Cart is empty  search for parts above</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
                                    {cart.map(item => (
                                        <div key={item.tempId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{fmt(item.unitPrice)} each</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <button onClick={() => updateCartQty(item.tempId, item.quantity - 1)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', width: '24px', height: '24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}></button>
                                                <span style={{ minWidth: '20px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700 }}>{item.quantity}</span>
                                                <button onClick={() => updateCartQty(item.tempId, item.quantity + 1)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', width: '24px', height: '24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>+</button>
                                            </div>
                                            <div style={{ minWidth: '60px', textAlign: 'right', fontWeight: 700, fontSize: '0.82rem', color: '#a78bfa' }}>{fmt(item.lineTotal)}</div>
                                            <button onClick={() => removeFromCart(item.tempId)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}> x </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Totals */}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    <span>Subtotal</span><span>{fmt(subtotal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Discount %</span>
                                    <input type="number" min="0" max="100" value={discount} onChange={e => setDiscount(Number(e.target.value))} style={{ ...inputSt, width: '70px', padding: '0.3rem 0.5rem', textAlign: 'right' }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', color: '#34d399' }}>
                                    <span>Total</span><span>{fmt(total)}</span>
                                </div>
                            </div>

                            {/* Customer + payment */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <input value={posCustomer} onChange={e => setPosCustomer(e.target.value)} placeholder="Customer name (optional)" style={inputSt} />
                                <select value={payMethod} onChange={e => setPayMethod(e.target.value as any)} style={selectSt}>
                                    {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
                                </select>
                                <input value={posNotes} onChange={e => setPosNotes(e.target.value)} placeholder="Notes..." style={inputSt} />
                            </div>

                            <button onClick={completeSale} disabled={processing || cart.length === 0} style={{ ...btnPrimary, padding: '0.85rem', fontSize: '0.95rem', opacity: cart.length === 0 ? 0.5 : 1 }}>
                                {processing ? ' Processing...' : `S& Complete Sale  ${fmt(total)}`}
                            </button>

                            {lastReceipt && (
                                <button onClick={printReceipt} style={{ ...btnGhost, textAlign: 'center' }}>x Print Last Receipt</button>
                            )}
                        </div>
                    </div>
                )}

                {/* """""""""" INVENTORY TAB """""""""" */}
                {tab === 'inventory' && (
                    <div>
                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            <input value={invSearch} onChange={e => setInvSearch(e.target.value)} placeholder="Search by name or part #..." style={{ ...inputSt, maxWidth: '260px' }} />
                            <select value={invCategory} onChange={e => setInvCategory(e.target.value)} style={{ ...selectSt, width: '160px', flex: 'none' }}>
                                <option value="All">All Categories</option>
                                {categories.map(c => <option key={c}>{c}</option>)}
                            </select>
                            <button onClick={() => setShowManageCats(true)} style={{ ...btnGhost, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>+ Manage Categories</button>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => { setShowAddPart(true); setEditingPart(null); setPartForm({ ...emptyPart }); }} style={btnPrimary}>+ Add Part</button>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        {['Part #', 'Name', 'Brand', 'Category', 'Location', 'Cost', 'Price', 'Margin', 'Stock', 'Reorder At', 'Actions'].map(h => (
                                            <th key={h} style={thSt}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredParts.map(p => {
                                        const margin = p.price > 0 ? (((p.price - p.cost) / p.price) * 100).toFixed(0) : '0';
                                        const isLow = p.stockQuantity <= (p.reorderPoint ?? 5);
                                        return (
                                            <tr key={p.id} style={{ transition: 'background 0.1s' }}>
                                                <td style={{ ...tdSt, fontFamily: 'monospace', color: 'var(--secondary-accent)' }}>{p.partNumber}</td>
                                                <td style={tdSt}>
                                                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                                                    {p.compatibility && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.compatibility}</div>}
                                                </td>
                                                <td style={{ ...tdSt, color: 'var(--text-muted)' }}>{p.brand || ''}</td>
                                                <td style={tdSt}><span style={{ fontSize: '0.72rem', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{p.category}</span></td>
                                                <td style={{ ...tdSt, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.location || ''}</td>
                                                <td style={tdSt}>{fmt(p.cost)}</td>
                                                <td style={{ ...tdSt, fontWeight: 700, color: '#a78bfa' }}>{fmt(p.price)}</td>
                                                <td style={{ ...tdSt, color: '#34d399' }}>{margin}%</td>
                                                <td style={tdSt}>
                                                    <span style={{ fontWeight: 700, color: isLow ? '#f59e0b' : '#34d399' }}>{p.stockQuantity}</span>
                                                    {isLow && <span style={{ marginLeft: '4px', fontSize: '0.7rem' }}>a</span>}
                                                </td>
                                                <td style={{ ...tdSt, color: 'var(--text-muted)' }}>{p.reorderPoint ?? 5}</td>
                                                <td style={tdSt}>
                                                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                                        <button onClick={() => { setEditingPart(p); setPartForm({ partNumber: p.partNumber, name: p.name, description: p.description, cost: String(p.cost), price: String(p.price), stockQuantity: String(p.stockQuantity), category: p.category, brand: p.brand || '', reorderPoint: String(p.reorderPoint ?? 5), location: p.location || '', compatibility: p.compatibility || '', barcode: p.barcode || p.partNumber }); setShowAddPart(true); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>S Edit</button>
                                                        <button onClick={() => { setAdjustPart(p); setAdjustDelta(''); setAdjustReason(''); }} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}> Stock</button>
                                                        <button onClick={() => { setLabelPart(p); setLabelQty(1); }} style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>x Label</button>
                                                        <button onClick={() => setConfirmDeletePart(p)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}>x</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredParts.length === 0 && (
                                        <tr><td colSpan={11} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No parts found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* """""""""" PURCHASE ORDERS TAB """""""""" */}
                {tab === 'orders' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                            <button onClick={() => setShowCreatePO(true)} style={btnPrimary}>+ New Purchase Order</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {partsPurchaseOrders.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>No purchase orders yet.</p>}
                            {partsPurchaseOrders.map(po => {
                                const supplier = suppliers.find(s => s.id === po.supplierId);
                                const statusColor = po.status === 'Received' ? '#34d399' : po.status === 'Cancelled' ? '#f87171' : po.status === 'Ordered' ? '#a78bfa' : '#f59e0b';
                                return (
                                    <div key={po.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{po.poNumber}</div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                                {supplier?.name || 'No supplier'}  {po.branch}  {new Date(po.createdAt).toLocaleDateString()}
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{(po.items || []).length} items  {fmt(po.totalCost)}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: statusColor, background: `${statusColor}18`, padding: '0.25rem 0.6rem', borderRadius: '20px' }}>{po.status}</span>
                                            <button onClick={() => setViewPO(po)} style={btnGhost}>View</button>
                                            {(po.status === 'Ordered' || po.status === 'Partially Received') && (
                                                <button onClick={() => receivePO(po.id)} style={{ ...btnPrimary, background: 'linear-gradient(135deg,#10b981,#059669)' }}>Mark Received</button>
                                            )}
                                            {po.status !== 'Received' && (
                                                <button onClick={() => updatePartsPurchaseOrderStatus(po.id, 'Cancelled')} style={{ ...btnGhost, color: '#f87171' }}>Cancel</button>
                                            )}
                                            <button onClick={() => deletePartsPurchaseOrder(po.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '1rem' }}>x</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* """""""""" REPORTS TAB """""""""" */}
                {tab === 'reports' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Range selector */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {[7, 30, 90].map(d => (
                                <button key={d} onClick={() => setReportRange(d)} style={{ ...d === reportRange ? btnPrimary : btnGhost }}>{d} days</button>
                            ))}
                        </div>

                        {/* Summary cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem' }}>
                            {[
                                { label: 'Revenue', value: fmt(totalRevenue), color: '#6366f1', icon: '' },
                                { label: 'Cost of Goods', value: fmt(totalCOGS), color: '#f87171', icon: '' },
                                { label: 'Gross Profit', value: fmt(totalProfit), color: '#34d399', icon: '' },
                                { label: 'Units Sold', value: totalUnits, color: '#a78bfa', icon: '' },
                                { label: 'Transactions', value: recentSales.length, color: '#f59e0b', icon: '' },
                                { label: 'Margin', value: totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%` : '0%', color: '#10b981', icon: '' },
                            ].map(k => (
                                <div key={k.label} style={{ ...card }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>{k.icon} {k.label}</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: k.color }}>{k.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Top sellers */}
                        <div style={card}>
                            <h3 style={{ margin: '0 0 1rem', fontWeight: 800, fontSize: '0.95rem' }}>x  Top Selling Parts (last {reportRange} days)</h3>
                            {topSellers.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No sales in this period.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {topSellers.map(([pn, info]) => (
                                        <div key={pn}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem', fontSize: '0.82rem' }}>
                                                <span style={{ fontWeight: 600 }}>{info.name} <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{pn}</span></span>
                                                <span style={{ color: '#a78bfa', fontWeight: 700 }}>{info.qty} units  {fmt(info.revenue)}</span>
                                            </div>
                                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${(info.qty / maxQty) * 100}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: '3px', transition: 'width 0.5s' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Stock valuation */}
                        <div style={card}>
                            <h3 style={{ margin: '0 0 1rem', fontWeight: 800, fontSize: '0.95rem' }}>x Stock Valuation</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Cost Value</div><div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f87171' }}>{fmt(stockValue)}</div></div>
                                <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Retail Value</div><div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399' }}>{fmt(retailValue)}</div></div>
                                <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Potential Profit</div><div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#a78bfa' }}>{fmt(retailValue - stockValue)}</div></div>
                            </div>
                        </div>

                        {/* Recently Added Stock */}
                        <div style={card}>
                            <h3 style={{ margin: '0 0 1rem', fontWeight: 800, fontSize: '0.95rem' }}>x " Recently Added to Inventory</h3>
                            {partsInventory.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No parts in inventory yet.</p>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead><tr>{['Part #', 'Name', 'Brand', 'Category', 'Stock', 'Cost', 'Price', 'Value'].map(h => <th key={h} style={thSt}>{h}</th>)}</tr></thead>
                                        <tbody>
                                            {[...partsInventory].reverse().slice(0, 10).map(p => (
                                                <tr key={p.id}>
                                                    <td style={{ ...tdSt, fontFamily: 'monospace', color: 'var(--secondary-accent)' }}>{p.partNumber}</td>
                                                    <td style={{ ...tdSt, fontWeight: 600 }}>
                                                        {p.name}
                                                        {p.compatibility && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.compatibility}</div>}
                                                    </td>
                                                    <td style={{ ...tdSt, color: 'var(--text-muted)' }}>{p.brand || ''}</td>
                                                    <td style={tdSt}><span style={{ fontSize: '0.72rem', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{p.category}</span></td>
                                                    <td style={{ ...tdSt, fontWeight: 700, color: p.stockQuantity <= (p.reorderPoint ?? 5) ? '#f59e0b' : '#34d399' }}>{p.stockQuantity}</td>
                                                    <td style={tdSt}>{fmt(p.cost)}</td>
                                                    <td style={{ ...tdSt, color: '#a78bfa', fontWeight: 700 }}>{fmt(p.price)}</td>
                                                    <td style={{ ...tdSt, fontWeight: 700 }}>{fmt(p.cost * p.stockQuantity)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Payment method breakdown */}
                        <div style={card}>
                            <h3 style={{ margin: '0 0 1rem', fontWeight: 800, fontSize: '0.95rem' }}>x Sales by Payment Method (last {reportRange} days)</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '1rem' }}>
                                {['Cash', 'MTN Mobile Money', 'Airtel Money', 'Card', 'Credit'].map(method => {
                                    const methodSales = recentSales.filter(s => s.paymentMethod === method);
                                    const methodTotal = methodSales.reduce((s, x) => s + x.total, 0);
                                    const icons: Record<string, string> = { 'Cash': '$', 'MTN Mobile Money': 'MTN', 'Airtel Money': 'ATL', 'Card': 'CRD', 'Credit': 'CR' };
                                    return (
                                        <div key={method} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{icons[method]}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{method}</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: methodTotal > 0 ? '#34d399' : 'rgba(255,255,255,0.3)', marginTop: '0.3rem' }}>{fmt(methodTotal)}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{methodSales.length} txn{methodSales.length !== 1 ? 's' : ''}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Sales table */}
                        <div style={card}>
                            <h3 style={{ margin: '0 0 1rem', fontWeight: 800, fontSize: '0.95rem' }}>x Sales History (last {reportRange} days)</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead><tr>{['Sale #', 'Date', 'Customer', 'Items', 'Payment', 'Total'].map(h => <th key={h} style={thSt}>{h}</th>)}</tr></thead>
                                    <tbody>
                                        {recentSales.length === 0 && <tr><td colSpan={6} style={{ ...tdSt, textAlign: 'center' }}>No sales in this period.</td></tr>}
                                        {recentSales.map(s => (
                                            <tr key={s.id}>
                                                <td style={{ ...tdSt, fontFamily: 'monospace', color: 'var(--secondary-accent)' }}>{s.saleNumber}</td>
                                                <td style={tdSt}>{new Date(s.date).toLocaleDateString()}</td>
                                                <td style={tdSt}>{s.customerName}</td>
                                                <td style={{ ...tdSt, color: 'var(--text-muted)' }}>{s.items.length} item{s.items.length !== 1 ? 's' : ''}</td>
                                                <td style={tdSt}>{s.paymentMethod}</td>
                                                <td style={{ ...tdSt, fontWeight: 700, color: '#34d399' }}>{fmt(s.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* """""""""" STOCK ALERTS TAB """""""""" */}
                {tab === 'alerts' && (
                    <div>
                        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>a {lowStock.length} part{lowStock.length !== 1 ? 's' : ''} below reorder point</h3>
                        </div>
                        {lowStock.length === 0 ? (
                            <div style={{ ...card, textAlign: 'center', padding: '4rem' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>S&</div>
                                <p style={{ color: 'var(--text-muted)' }}>All stock levels are healthy!</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead><tr>{['Part #', 'Name', 'Category', 'Current Stock', 'Reorder Point', 'Shortage', 'Selling Price', 'Action'].map(h => <th key={h} style={thSt}>{h}</th>)}</tr></thead>
                                    <tbody>
                                        {lowStock.map(p => {
                                            const reorderPt = p.reorderPoint ?? 5;
                                            const shortage = reorderPt - p.stockQuantity;
                                            return (
                                                <tr key={p.id}>
                                                    <td style={{ ...tdSt, fontFamily: 'monospace', color: 'var(--secondary-accent)' }}>{p.partNumber}</td>
                                                    <td style={{ ...tdSt, fontWeight: 600 }}>{p.name}</td>
                                                    <td style={tdSt}>{p.category}</td>
                                                    <td style={tdSt}>
                                                        <span style={{ fontWeight: 700, color: p.stockQuantity === 0 ? '#f87171' : '#f59e0b' }}>
                                                            {p.stockQuantity === 0 ? 'R Out of Stock' : `a ${p.stockQuantity}`}
                                                        </span>
                                                    </td>
                                                    <td style={{ ...tdSt, color: 'var(--text-muted)' }}>{reorderPt}</td>
                                                    <td style={{ ...tdSt, color: '#f87171', fontWeight: 700 }}>{shortage}</td>
                                                    <td style={tdSt}>{fmt(p.price)}</td>
                                                    <td style={tdSt}>
                                                        <button
                                                            onClick={() => {
                                                                setShowCreatePO(true);
                                                                setPoItems([{ partNumber: p.partNumber, name: p.name, quantity: Math.max(shortage, reorderPt * 2), unitCost: p.cost }]);
                                                                setTab('orders');
                                                            }}
                                                            style={{ ...btnPrimary, fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
                                                        >
                                                            Create PO
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* "" Add/Edit Part Modal "" */}
            {(showAddPart || editingPart) && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontWeight: 800 }}>{editingPart ? 'Edit Part' : 'Add New Part'}</h3>
                            <button onClick={() => { setShowAddPart(false); setEditingPart(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}> x </button>
                        </div>
                        <form onSubmit={handleSavePart} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {[
                                { label: 'Part Number *', key: 'partNumber', placeholder: 'e.g. OEM-123' },
                                { label: 'Name *', key: 'name', placeholder: 'e.g. Oil Filter' },
                                { label: 'Brand', key: 'brand', placeholder: 'e.g. Toyota OEM' },
                                { label: 'Location / Shelf', key: 'location', placeholder: 'e.g. A3-Shelf2' },
                                { label: 'Cost Price', key: 'cost', placeholder: '0.00', type: 'number' },
                                { label: 'Selling Price', key: 'price', placeholder: '0.00', type: 'number' },
                                { label: 'Stock Quantity', key: 'stockQuantity', placeholder: '0', type: 'number' },
                                { label: 'Reorder Alert At', key: 'reorderPoint', placeholder: '5', type: 'number' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</label>
                                    <input
                                        type={f.type || 'text'}
                                        placeholder={f.placeholder}
                                        value={(partForm as any)[f.key]}
                                        onChange={e => setPartForm(p => ({ ...p, [f.key]: e.target.value }))}
                                        required={f.key === 'partNumber' || f.key === 'name'}
                                        style={inputSt}
                                    />
                                </div>
                            ))}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</label>
                                <select value={partForm.category} onChange={e => setPartForm(p => ({ ...p, category: e.target.value }))} style={{ ...selectSt }}>
                                    {categories.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div style={{ gridColumn: '1/-1' }}>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Barcode (Code 128)</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input value={partForm.barcode} onChange={e => setPartForm(p => ({ ...p, barcode: e.target.value }))} placeholder="Scan or type barcode  leave blank to auto-generate from Part #" style={{ ...inputSt, flex: 1 }} />
                                    <button type="button" onClick={() => setPartForm(p => ({ ...p, barcode: p.partNumber || `BC-${Date.now().toString().slice(-8)}` }))} style={{ ...btnGhost, whiteSpace: 'nowrap', fontSize: '0.78rem' }}> Auto-Generate </button>
                                </div>
                                {partForm.barcode && (
                                    <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center' }}>
                                        <BarcodeLabel
                                            part={{ name: partForm.name || 'Part', partNumber: partForm.partNumber, price: parseFloat(partForm.price) || 0, barcode: partForm.barcode }}
                                            sizeId="58x40" showPrice={true} showPartNum={true} showName={true} fmt={fmt}
                                        />
                                    </div>
                                )}
                            </div>
                            <div style={{ gridColumn: '1/-1' }}>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compatibility</label>
                                <input value={partForm.compatibility} onChange={e => setPartForm(p => ({ ...p, compatibility: e.target.value }))} placeholder="e.g. Toyota Vigo 2015-2022" style={inputSt} />
                            </div>
                            <div style={{ gridColumn: '1/-1' }}>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
                                <textarea value={partForm.description} onChange={e => setPartForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description..." rows={2} style={{ ...inputSt, resize: 'vertical' }} />
                            </div>
                            <div style={{ gridColumn: '1/-1', display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button type="submit" style={{ ...btnPrimary, flex: 1, padding: '0.8rem' }}>{editingPart ? 'Save Changes' : 'Add Part'}</button>
                                <button type="button" onClick={() => { setShowAddPart(false); setEditingPart(null); }} style={{ ...btnGhost, flex: 1 }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* "" Stock Adjust Modal "" */}
            {adjustPart && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <h3 style={{ margin: 0, fontWeight: 800 }}> Adjust Stock</h3>
                            <button onClick={() => setAdjustPart(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}> x </button>
                        </div>
                        <div style={{ ...card }}>
                            <div style={{ fontWeight: 700 }}>{adjustPart.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current stock: <strong style={{ color: 'white' }}>{adjustPart.stockQuantity}</strong></div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Adjustment (use  for removal)</label>
                            <input type="number" value={adjustDelta} onChange={e => setAdjustDelta(e.target.value)} placeholder="e.g. +10 or -5" style={inputSt} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Reason</label>
                            <input value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="e.g. Stock count correction, returned items..." style={inputSt} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={async () => { await adjustPartStock(adjustPart.id, Number(adjustDelta), adjustReason); showToast('Stock adjusted', 'success'); setAdjustPart(null); }} disabled={!adjustDelta} style={{ ...btnPrimary, flex: 1, padding: '0.8rem', opacity: !adjustDelta ? 0.5 : 1 }}>Confirm</button>
                            <button onClick={() => setAdjustPart(null)} style={{ ...btnGhost, flex: 1 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* "" Delete Part Confirm Modal "" */}
            {confirmDeletePart && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <h3 style={{ margin: 0, color: 'var(--danger)', fontWeight: 800 }}>a Remove Part?</h3>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>This will permanently remove <strong style={{ color: 'white' }}>{confirmDeletePart.name}</strong> from inventory.</p>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={async () => { await deletePartItem(confirmDeletePart.id); showToast('Part removed', 'success'); setConfirmDeletePart(null); }} style={{ flex: 1, background: 'var(--danger)', border: 'none', color: 'white', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>Yes, Remove</button>
                            <button onClick={() => setConfirmDeletePart(null)} style={{ ...btnGhost, flex: 1 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* "" Create PO Modal "" */}
            {showCreatePO && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '680px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <h3 style={{ margin: 0, fontWeight: 800 }}>New Purchase Order</h3>
                            <button onClick={() => setShowCreatePO(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}> x </button>
                        </div>
                        <form onSubmit={handleCreatePO} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Supplier</label>
                                    <select value={poForm.supplierId} onChange={e => setPoForm(p => ({ ...p, supplierId: e.target.value }))} style={selectSt}>
                                        <option value="">Select Supplier</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Branch</label>
                                    <select value={poForm.branch} onChange={e => setPoForm(p => ({ ...p, branch: e.target.value }))} style={selectSt}>
                                        {branches.map(b => <option key={b}>{b}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Notes</label>
                                <input value={poForm.notes} onChange={e => setPoForm(p => ({ ...p, notes: e.target.value }))} placeholder="Delivery instructions, etc..." style={inputSt} />
                            </div>

                            {/* Items builder */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Order Items</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 80px 100px auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                                    <input value={newPoItem.partNumber} onChange={e => setNewPoItem(p => ({ ...p, partNumber: e.target.value }))} placeholder="Part #" style={inputSt} />
                                    <input value={newPoItem.name} onChange={e => setNewPoItem(p => ({ ...p, name: e.target.value }))} placeholder="Part name" style={inputSt} />
                                    <input type="number" value={newPoItem.quantity} onChange={e => setNewPoItem(p => ({ ...p, quantity: e.target.value }))} placeholder="Qty" style={inputSt} />
                                    <input type="number" value={newPoItem.unitCost} onChange={e => setNewPoItem(p => ({ ...p, unitCost: e.target.value }))} placeholder="Unit cost" style={inputSt} />
                                    <button type="button" onClick={addPoItem} style={{ ...btnPrimary, whiteSpace: 'nowrap' }}>+ Add</button>
                                </div>
                                {poItems.length > 0 && (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead><tr>{['Part #', 'Name', 'Qty', 'Unit Cost', 'Total', ''].map(h => <th key={h} style={thSt}>{h}</th>)}</tr></thead>
                                        <tbody>
                                            {poItems.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td style={{ ...tdSt, fontFamily: 'monospace' }}>{item.partNumber}</td>
                                                    <td style={tdSt}>{item.name}</td>
                                                    <td style={tdSt}>{item.quantity}</td>
                                                    <td style={tdSt}>{fmt(item.unitCost)}</td>
                                                    <td style={{ ...tdSt, fontWeight: 700 }}>{fmt(item.quantity * item.unitCost)}</td>
                                                    <td style={tdSt}><button type="button" onClick={() => setPoItems(p => p.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}> x </button></td>
                                                </tr>
                                            ))}
                                            <tr>
                                                <td colSpan={4} style={{ ...tdSt, textAlign: 'right', fontWeight: 700 }}>Total</td>
                                                <td style={{ ...tdSt, fontWeight: 800, color: '#34d399' }}>{fmt(poItems.reduce((s, i) => s + i.quantity * i.unitCost, 0))}</td>
                                                <td></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button type="submit" style={{ ...btnPrimary, flex: 1, padding: '0.8rem' }}>Create Purchase Order</button>
                                <button type="button" onClick={() => setShowCreatePO(false)} style={{ ...btnGhost, flex: 1 }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* "" View PO Modal "" */}
            {viewPO && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <h3 style={{ margin: 0, fontWeight: 800 }}>PO# {viewPO.poNumber}</h3>
                            <button onClick={() => setViewPO(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}> x </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                            <div><span style={{ color: 'var(--text-muted)' }}>Supplier: </span><strong>{suppliers.find(s => s.id === viewPO.supplierId)?.name || ''}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Branch: </span><strong>{viewPO.branch}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Status: </span><strong>{viewPO.status}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Created: </span><strong>{new Date(viewPO.createdAt).toLocaleDateString()}</strong></div>
                            {viewPO.notes && <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--text-muted)' }}>Notes: </span>{viewPO.notes}</div>}
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr>{['Part #', 'Name', 'Qty', 'Unit Cost', 'Total'].map(h => <th key={h} style={thSt}>{h}</th>)}</tr></thead>
                            <tbody>
                                {(viewPO.items || []).map((item, i) => (
                                    <tr key={i}>
                                        <td style={{ ...tdSt, fontFamily: 'monospace' }}>{item.partNumber}</td>
                                        <td style={tdSt}>{item.name}</td>
                                        <td style={tdSt}>{item.quantity}</td>
                                        <td style={tdSt}>{fmt(item.unitCost)}</td>
                                        <td style={{ ...tdSt, fontWeight: 700 }}>{fmt(item.quantity * item.unitCost)}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <td colSpan={4} style={{ ...tdSt, textAlign: 'right', fontWeight: 700 }}>Total</td>
                                    <td style={{ ...tdSt, fontWeight: 800, color: '#34d399' }}>{fmt(viewPO.totalCost)}</td>
                                </tr>
                            </tbody>
                        </table>
                        <button onClick={() => setViewPO(null)} style={{ ...btnGhost, alignSelf: 'flex-end' }}>Close</button>
                    </div>
                </div>
            )}

            {/* "" Barcode Label Print Modal "" */}
            {labelPart && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '680px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '95vh', overflowY: 'auto' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontWeight: 800 }}>x Barcode Label  {labelPart.name}</h3>
                            <button onClick={() => setLabelPart(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}> x </button>
                        </div>

                        {/* Barcode value editor */}
                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>x Barcode Value</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input value={labelPart.barcode || labelPart.partNumber} onChange={e => setLabelPart(p => p ? { ...p, barcode: e.target.value } : p)} style={{ ...inputSt, flex: 1 }} placeholder="Scan or type barcode..." />
                                <button onClick={() => setLabelPart(p => p ? { ...p, barcode: p.partNumber } : p)} style={{ ...btnGhost, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>a From Part #</button>
                                <button onClick={async () => { await editPartItem(labelPart.id, { barcode: labelPart.barcode }); showToast('Barcode saved', 'success'); }} style={{ ...btnGhost, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>x Save</button>
                            </div>
                        </div>

                        {/* Live preview */}
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem', background: '#fff', borderRadius: '10px' }}>
                            <BarcodeLabel part={labelPart} sizeId={labelSize} showPrice={showPrice} showPartNum={showPartNum} showName={showName} fmt={fmt} />
                        </div>

                        {/* Print settings */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {/* Label size */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>x Label Size / Printer</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    {LABEL_SIZES.map(sz => (
                                        <button key={sz.id} onClick={() => setLabelSize(sz.id)} style={{
                                            background: labelSize === sz.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                                            border: `1px solid ${labelSize === sz.id ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                                            borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: 'pointer',
                                            color: 'white', textAlign: 'left',
                                        }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{sz.label}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sz.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Print options */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>x Output Mode</label>
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        {(['browser', 'zpl'] as const).map(m => (
                                            <button key={m} onClick={() => setPrintMode(m)} style={{
                                                flex: 1, padding: '0.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                                                background: printMode === m ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.06)',
                                                color: 'white',
                                            }}>{m === 'browser' ? 'x Browser Print' : 'a ZPL (Zebra)'}</button>
                                        ))}
                                    </div>
                                    {printMode === 'zpl' && <p style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '0.4rem' }}>Downloads a .zpl file  send to your Zebra / thermal printer via USB or network.</p>}
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>x9 Show on Label</label>
                                    {[{ key: 'name', label: 'Product Name', val: showName, set: setShowName }, { key: 'partnum', label: 'Part Number', val: showPartNum, set: setShowPartNum }, { key: 'price', label: 'Price', val: showPrice, set: setShowPrice }].map(o => (
                                        <label key={o.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.35rem', fontSize: '0.82rem' }}>
                                            <input type="checkbox" checked={o.val} onChange={e => o.set(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#6366f1' }} />
                                            {o.label}
                                        </label>
                                    ))}
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>x Copies to Print</label>
                                    <input type="number" min="1" max="500" value={labelQty} onChange={e => setLabelQty(Math.max(1, parseInt(e.target.value) || 1))} style={{ ...inputSt, width: '100px' }} />
                                </div>

                                {labelSize === 'a4' && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Labels per Row (A4)</label>
                                        <input type="number" min="1" max="6" value={labelsPerRow} onChange={e => setLabelsPerRow(Math.max(1, parseInt(e.target.value) || 3))} style={{ ...inputSt, width: '80px' }} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ZPL preview */}
                        {printMode === 'zpl' && (
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ZPL Code Preview</label>
                                <pre style={{ background: '#000', color: '#0f0', padding: '1rem', borderRadius: '8px', fontSize: '0.75rem', overflowX: 'auto', lineHeight: 1.5 }}>
                                    {generateZPL(labelPart.barcode || labelPart.partNumber, labelPart.name, fmt(labelPart.price), labelPart.partNumber)}
                                </pre>
                            </div>
                        )}

                        {/* Hidden DOM rendered labels for browser print */}
                        <div ref={labelPrintRef} style={{ display: 'none' }}>
                            {Array.from({ length: labelQty }).map((_, i) => (
                                <div key={i} className="bc-label">
                                    {showName && <div className="bc-name">{labelPart.name}</div>}
                                    <div className="bc-code">{labelPart.barcode || labelPart.partNumber}</div>
                                    {(showPartNum || showPrice) && (
                                        <div className="bc-sub">
                                            {showPartNum && labelPart.partNumber}
                                            {showPartNum && showPrice && '  '}
                                            {showPrice && fmt(labelPart.price)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={printLabels} style={{ ...btnPrimary, flex: 1, padding: '0.85rem', fontSize: '0.95rem' }}>
                                {printMode === 'zpl' ? '! Download ZPL File' : `x Print ${labelQty} Label${labelQty !== 1 ? 's' : ''}`}
                            </button>
                            <button onClick={() => setLabelPart(null)} style={{ ...btnGhost, flex: 1 }}>Close</button>
                        </div>

                        {printMode === 'browser' && (
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '-0.5rem' }}>
                                x In the print dialog, set <strong>Paper Size</strong> to match your label size. For thermal printers, select the printer and set the correct media size.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Manage Categories Modal */}
            {showManageCats && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontWeight: 800 }}>Manage Part Categories</h3>
                            <button onClick={() => { setShowManageCats(false); setNewCatName(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>x</button>
                        </div>

                        {/* Add new category */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Add New Category</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    value={newCatName}
                                    onChange={e => { setNewCatName(e.target.value); setCatError(''); }}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            const t = newCatName.trim();
                                            if (!t) { setCatError('Please enter a category name'); return; }
                                            if (categories.includes(t)) { setCatError('Category already exists'); return; }
                                            saveCategories([...categories, t]);
                                            setNewCatName('');
                                            setCatError('');
                                            showToast(`Category "${t}" added`, 'success');
                                        }
                                    }}
                                    placeholder="e.g. Brakes, Cooling System..."
                                    style={{ ...inputSt, flex: 1, borderColor: catError ? 'var(--danger)' : undefined }}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const t = newCatName.trim();
                                        if (!t) { setCatError('Please enter a category name'); return; }
                                        if (categories.includes(t)) { setCatError(`"${t}" already exists`); return; }
                                        saveCategories([...categories, t]);
                                        setNewCatName('');
                                        setCatError('');
                                        showToast(`Category "${t}" added`, 'success');
                                    }}
                                    style={{ ...btnPrimary, whiteSpace: 'nowrap' }}
                                >+ Add</button>
                            </div>
                            {catError && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.3rem' }}>{catError}</p>}
                        </div>

                        {/* Existing categories */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Categories</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '280px', overflowY: 'auto' }}>
                                {categories.map((cat, idx) => (
                                    <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                                        <span style={{ flex: 1, fontSize: '0.88rem' }}>{cat}</span>
                                        {DEFAULT_CATEGORIES.includes(cat) && (
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>default</span>
                                        )}
                                        <button
                                            onClick={() => saveCategories(categories.filter((_, i) => i !== idx))}
                                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.9rem', padding: '2px 6px', borderRadius: '4px' }}
                                            title="Delete category"
                                        >x</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={() => { saveCategories([...DEFAULT_CATEGORIES]); }}
                                style={{ ...btnGhost, flex: 1, fontSize: '0.8rem' }}
                            >Reset to Defaults</button>
                            <button
                                onClick={() => { setShowManageCats(false); setNewCatName(''); }}
                                style={{ ...btnPrimary, flex: 1 }}
                            >Done</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}