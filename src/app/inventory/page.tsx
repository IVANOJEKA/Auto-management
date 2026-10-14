'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useData, PartItem, Vehicle } from '../../context/DataContext';
import { useBranches } from '../../context/BranchContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useBusiness } from '../../context/BusinessContext';
import Sidebar from '../../components/Sidebar';
import '../globals.css';
import { usePageGuard } from '../../hooks/usePageGuard';

// ─── Preset Label Sizes for Barcode Printing ────────────────────────────────
const LABEL_SIZES = [
    { id: '58x40', label: '58 × 40 mm', desc: 'Standard Thermal Label', w: 220, h: 120, barcodeH: 50 },
    { id: '57x32', label: '57 × 32 mm', desc: 'Compact Thermal Label', w: 216, h: 96, barcodeH: 42 },
    { id: '100x50', label: '100 × 50 mm', desc: 'Large Box Label', w: 378, h: 189, barcodeH: 65 },
    { id: '38x25', label: '38 × 25 mm', desc: 'Mini Sticker', w: 144, h: 94, barcodeH: 38 },
    { id: 'a4', label: 'A4 Sheet', desc: 'Multi-label Sheet (24 labels)', w: 190, h: 120, barcodeH: 50 },
] as const;
type LabelSizeId = typeof LABEL_SIZES[number]['id'];

function BarcodeSVG({ value, height, width }: { value: string; height: number; width: number }) {
    const svgRef = useRef<SVGSVGElement>(null);
    useEffect(() => {
        if (!svgRef.current || !value) return;
        import('jsbarcode').then(({ default: JsBarcode }) => {
            JsBarcode(svgRef.current, value, {
                format: 'CODE128',
                width: 2,
                height,
                displayValue: false,
                margin: 0,
            });
        }).catch(() => {});
    }, [value, height]);
    return <svg ref={svgRef} style={{ width: '100%', maxWidth: width, display: 'block', margin: '0 auto' }} />;
}

// ─── Product Auxiliary Types ────────────────────────────────────────────────
export interface ProductVariation {
    id: string;
    name: string;
    values: string[]; // e.g. ["5W-30", "10W-40", "20W-50"] or ["Ceramic", "Semi-Metallic"]
}

export interface ProductUnit {
    id: string;
    name: string;
    shortName: string;
    allowDecimal: boolean;
}

export interface ProductWarranty {
    id: string;
    name: string;
    duration: number;
    durationUnit: 'Days' | 'Months' | 'Years';
    description: string;
}

const DEFAULT_VARIATIONS: ProductVariation[] = [
    { id: 'VAR-1', name: 'Engine Oil Viscosity', values: ['0W-20', '5W-30', '10W-40', '15W-40', '20W-50'] },
    { id: 'VAR-2', name: 'Brake Pad Grade', values: ['Ceramic', 'Semi-Metallic', 'Low-Metallic', 'Organic'] },
    { id: 'VAR-3', name: 'Filter Type', values: ['Standard OEM', 'High Flow Performance', 'Heavy Duty Fleet'] },
    { id: 'VAR-4', name: 'Spark Plug Material', values: ['Copper', 'Platinum', 'Double Platinum', 'Iridium'] },
];

const DEFAULT_UNITS: ProductUnit[] = [
    { id: 'U-1', name: 'Pieces', shortName: 'Pcs', allowDecimal: false },
    { id: 'U-2', name: 'Sets', shortName: 'Set', allowDecimal: false },
    { id: 'U-3', name: 'Liters', shortName: 'L', allowDecimal: true },
    { id: 'U-4', name: 'Boxes', shortName: 'Box', allowDecimal: false },
    { id: 'U-5', name: 'Pairs', shortName: 'Pr', allowDecimal: false },
    { id: 'U-6', name: 'Rolls', shortName: 'Roll', allowDecimal: false },
    { id: 'U-7', name: 'Kilograms', shortName: 'Kg', allowDecimal: true },
];

const DEFAULT_WARRANTIES: ProductWarranty[] = [
    { id: 'W-0', name: 'No Warranty', duration: 0, durationUnit: 'Days', description: 'Consumable / as-is sale' },
    { id: 'W-1', name: 'Shop Guarantee 30 Days', duration: 30, durationUnit: 'Days', description: 'Immediate replacement for defects' },
    { id: 'W-2', name: '6 Months Replacement', duration: 6, durationUnit: 'Months', description: 'Manufacturer defect warranty' },
    { id: 'W-3', name: '1 Year Manufacturer', duration: 1, durationUnit: 'Years', description: 'Official brand warranty covering electrical/mechanical' },
    { id: 'W-4', name: '2 Years Premium Warranty', duration: 2, durationUnit: 'Years', description: 'Full coverage for battery and suspension components' },
];

const DEFAULT_CATEGORIES = ['Engine', 'Brake System', 'Electrical', 'Suspension', 'Body & Trim', 'Transmission', 'Exhaust', 'Consumable', 'Accessories', 'Other'];
const DEFAULT_BRANDS = ['Toyota Genuine', 'Bosch', 'Denso', 'NGK', 'Brembo', 'Mann-Filter', 'Mobil 1', 'Castrol', 'KYB', 'Ferodo', 'Valeo', 'Aisin'];

type ProductTab = 
    | 'list_products' 
    | 'add_product' 
    | 'update_price' 
    | 'print_labels' 
    | 'variations' 
    | 'stock_report' 
    | 'categories' 
    | 'brands' 
    | 'units' 
    | 'warranties' 
    | 'vehicles';

// ─── Main Content Component ─────────────────────────────────────────────────
function InventoryProductsContent() {
    const { user, isAuthenticated } = useAuth();
    const { isAllowed } = usePageGuard('inventory');
    const { 
        partsInventory, vehicles, selectedBranch,
        addPartItem, editPartItem, deletePartItem, adjustPartStock,
        addVehicle, editVehicle, deleteVehicle, exportToCSV, showToast 
    } = useData();
    const { branches } = useBranches();
    const { formatCurrency: fmt, formatUSDToStore } = useCurrency();
    const { business } = useBusiness();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Sync tab with URL query parameter
    const tabParam = (searchParams.get('tab') as ProductTab) || 'list_products';
    const [activeTab, setActiveTab] = useState<ProductTab>(tabParam);
    // When a ?tab= param is set (sidebar navigation), treat as standalone module view
    const isModuleView = !!searchParams.get('tab');

    useEffect(() => {
        const t = searchParams.get('tab') as ProductTab;
        if (t && ['list_products', 'add_product', 'update_price', 'print_labels', 'variations', 'stock_report', 'categories', 'brands', 'units', 'warranties', 'vehicles'].includes(t)) {
            setActiveTab(t);
        }
    }, [searchParams]);

    // Filters and Search
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [brandFilter, setBrandFilter] = useState('All');
    const [stockFilter, setStockFilter] = useState<'All' | 'In Stock' | 'Low Stock' | 'Out of Stock'>('All');
    const [showFilters, setShowFilters] = useState(false);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingPart, setEditingPart] = useState<PartItem | null>(null);
    const [stockAdjustPart, setStockAdjustPart] = useState<PartItem | null>(null);
    const [adjustDelta, setAdjustDelta] = useState('');
    const [adjustReason, setAdjustReason] = useState('Inventory Restock');
    const [confirmDeletePart, setConfirmDeletePart] = useState<PartItem | null>(null);

    // Dynamic Categories & Brands (localStorage backed)
    const [categories, setCategories] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('dms_product_categories');
            if (saved) try { return JSON.parse(saved); } catch {}
        }
        return DEFAULT_CATEGORIES;
    });

    const [brands, setBrands] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('dms_product_brands');
            if (saved) try { return JSON.parse(saved); } catch {}
        }
        return DEFAULT_BRANDS;
    });

    const [variations, setVariations] = useState<ProductVariation[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('dms_product_variations');
            if (saved) try { return JSON.parse(saved); } catch {}
        }
        return DEFAULT_VARIATIONS;
    });

    const [units, setUnits] = useState<ProductUnit[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('dms_product_units');
            if (saved) try { return JSON.parse(saved); } catch {}
        }
        return DEFAULT_UNITS;
    });

    const [warranties, setWarranties] = useState<ProductWarranty[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('dms_product_warranties');
            if (saved) try { return JSON.parse(saved); } catch {}
        }
        return DEFAULT_WARRANTIES;
    });

    useEffect(() => {
        try { localStorage.setItem('dms_product_categories', JSON.stringify(categories)); } catch {}
    }, [categories]);

    useEffect(() => {
        try { localStorage.setItem('dms_product_brands', JSON.stringify(brands)); } catch {}
    }, [brands]);

    useEffect(() => {
        try { localStorage.setItem('dms_product_variations', JSON.stringify(variations)); } catch {}
    }, [variations]);

    useEffect(() => {
        try { localStorage.setItem('dms_product_units', JSON.stringify(units)); } catch {}
    }, [units]);

    useEffect(() => {
        try { localStorage.setItem('dms_product_warranties', JSON.stringify(warranties)); } catch {}
    }, [warranties]);

    // Product Form State
    const emptyProductForm = {
        name: '',
        partNumber: '',
        barcode: '',
        category: 'Engine',
        brand: 'Toyota Genuine',
        cost: '',
        price: '',
        stockQuantity: '',
        reorderPoint: '5',
        location: '',
        compatibility: '',
        description: '',
        unit: 'Pieces',
        productType: 'Single' as 'Single' | 'Variable',
        warrantyId: 'W-1'
    };
    const [productForm, setProductForm] = useState({ ...emptyProductForm });

    // Bulk Price Update State
    const [priceEdits, setPriceEdits] = useState<Record<string, { cost: number; price: number }>>({});

    // Barcode Printing State
    const [labelPart, setLabelPart] = useState<PartItem | null>(null);
    const [labelQty, setLabelQty] = useState(1);
    const [labelSize, setLabelSize] = useState<LabelSizeId>('58x40');
    const [showPriceOnLabel, setShowPriceOnLabel] = useState(true);
    const [showSkuOnLabel, setShowSkuOnLabel] = useState(true);
    const [showNameOnLabel, setShowNameOnLabel] = useState(true);
    const labelPrintRef = useRef<HTMLDivElement>(null);

    // New Category / Brand Inline Forms
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newBrandName, setNewBrandName] = useState('');
    const [newUnitName, setNewUnitName] = useState('');
    const [newUnitShort, setNewUnitShort] = useState('');
    const [newVariationName, setNewVariationName] = useState('');
    const [newVariationValues, setNewVariationValues] = useState('');

    useEffect(() => {
        if (!isAuthenticated) router.push('/login');
    }, [isAuthenticated, router]);

    if (!isAllowed || !isAuthenticated || !user) return null;

    // Filtered Products
    const filteredProducts = (partsInventory || []).filter(item => {
        const s = searchTerm.toLowerCase();
        const matchesSearch = !s || 
            item.name.toLowerCase().includes(s) || 
            item.partNumber.toLowerCase().includes(s) || 
            (item.barcode && item.barcode.toLowerCase().includes(s)) ||
            (item.brand && item.brand.toLowerCase().includes(s));

        const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
        const matchesBrand = brandFilter === 'All' || item.brand === brandFilter;

        let matchesStock = true;
        if (stockFilter === 'In Stock') matchesStock = item.stockQuantity > 0;
        else if (stockFilter === 'Low Stock') matchesStock = item.stockQuantity <= (item.reorderPoint ?? 5) && item.stockQuantity > 0;
        else if (stockFilter === 'Out of Stock') matchesStock = item.stockQuantity <= 0;

        return matchesSearch && matchesCategory && matchesBrand && matchesStock;
    });

    // Low stock items for Stock Alerts tab
    const lowStockItems = (partsInventory || []).filter(p => p.stockQuantity <= (p.reorderPoint ?? 5));
    const totalInventoryValue = (partsInventory || []).reduce((acc, p) => acc + (p.cost * p.stockQuantity), 0);
    const totalRetailPotential = (partsInventory || []).reduce((acc, p) => acc + (p.price * p.stockQuantity), 0);

    // ─── Actions Handlers ───────────────────────────────────────────────────

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload: Omit<PartItem, 'id'> = {
            name: productForm.name.trim(),
            partNumber: productForm.partNumber.trim().toUpperCase(),
            barcode: productForm.barcode.trim() || productForm.partNumber.trim().toUpperCase(),
            category: productForm.category,
            brand: productForm.brand,
            cost: parseFloat(productForm.cost.replace(/[^0-9.-]+/g, '')) || 0,
            price: parseFloat(productForm.price.replace(/[^0-9.-]+/g, '')) || 0,
            stockQuantity: parseInt(productForm.stockQuantity) || 0,
            reorderPoint: parseInt(productForm.reorderPoint) || 5,
            location: productForm.location.trim(),
            compatibility: productForm.compatibility.trim(),
            description: productForm.description.trim()
        };

        if (editingPart) {
            await editPartItem(editingPart.id, payload);
            showToast(`Product "${payload.name}" updated successfully`, 'success');
            setEditingPart(null);
        } else {
            await addPartItem(payload);
        }

        setShowAddModal(false);
        setProductForm({ ...emptyProductForm });
    };

    const handleApplyStockAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stockAdjustPart) return;
        const delta = parseInt(adjustDelta);
        if (isNaN(delta) || delta === 0) {
            showToast('Enter a valid quantity adjustment (e.g. +10 or -5)', 'warning');
            return;
        }
        await adjustPartStock(stockAdjustPart.id, delta, adjustReason);
        showToast(`Stock adjusted by ${delta > 0 ? `+${delta}` : delta} for ${stockAdjustPart.name}`, 'success');
        setStockAdjustPart(null);
        setAdjustDelta('');
    };

    const handleBulkPriceSave = async () => {
        const ids = Object.keys(priceEdits);
        if (ids.length === 0) {
            showToast('No price modifications to save', 'info');
            return;
        }
        for (const id of ids) {
            await editPartItem(id, {
                cost: priceEdits[id].cost,
                price: priceEdits[id].price
            });
        }
        showToast(`Updated pricing for ${ids.length} product(s)`, 'success');
        setPriceEdits({});
    };

    const handlePrintBarcodeModal = (part: PartItem) => {
        setLabelPart(part);
        setLabelQty(1);
    };

    const executePrintLabels = () => {
        if (!labelPrintRef.current) return;
        const content = labelPrintRef.current.innerHTML;
        const w = window.open('', '_blank', 'width=900,height=700');
        if (!w) return;
        w.document.write(`<!DOCTYPE html><html><head><title>Print Product Labels</title><style>
            *{box-sizing:border-box;margin:0;padding:0;}
            body{background:#fff;padding:8mm;font-family:sans-serif;}
            .sheet{display:flex;flex-wrap:wrap;gap:4mm;}
            .label-box{border:1px solid #ddd;padding:6px;border-radius:4px;text-align:center;}
            @media print{@page{margin:4mm;}}
        </style></head><body><div class="sheet">${content}</div>
        <script>window.onload=()=>{window.print();}</script></body></html>`);
        w.document.close();
    };

    // Filter toggle helper
    const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedProductIds(filteredProducts.map(p => p.id));
        } else {
            setSelectedProductIds([]);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
                
                {/* ── Header — context-aware: module view vs unified view ── */}
                {isModuleView ? (
                    // ── Module-specific header (navigated from sidebar) ──
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                                <button
                                    onClick={() => router.push('/inventory')}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                                    Inventory
                                </button>
                                <span style={{ color: 'var(--border-color)' }}>/</span>
                                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    {{
                                        list_products: 'List Products',
                                        add_product: 'Add Product',
                                        update_price: 'Update Price',
                                        print_labels: 'Print Labels',
                                        variations: 'Variations',
                                        stock_report: 'Stock Report',
                                        categories: 'Categories',
                                        brands: 'Brands',
                                        units: 'Units',
                                        warranties: 'Warranties',
                                        vehicles: 'Dealership Vehicles',
                                    }[activeTab]}
                                </span>
                            </div>
                            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                                {{
                                    list_products: 'List Products',
                                    add_product: 'Add Product',
                                    update_price: 'Update Prices',
                                    print_labels: 'Print Labels',
                                    variations: 'Product Variations',
                                    stock_report: 'Stock Alerts & Report',
                                    categories: 'Product Categories',
                                    brands: 'Brands',
                                    units: 'Units of Measure',
                                    warranties: 'Warranty Policies',
                                    vehicles: 'Dealership Vehicles',
                                }[activeTab]}
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0.25rem 0 0' }}>
                                {{
                                    list_products: 'Full spare parts catalog with stock levels and pricing',
                                    add_product: 'Register a new product in the inventory catalog',
                                    update_price: 'Bulk update sell prices across products',
                                    print_labels: 'Generate and print barcode labels for shelf stock',
                                    variations: 'Manage product attribute variations (size, viscosity, grade)',
                                    stock_report: 'Items at or below reorder threshold — restock alerts',
                                    categories: 'Product classification categories',
                                    brands: 'Supplier and product brand registry',
                                    units: 'Units of measure for inventory quantities',
                                    warranties: 'Warranty policies applied to products at point of sale',
                                    vehicles: 'Full dealership vehicle stock and valuation',
                                }[activeTab]}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                            {(activeTab === 'list_products') && (
                                <>
                                    <button className="btn-outline" onClick={() => exportToCSV(filteredProducts as unknown as Record<string, unknown>[], 'products_catalog.csv')}>
                                        Export CSV
                                    </button>
                                    <button className="btn-primary" onClick={() => { setEditingPart(null); setProductForm({ ...emptyProductForm }); setShowAddModal(true); }}>
                                        + Add Product
                                    </button>
                                </>
                            )}
                            {activeTab === 'add_product' && (
                                <button className="btn-primary" onClick={() => { setEditingPart(null); setProductForm({ ...emptyProductForm }); setShowAddModal(true); }}>
                                    + Add Product
                                </button>
                            )}
                        </div>
                    </header>
                ) : (
                    // ── Unified overview header (base /inventory page) ──
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                                Products &amp; Stock Inventory
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0.25rem 0 0' }}>
                                Full spare parts retail catalog, pricing rules, barcode labeling, variations &amp; categories
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                            <button className="btn-outline" onClick={() => exportToCSV(filteredProducts as unknown as Record<string, unknown>[], 'products_catalog.csv')}>
                                Export CSV
                            </button>
                            <button className="btn-outline" onClick={() => setActiveTab('update_price')}>
                                Update Prices
                            </button>
                            <button className="btn-outline" onClick={() => setActiveTab('stock_report')}>
                                Stock Alerts ({lowStockItems.length})
                            </button>
                            <button 
                                className="btn-primary" 
                                onClick={() => {
                                    setEditingPart(null);
                                    setProductForm({ ...emptyProductForm });
                                    setShowAddModal(true);
                                }}
                            >
                                + Add Product
                            </button>
                        </div>
                    </header>
                )}

                {/* ── KPI Row ── */}
                <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
                    <StatCard 
                        label="Total Product Catalog" 
                        value={`${partsInventory.length}`} 
                        sub={`${categories.length} Categories • ${brands.length} Brands`} 
                        color="white" 
                    />
                    <StatCard 
                        label="Stock Alerts / Reorder" 
                        value={`${lowStockItems.length}`} 
                        sub="Items at or below reorder threshold" 
                        color={lowStockItems.length > 0 ? 'var(--warning)' : 'var(--success)'} 
                    />
                    <StatCard 
                        label="Stock Value (Cost)" 
                        value={fmt(totalInventoryValue)} 
                        sub="Total invested warehouse capital" 
                        color="var(--primary)" 
                    />
                    <StatCard 
                        label="Retail Valuation (Sell)" 
                        value={fmt(totalRetailPotential)} 
                        sub={`Potential Gross Margin: ${fmt(Math.max(0, totalRetailPotential - totalInventoryValue))}`} 
                        color="var(--success)" 
                    />
                </div>

                {/* ── Horizontal Navigation Tabs — only shown on unified /inventory view ── */}
                {!isModuleView && <div style={{
                    display: 'flex',
                    gap: '0.35rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '0.35rem',
                    overflowX: 'auto'
                }}>
                    {[
                        { id: 'list_products', label: 'All Products', count: partsInventory.length },
                        { id: 'stock_report', label: 'Stock Alerts & Report', count: lowStockItems.length },
                        { id: 'update_price', label: 'Update Prices' },
                        { id: 'print_labels', label: 'Print Labels' },
                        { id: 'variations', label: 'Variations', count: variations.length },
                        { id: 'categories', label: 'Categories', count: categories.length },
                        { id: 'brands', label: 'Brands', count: brands.length },
                        { id: 'units', label: 'Units', count: units.length },
                        { id: 'warranties', label: 'Warranties', count: warranties.length },
                        { id: 'vehicles', label: 'Dealership Vehicles', count: vehicles.length }
                    ].map(t => {
                        const isActive = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id as ProductTab)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.45rem',
                                    padding: '0.6rem 0.95rem',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: isActive ? 700 : 500,
                                    fontSize: '0.84rem',
                                    whiteSpace: 'nowrap',
                                    background: isActive ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                                    color: isActive ? 'white' : 'var(--text-muted)',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <span>{t.label}</span>
                                {t.count !== undefined && (
                                    <span style={{
                                        fontSize: '0.72rem',
                                        padding: '0.1rem 0.45rem',
                                        borderRadius: '10px',
                                        background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                                        color: isActive ? 'white' : 'var(--text-muted)'
                                    }}>
                                        {t.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>}

                {/* ── TAB 1: ALL PRODUCTS (Matching Image 2 Table) ── */}
                {activeTab === 'list_products' && (
                    <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        
                        {/* Filters Bar & Collapsible */}
                        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <button 
                                        className="btn-outline" 
                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
                                        onClick={() => setShowFilters(f => !f)}
                                    >
                                        {showFilters ? 'Hide Filters ▲' : 'Filter Options ▼'}
                                    </button>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        <span>Show</span>
                                        <select 
                                            value={rowsPerPage} 
                                            onChange={e => setRowsPerPage(Number(e.target.value))}
                                            style={{ ...inputStyle, width: '70px', padding: '0.3rem 0.5rem', height: '32px' }}
                                        >
                                            <option value={10}>10</option>
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                        </select>
                                        <span>entries</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                    <input 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="Search by product name, part # or barcode..."
                                        style={{ ...inputStyle, width: '280px', height: '36px', fontSize: '0.85rem' }}
                                    />
                                    <button 
                                        className="btn-primary" 
                                        style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                        onClick={() => {
                                            setEditingPart(null);
                                            setProductForm({ ...emptyProductForm });
                                            setShowAddModal(true);
                                        }}
                                    >
                                        + Add
                                    </button>
                                </div>
                            </div>

                            {/* Collapsible Filter Panel */}
                            {showFilters && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div>
                                        <label style={labelStyle}>Category</label>
                                        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ ...inputStyle, height: '36px' }}>
                                            <option value="All">All Categories</option>
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Brand</label>
                                        <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} style={{ ...inputStyle, height: '36px' }}>
                                            <option value="All">All Brands</option>
                                            {brands.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Stock Availability</label>
                                        <select value={stockFilter} onChange={e => setStockFilter(e.target.value as any)} style={{ ...inputStyle, height: '36px' }}>
                                            <option value="All">All Stock Levels</option>
                                            <option value="In Stock">In Stock (&gt; 0)</option>
                                            <option value="Low Stock">Low Stock (&le; Alert)</option>
                                            <option value="Out of Stock">Out of Stock (0)</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Product Table (Strictly matched to Image 2) */}
                        <div className="table-responsive">
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ ...thStyle, width: '40px', textAlign: 'center' }}>
                                            <input 
                                                type="checkbox" 
                                                onChange={toggleSelectAll} 
                                                checked={selectedProductIds.length > 0 && selectedProductIds.length === filteredProducts.length} 
                                                style={{ cursor: 'pointer' }}
                                            />
                                        </th>
                                        <th style={{ ...thStyle, width: '50px' }}>Image</th>
                                        <th style={{ ...thStyle, width: '90px' }}>Action</th>
                                        <th style={thStyle}>Product</th>
                                        <th style={thStyle}>Business Location</th>
                                        <th style={thStyle}>Purchase Price</th>
                                        <th style={thStyle}>Selling Price</th>
                                        <th style={thStyle}>Current Stock</th>
                                        <th style={thStyle}>Product Type</th>
                                        <th style={thStyle}>Category</th>
                                        <th style={thStyle}>Brand</th>
                                        <th style={thStyle}>Margin</th>
                                        <th style={thStyle}>SKU / Barcode</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.slice(0, rowsPerPage).map(item => {
                                        const margin = item.price > 0 
                                            ? (((item.price - item.cost) / item.price) * 100).toFixed(0) 
                                            : '0';
                                        const isLow = item.stockQuantity <= (item.reorderPoint ?? 5);
                                        const isOut = item.stockQuantity <= 0;

                                        return (
                                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedProductIds.includes(item.id)}
                                                        onChange={e => {
                                                            setSelectedProductIds(prev => 
                                                                e.target.checked ? [...prev, item.id] : prev.filter(id => id !== item.id)
                                                            );
                                                        }}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                </td>
                                                <td style={tdStyle}>
                                                    <div style={{
                                                        width: '36px', height: '36px', borderRadius: '6px',
                                                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.8rem', color: 'var(--text-muted)'
                                                    }}>
                                                        📦
                                                    </div>
                                                </td>
                                                <td style={tdStyle}>
                                                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                                                        <button 
                                                            className="btn-outline" 
                                                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                                            onClick={() => {
                                                                setEditingPart(item);
                                                                setProductForm({
                                                                    name: item.name,
                                                                    partNumber: item.partNumber,
                                                                    barcode: item.barcode || item.partNumber,
                                                                    category: item.category,
                                                                    brand: item.brand || 'Toyota Genuine',
                                                                    cost: String(item.cost),
                                                                    price: String(item.price),
                                                                    stockQuantity: String(item.stockQuantity),
                                                                    reorderPoint: String(item.reorderPoint ?? 5),
                                                                    location: item.location || '',
                                                                    compatibility: item.compatibility || '',
                                                                    description: item.description || '',
                                                                    unit: 'Pieces',
                                                                    productType: 'Single',
                                                                    warrantyId: 'W-1'
                                                                });
                                                                setShowAddModal(true);
                                                            }}
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>
                                                </td>
                                                <td style={tdStyle}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'white' }}>{item.name}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                        {item.compatibility || item.description || 'Standard OEM replacement'}
                                                    </div>
                                                </td>
                                                <td style={{ ...tdStyle, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                                    {item.location || (selectedBranch !== 'All' ? selectedBranch : 'Kampala Main')}
                                                </td>
                                                <td style={{ ...tdStyle, fontSize: '0.85rem' }}>{fmt(item.cost)}</td>
                                                <td style={{ ...tdStyle, fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>
                                                    {fmt(item.price)}
                                                </td>
                                                <td style={tdStyle}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <span style={{ 
                                                            fontWeight: 700, 
                                                            color: isOut ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)' 
                                                        }}>
                                                            {item.stockQuantity}.00 Pieces
                                                        </span>
                                                        <button 
                                                            onClick={() => { setStockAdjustPart(item); setAdjustDelta(''); }}
                                                            style={{ background: 'none', border: 'none', color: 'var(--secondary-accent)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
                                                        >
                                                            Adjust
                                                        </button>
                                                    </div>
                                                </td>
                                                <td style={tdStyle}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Single</span>
                                                </td>
                                                <td style={tdStyle}>
                                                    <span style={{ fontSize: '0.72rem', background: 'rgba(59,130,246,0.12)', color: '#60a5fa', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                                        {item.category}
                                                    </span>
                                                </td>
                                                <td style={{ ...tdStyle, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                                    {item.brand || 'Generic'}
                                                </td>
                                                <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--success)', fontSize: '0.82rem' }}>
                                                    {margin}%
                                                </td>
                                                <td style={tdStyle}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                            {item.barcode || item.partNumber}
                                                        </span>
                                                        <button 
                                                            onClick={() => handlePrintBarcodeModal(item)}
                                                            className="btn-outline"
                                                            style={{ padding: '0.15rem 0.4rem', fontSize: '0.68rem' }}
                                                            title="Print Barcode Label"
                                                        >
                                                            Label
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {filteredProducts.length === 0 && (
                                        <tr>
                                            <td colSpan={13} style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No products found matching filters. Click &quot;+ Add Product&quot; to register parts into the catalog.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── TAB 2: STOCK ALERTS & REPORT ── */}
                {activeTab === 'stock_report' && (
                    <div className="glass-panel" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Low Stock &amp; Reorder Warning Report</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>
                                    Inventory items at or below safety stock threshold needing supplier purchase orders
                                </p>
                            </div>
                            <button className="btn-primary" onClick={() => router.push('/parts?tab=orders')}>
                                + Create Restock PO
                            </button>
                        </div>

                        <div className="table-responsive">
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={thStyle}>Part Number</th>
                                        <th style={thStyle}>Product Name</th>
                                        <th style={thStyle}>Category</th>
                                        <th style={thStyle}>Brand</th>
                                        <th style={thStyle}>Current Stock</th>
                                        <th style={thStyle}>Reorder Alert At</th>
                                        <th style={thStyle}>Deficit</th>
                                        <th style={thStyle}>Estimated Reorder Cost</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lowStockItems.map(item => {
                                        const deficit = Math.max(0, (item.reorderPoint ?? 5) - item.stockQuantity);
                                        const reorderCost = deficit * item.cost;
                                        return (
                                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>
                                                    {item.partNumber}
                                                </td>
                                                <td style={{ ...tdStyle, fontWeight: 600 }}>{item.name}</td>
                                                <td style={tdStyle}>{item.category}</td>
                                                <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{item.brand || 'OEM'}</td>
                                                <td style={{ ...tdStyle, fontWeight: 800, color: item.stockQuantity <= 0 ? 'var(--danger)' : 'var(--warning)' }}>
                                                    {item.stockQuantity} Pcs
                                                </td>
                                                <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{item.reorderPoint ?? 5} Pcs</td>
                                                <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--danger)' }}>-{deficit} Pcs</td>
                                                <td style={{ ...tdStyle, fontWeight: 700, color: 'white' }}>{fmt(reorderCost)}</td>
                                                <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                    <button 
                                                        className="btn-outline" 
                                                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                                                        onClick={() => { setStockAdjustPart(item); setAdjustDelta(''); }}
                                                    >
                                                        Restock
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {lowStockItems.length === 0 && (
                                        <tr>
                                            <td colSpan={9} style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--success)' }}>
                                                All stock levels are healthy! No inventory is currently below reorder thresholds.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── TAB 3: UPDATE PRICES (Bulk Price Editor) ── */}
                {activeTab === 'update_price' && (
                    <div className="glass-panel" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Bulk Selling &amp; Cost Price Editor</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>Quickly adjust retail price lists and profit margins across products</p>
                            </div>
                            <button 
                                className="btn-primary" 
                                onClick={handleBulkPriceSave}
                                disabled={Object.keys(priceEdits).length === 0}
                            >
                                Save All Modified Prices ({Object.keys(priceEdits).length})
                            </button>
                        </div>

                        <div className="table-responsive">
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={thStyle}>Part #</th>
                                        <th style={thStyle}>Product Name</th>
                                        <th style={thStyle}>Category</th>
                                        <th style={thStyle}>Current Purchase Cost</th>
                                        <th style={thStyle}>Current Selling Price</th>
                                        <th style={thStyle}>New Cost Price</th>
                                        <th style={thStyle}>New Selling Price</th>
                                        <th style={thStyle}>Projected Margin</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {partsInventory.map(item => {
                                        const edited = priceEdits[item.id] || { cost: item.cost, price: item.price };
                                        const margin = edited.price > 0 ? (((edited.price - edited.cost) / edited.price) * 100).toFixed(0) : '0';

                                        return (
                                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600 }}>{item.partNumber}</td>
                                                <td style={{ ...tdStyle, fontWeight: 600 }}>{item.name}</td>
                                                <td style={tdStyle}>{item.category}</td>
                                                <td style={tdStyle}>{fmt(item.cost)}</td>
                                                <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--primary)' }}>{fmt(item.price)}</td>
                                                <td style={tdStyle}>
                                                    <input 
                                                        type="number"
                                                        defaultValue={item.cost}
                                                        onChange={e => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setPriceEdits(prev => ({
                                                                ...prev,
                                                                [item.id]: { ...(prev[item.id] || { price: item.price }), cost: val }
                                                            }));
                                                        }}
                                                        style={{ ...inputStyle, width: '110px', height: '32px', textAlign: 'right' }}
                                                    />
                                                </td>
                                                <td style={tdStyle}>
                                                    <input 
                                                        type="number"
                                                        defaultValue={item.price}
                                                        onChange={e => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setPriceEdits(prev => ({
                                                                ...prev,
                                                                [item.id]: { ...(prev[item.id] || { cost: item.cost }), price: val }
                                                            }));
                                                        }}
                                                        style={{ ...inputStyle, width: '110px', height: '32px', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}
                                                    />
                                                </td>
                                                <td style={{ ...tdStyle, fontWeight: 700, color: Number(margin) > 20 ? 'var(--success)' : 'var(--warning)' }}>
                                                    {margin}%
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── TAB 4: PRINT BARCODE LABELS ── */}
                {activeTab === 'print_labels' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.5rem', alignItems: 'start' }}>
                        
                        {/* Selector Controls */}
                        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Barcode Label Printing Studio</h3>
                            
                            <div>
                                <label style={labelStyle}>Select Product to Print</label>
                                <select 
                                    value={labelPart?.id || ''} 
                                    onChange={e => {
                                        const p = partsInventory.find(x => x.id === e.target.value);
                                        setLabelPart(p || null);
                                    }}
                                    style={{ ...inputStyle, height: '42px' }}
                                >
                                    <option value="">Choose product...</option>
                                    {partsInventory.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.partNumber}) &mdash; {fmt(p.price)}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={labelStyle}>Label Size Preset</label>
                                <select 
                                    value={labelSize} 
                                    onChange={e => setLabelSize(e.target.value as LabelSizeId)}
                                    style={{ ...inputStyle, height: '42px' }}
                                >
                                    {LABEL_SIZES.map(s => <option key={s.id} value={s.id}>{s.label} ({s.desc})</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={labelStyle}>Number of Copies</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="500" 
                                        value={labelQty} 
                                        onChange={e => setLabelQty(Math.max(1, parseInt(e.target.value) || 1))}
                                        style={inputStyle}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', justifyContent: 'center' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        <input type="checkbox" checked={showPriceOnLabel} onChange={e => setShowPriceOnLabel(e.target.checked)} /> Show Price
                                    </label>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        <input type="checkbox" checked={showSkuOnLabel} onChange={e => setShowSkuOnLabel(e.target.checked)} /> Show Part # / SKU
                                    </label>
                                </div>
                            </div>

                            <button 
                                className="btn-primary" 
                                onClick={executePrintLabels}
                                disabled={!labelPart}
                                style={{ padding: '0.85rem', fontWeight: 700 }}
                            >
                                Print {labelQty} Label(s)
                            </button>
                        </div>

                        {/* Live Label Preview */}
                        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Live Label Preview</h4>
                            
                            {labelPart ? (
                                <div ref={labelPrintRef} style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                                    {Array.from({ length: Math.min(labelQty, 12) }).map((_, i) => (
                                        <div 
                                            key={i} 
                                            style={{
                                                background: 'white', color: '#111', padding: '8px 12px',
                                                borderRadius: '4px', textAlign: 'center', width: LABEL_SIZES.find(s => s.id === labelSize)?.w || 220,
                                                border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                fontFamily: 'sans-serif'
                                            }}
                                        >
                                            {showNameOnLabel && (
                                                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {labelPart.name}
                                                </div>
                                            )}
                                            <BarcodeSVG 
                                                value={labelPart.barcode || labelPart.partNumber} 
                                                height={LABEL_SIZES.find(s => s.id === labelSize)?.barcodeH || 50} 
                                                width={(LABEL_SIZES.find(s => s.id === labelSize)?.w || 220) - 20} 
                                            />
                                            <div style={{ fontSize: '9px', fontFamily: 'monospace', letterSpacing: '0.05em', color: '#334155', marginTop: '2px' }}>
                                                {labelPart.barcode || labelPart.partNumber}
                                            </div>
                                            {(showSkuOnLabel || showPriceOnLabel) && (
                                                <div style={{ fontSize: '9px', fontWeight: 700, color: '#0f172a', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                                                    {showSkuOnLabel && <span>{labelPart.partNumber}</span>}
                                                    {showPriceOnLabel && <span style={{ color: '#2563eb' }}>{fmt(labelPart.price)}</span>}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Select a product from the list on the left to preview barcode labels.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── TAB 5: VARIATIONS ── */}
                {activeTab === 'variations' && (
                    <div className="glass-panel" style={{ overflow: 'hidden', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Product Variation Attributes</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>Configure variable product properties like oil viscosity, pad grades, sizes, and fittings</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                            {variations.map(v => (
                                <div key={v.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)' }}>{v.name}</h4>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{v.values.length} values</span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                        {v.values.map(val => (
                                            <span key={val} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                                {val}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Inline Add Variation */}
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <input 
                                value={newVariationName}
                                onChange={e => setNewVariationName(e.target.value)}
                                placeholder="New attribute (e.g. Battery Capacity)..."
                                style={{ ...inputStyle, width: '240px' }}
                            />
                            <input 
                                value={newVariationValues}
                                onChange={e => setNewVariationValues(e.target.value)}
                                placeholder="Values comma-separated (e.g. 45Ah, 60Ah, 75Ah)..."
                                style={{ ...inputStyle, flex: 1, minWidth: '240px' }}
                            />
                            <button 
                                className="btn-primary"
                                onClick={() => {
                                    if (!newVariationName.trim() || !newVariationValues.trim()) return;
                                    const newVar: ProductVariation = {
                                        id: `VAR-${Date.now().toString().slice(-4)}`,
                                        name: newVariationName.trim(),
                                        values: newVariationValues.split(',').map(s => s.trim()).filter(Boolean)
                                    };
                                    setVariations(prev => [...prev, newVar]);
                                    setNewVariationName('');
                                    setNewVariationValues('');
                                    showToast(`Variation "${newVar.name}" created`, 'success');
                                }}
                            >
                                + Add Variation
                            </button>
                        </div>
                    </div>
                )}

                {/* ── TAB 6: CATEGORIES ── */}
                {activeTab === 'categories' && (
                    <div className="glass-panel" style={{ overflow: 'hidden', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Spare Parts Categories</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>Organize your spare parts inventory into searchable shop categories</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <input 
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                                placeholder="Add new category (e.g. Turbochargers, Coolant)..."
                                style={{ ...inputStyle, width: '320px' }}
                            />
                            <button 
                                className="btn-primary"
                                onClick={() => {
                                    if (!newCategoryName.trim()) return;
                                    if (categories.includes(newCategoryName.trim())) {
                                        showToast('Category already exists', 'warning');
                                        return;
                                    }
                                    setCategories(prev => [...prev, newCategoryName.trim()]);
                                    showToast(`Category "${newCategoryName.trim()}" added`, 'success');
                                    setNewCategoryName('');
                                }}
                            >
                                + Add Category
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                            {categories.map(c => {
                                const count = partsInventory.filter(p => p.category === c).length;
                                return (
                                    <div key={c} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{c}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{count} product(s)</div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setCategories(prev => prev.filter(x => x !== c));
                                                showToast(`Category "${c}" removed`, 'info');
                                            }}
                                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem' }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── TAB 7: BRANDS ── */}
                {activeTab === 'brands' && (
                    <div className="glass-panel" style={{ overflow: 'hidden', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Parts Manufacturers &amp; Brands</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>OEM and aftermarket brands stocked in your shop</p>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <input 
                                value={newBrandName}
                                onChange={e => setNewBrandName(e.target.value)}
                                placeholder="Add brand name (e.g. Delphi, NGK, KYB)..."
                                style={{ ...inputStyle, width: '320px' }}
                            />
                            <button 
                                className="btn-primary"
                                onClick={() => {
                                    if (!newBrandName.trim()) return;
                                    if (brands.includes(newBrandName.trim())) {
                                        showToast('Brand already exists', 'warning');
                                        return;
                                    }
                                    setBrands(prev => [...prev, newBrandName.trim()]);
                                    showToast(`Brand "${newBrandName.trim()}" added`, 'success');
                                    setNewBrandName('');
                                }}
                            >
                                + Add Brand
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                            {brands.map(b => {
                                const count = partsInventory.filter(p => p.brand === b).length;
                                return (
                                    <div key={b} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{b}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{count} product(s)</div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setBrands(prev => prev.filter(x => x !== b));
                                                showToast(`Brand "${b}" removed`, 'info');
                                            }}
                                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem' }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── TAB 8: UNITS ── */}
                {activeTab === 'units' && (
                    <div className="glass-panel" style={{ overflow: 'hidden', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Measurement Units</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>Units of sale for parts (Pieces, Sets, Liters, Boxes)</p>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <input 
                                value={newUnitName}
                                onChange={e => setNewUnitName(e.target.value)}
                                placeholder="Unit name (e.g. Gallons, Meters)..."
                                style={{ ...inputStyle, width: '220px' }}
                            />
                            <input 
                                value={newUnitShort}
                                onChange={e => setNewUnitShort(e.target.value)}
                                placeholder="Short symbol (e.g. Gal, m)..."
                                style={{ ...inputStyle, width: '140px' }}
                            />
                            <button 
                                className="btn-primary"
                                onClick={() => {
                                    if (!newUnitName.trim() || !newUnitShort.trim()) return;
                                    setUnits(prev => [...prev, {
                                        id: `U-${Date.now().toString().slice(-4)}`,
                                        name: newUnitName.trim(),
                                        shortName: newUnitShort.trim(),
                                        allowDecimal: true
                                    }]);
                                    setNewUnitName('');
                                    setNewUnitShort('');
                                    showToast('Unit added successfully', 'success');
                                }}
                            >
                                + Add Unit
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                            {units.map(u => (
                                <div key={u.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{u.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Symbol: {u.shortName}</div>
                                    </div>
                                    <button 
                                        onClick={() => setUnits(prev => prev.filter(x => x.id !== u.id))}
                                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem' }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── TAB 9: WARRANTIES ── */}
                {activeTab === 'warranties' && (
                    <div className="glass-panel" style={{ overflow: 'hidden', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Warranty Policies</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>Customer guarantee and return coverage policies assigned to products</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                            {warranties.map(w => (
                                <div key={w.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--primary)' }}>{w.name}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{w.description}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 600 }}>
                                        Duration: {w.duration > 0 ? `${w.duration} ${w.durationUnit}` : 'Immediate / None'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── TAB 10: DEALERSHIP VEHICLES (Fallback for Car Dealers) ── */}
                {activeTab === 'vehicles' && (
                    <div className="glass-panel" style={{ overflow: 'hidden', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Dealership Vehicles &amp; Fleet Inventory</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>VIN tracking, import clearing, and vehicle sales stock</p>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={thStyle}>VIN / Chassis</th>
                                        <th style={thStyle}>Vehicle Model</th>
                                        <th style={thStyle}>Year</th>
                                        <th style={thStyle}>Branch</th>
                                        <th style={thStyle}>Purchase Cost</th>
                                        <th style={thStyle}>Selling Price</th>
                                        <th style={thStyle}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vehicles.map(v => (
                                        <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--primary)' }}>{v.vin}</td>
                                            <td style={{ ...tdStyle, fontWeight: 600 }}>{v.make} {v.model}</td>
                                            <td style={tdStyle}>{v.year}</td>
                                            <td style={tdStyle}>{v.branch || 'Main'}</td>
                                            <td style={tdStyle}>{v.cost}</td>
                                            <td style={{ ...tdStyle, fontWeight: 700, color: 'white' }}>{v.price}</td>
                                            <td style={tdStyle}>
                                                <span className={`badge ${v.status === 'In Stock' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.72rem' }}>
                                                    {v.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}

                                    {vehicles.length === 0 && (
                                        <tr>
                                            <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No dealership vehicles registered in active branch scope.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </main>

            {/* ════════════════════ MODALS ════════════════════ */}

            {/* Modal: Add / Edit Product */}
            {showAddModal && (
                <Modal 
                    title={editingPart ? `Edit Product: ${editingPart.name}` : 'Add New Spare Part / Product'} 
                    onClose={() => setShowAddModal(false)} 
                    wide
                >
                    <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                            <LabelInput label="Product Name" value={productForm.name} onChange={(v: string) => setProductForm({ ...productForm, name: v })} placeholder="e.g. Front Brake Pad Set (Ceramic)" required />
                            <LabelInput label="Part Number / SKU" value={productForm.partNumber} onChange={(v: string) => setProductForm({ ...productForm, partNumber: v })} placeholder="e.g. 04465-33450" required />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Category</label>
                                <select value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })} style={{ ...inputStyle, height: '42px' }}>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Brand / Manufacturer</label>
                                <select value={productForm.brand} onChange={e => setProductForm({ ...productForm, brand: e.target.value })} style={{ ...inputStyle, height: '42px' }}>
                                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <LabelInput label="Barcode" value={productForm.barcode} onChange={(v: string) => setProductForm({ ...productForm, barcode: v })} placeholder="Auto-generated from SKU if empty" />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                            <LabelInput label="Unit Purchase Cost" value={productForm.cost} onChange={(v: string) => setProductForm({ ...productForm, cost: v })} placeholder={fmt(25000)} required />
                            <LabelInput label="Selling Price" value={productForm.price} onChange={(v: string) => setProductForm({ ...productForm, price: v })} placeholder={fmt(45000)} required />
                            <LabelInput label="Initial Stock" value={productForm.stockQuantity} onChange={(v: string) => setProductForm({ ...productForm, stockQuantity: v })} placeholder="10" required />
                            <LabelInput label="Reorder Alert Qty" value={productForm.reorderPoint} onChange={(v: string) => setProductForm({ ...productForm, reorderPoint: v })} placeholder="5" />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <LabelInput label="Shelf / Warehouse Bin Location" value={productForm.location} onChange={(v: string) => setProductForm({ ...productForm, location: v })} placeholder="Shelf B-12 / Drawer 3" />
                            <LabelInput label="Vehicle Compatibility / Fitment" value={productForm.compatibility} onChange={(v: string) => setProductForm({ ...productForm, compatibility: v })} placeholder="Toyota RAV4 2018-2024, Camry" />
                        </div>

                        <div>
                            <label style={labelStyle}>Product Description &amp; Technical Notes</label>
                            <textarea 
                                value={productForm.description}
                                onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                                style={{ ...inputStyle, height: '60px', resize: 'none' }}
                                placeholder="OEM specifications, warranty conditions..."
                            />
                        </div>

                        <button type="submit" className="btn-primary" style={{ padding: '0.9rem', fontSize: '0.95rem', fontWeight: 700 }}>
                            {editingPart ? 'Save Product Changes' : 'Create & Save Product'}
                        </button>
                    </form>
                </Modal>
            )}

            {/* Modal: Quick Stock Adjustment */}
            {stockAdjustPart && (
                <Modal title={`Stock Adjustment: ${stockAdjustPart.name}`} onClose={() => setStockAdjustPart(null)}>
                    <form onSubmit={handleApplyStockAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                            <div>Part #: <strong>{stockAdjustPart.partNumber}</strong></div>
                            <div>Current Quantity: <strong style={{ color: 'var(--primary)' }}>{stockAdjustPart.stockQuantity} Pcs</strong></div>
                        </div>

                        <LabelInput 
                            label="Quantity Delta (use + for Restock, - for Damage/Loss)" 
                            value={adjustDelta} 
                            onChange={(v: string) => setAdjustDelta(v)} 
                            placeholder="+20 or -2" 
                            required 
                        />

                        <div>
                            <label style={labelStyle}>Reason for Adjustment</label>
                            <select value={adjustReason} onChange={e => setAdjustReason(e.target.value)} style={{ ...inputStyle, height: '42px' }}>
                                <option value="Inventory Restock">Inventory Restock (Direct Purchase)</option>
                                <option value="Physical Count Correction">Physical Count Correction</option>
                                <option value="Damaged / Scrapped">Damaged / Scrapped</option>
                                <option value="Internal Workshop Usage">Internal Workshop Usage</option>
                                <option value="Customer Return Restock">Customer Return Restock</option>
                            </select>
                        </div>

                        <button type="submit" className="btn-primary" style={{ padding: '0.85rem', fontWeight: 700 }}>
                            Apply Stock Adjustment
                        </button>
                    </form>
                </Modal>
            )}

            {/* Modal: Single Product Barcode Label Print */}
            {labelPart && (
                <Modal title={`Print Barcode Labels: ${labelPart.name}`} onClose={() => setLabelPart(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', background: '#fff', borderRadius: '6px' }}>
                            <div style={{ textAlign: 'center', width: '220px' }}>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#111', textTransform: 'uppercase', marginBottom: '2px' }}>
                                    {labelPart.name}
                                </div>
                                <BarcodeSVG value={labelPart.barcode || labelPart.partNumber} height={50} width={200} />
                                <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#334155', marginTop: '2px' }}>
                                    {labelPart.barcode || labelPart.partNumber}
                                </div>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#2563eb', marginTop: '2px' }}>
                                    {fmt(labelPart.price)}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label style={labelStyle}>Label Size</label>
                                <select value={labelSize} onChange={e => setLabelSize(e.target.value as LabelSizeId)} style={{ ...inputStyle, height: '40px' }}>
                                    {LABEL_SIZES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                </select>
                            </div>
                            <LabelInput label="Copies" value={String(labelQty)} onChange={(v: string) => setLabelQty(Math.max(1, parseInt(v) || 1))} placeholder="1" />
                        </div>

                        <button className="btn-primary" onClick={executePrintLabels} style={{ padding: '0.85rem', fontWeight: 700 }}>
                            Send to Printer ({labelQty} copies)
                        </button>
                    </div>
                </Modal>
            )}

        </div>
    );
}

// Wrap in Suspense boundary for Next.js App Router
export default function InventoryPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }} />}>
            <InventoryProductsContent />
        </Suspense>
    );
}

// ─── Inline UI Helper Components ─────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0 }}>{label}</p>
            <h3 style={{ fontSize: '1.6rem', margin: 0, fontWeight: 800, color: color || 'white' }}>{value}</h3>
            {sub && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>{sub}</p>}
        </div>
    );
}

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ width: wide ? '660px' : '480px', maxHeight: '92vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>{title}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
                </div>
                {children}
            </div>
        </div>
    );
}

function LabelInput({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
    return (
        <div>
            <label style={labelStyle}>{label}</label>
            <input 
                type="text" 
                value={value} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} 
                placeholder={placeholder} 
                required={required} 
                style={inputStyle} 
            />
        </div>
    );
}

const labelStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' };
const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-color)', padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box' };
const thStyle: React.CSSProperties = { padding: '0.85rem 1.15rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle: React.CSSProperties = { padding: '0.85rem 1.15rem', verticalAlign: 'middle', fontSize: '0.88rem' };
