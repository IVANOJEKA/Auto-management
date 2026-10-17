'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
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

export interface ProductCategory {
    id: string;
    name: string;
    code: string;
    description: string;
    parentCategory?: string;
    status: 'Active' | 'Inactive';
    createdAt?: string;
}

export const DEFAULT_CATEGORY_OBJECTS: ProductCategory[] = [
    { id: 'cat-eng', name: 'Engine', code: 'ENG-01', description: 'Pistons, gaskets, valves, belts, oil pumps & engine blocks', status: 'Active' },
    { id: 'cat-brk', name: 'Brake System', code: 'BRK-02', description: 'Brake pads, discs, master cylinders, calipers & brake fluid', status: 'Active' },
    { id: 'cat-ele', name: 'Electrical', code: 'ELE-03', description: 'Alternators, starters, wiring, relays, fuses & ECU sensors', status: 'Active' },
    { id: 'cat-sus', name: 'Suspension', code: 'SUS-04', description: 'Shock absorbers, struts, control arms, ball joints & bushings', status: 'Active' },
    { id: 'cat-bdy', name: 'Body & Trim', code: 'BDY-05', description: 'Bumpers, fenders, mirrors, door handles, panels & moldings', status: 'Active' },
    { id: 'cat-trn', name: 'Transmission', code: 'TRN-06', description: 'Gearboxes, clutches, flywheels, torque converters & axles', status: 'Active' },
    { id: 'cat-exh', name: 'Exhaust', code: 'EXH-07', description: 'Mufflers, catalytic converters, manifolds & exhaust pipes', status: 'Active' },
    { id: 'cat-cns', name: 'Consumable', code: 'CNS-08', description: 'Engine oils, filters, coolant, wiper blades & lubricants', status: 'Active' },
    { id: 'cat-acc', name: 'Accessories', code: 'ACC-09', description: 'Seat covers, floor mats, lighting, horns & audio add-ons', status: 'Active' },
    { id: 'cat-oth', name: 'Other', code: 'OTH-10', description: 'General and miscellaneous workshop components', status: 'Active' },
];

const DEFAULT_CATEGORIES = DEFAULT_CATEGORY_OBJECTS.map(c => c.name);
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
        addPartItem, addBulkPartItems, editPartItem, deletePartItem, adjustPartStock,
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
    const [categoryItems, setCategoryItems] = useState<ProductCategory[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('dms_product_categories');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        if (typeof parsed[0] === 'string') {
                            return (parsed as string[]).map((name: string, i: number) => {
                                const def = DEFAULT_CATEGORY_OBJECTS.find(d => d.name.toLowerCase() === name.toLowerCase());
                                return def || {
                                    id: `cat-${i + 1}-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                                    name,
                                    code: `${name.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(2, '0')}`,
                                    description: '',
                                    status: 'Active' as const
                                };
                            });
                        } else if (typeof parsed[0] === 'object' && parsed[0]?.name) {
                            return parsed as ProductCategory[];
                        }
                    }
                } catch {}
            }
        }
        return DEFAULT_CATEGORY_OBJECTS;
    });

    // Backwards-compatible category names array for existing dropdowns and bulk tables
    const categories = useMemo(() => categoryItems.map(c => c.name), [categoryItems]);

    // Backwards compatibility updater if setCategories is invoked
    const setCategories = (updater: string[] | ((prev: string[]) => string[])) => {
        setCategoryItems(prevItems => {
            const currentNames = prevItems.map(c => c.name);
            const newNames = typeof updater === 'function' ? updater(currentNames) : updater;
            return newNames.map((name, i) => {
                const existing = prevItems.find(item => item.name.toLowerCase() === name.toLowerCase());
                return existing || {
                    id: `cat-${Date.now()}-${i}`,
                    name,
                    code: `${name.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(2, '0')}`,
                    description: '',
                    status: 'Active' as const
                };
            });
        });
    };

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
        try {
            localStorage.setItem('dms_product_categories', JSON.stringify(categoryItems));
            localStorage.setItem('parts_categories', JSON.stringify(categoryItems.map(c => c.name)));
            localStorage.setItem('dms_product_category_names', JSON.stringify(categoryItems.map(c => c.name)));
        } catch {}
    }, [categoryItems]);

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

    // ─── Bulk Multi-Product Entry & CSV Import State ───────────────────────────
    interface BulkRow {
        id: string;
        name: string;
        partNumber: string;
        category: string;
        brand: string;
        cost: string;
        price: string;
        stockQuantity: string;
        reorderPoint: string;
        location: string;
        compatibility: string;
    }

    const createInitialBulkRow = (idx: number = 0): BulkRow => ({
        id: `row-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        name: '',
        partNumber: '',
        category: categories[0] || 'Engine',
        brand: brands[0] || 'Toyota Genuine',
        cost: '',
        price: '',
        stockQuantity: '10',
        reorderPoint: '5',
        location: '',
        compatibility: ''
    });

    const [productEntryMode, setProductEntryMode] = useState<'single' | 'bulk_grid' | 'csv_import'>('single');
    const [bulkRows, setBulkRows] = useState<BulkRow[]>([
        createInitialBulkRow(1),
        createInitialBulkRow(2),
        createInitialBulkRow(3),
        createInitialBulkRow(4)
    ]);
    const [bulkSaving, setBulkSaving] = useState(false);
    const [csvInputText, setCsvInputText] = useState('');
    const [csvPreviewRows, setCsvPreviewRows] = useState<Omit<PartItem, 'id'>[]>([]);
    const [csvError, setCsvError] = useState<string | null>(null);

    const addBulkRow = () => {
        setBulkRows(prev => [...prev, createInitialBulkRow(prev.length + 1)]);
    };

    const add5BulkRows = () => {
        setBulkRows(prev => [
            ...prev,
            createInitialBulkRow(prev.length + 1),
            createInitialBulkRow(prev.length + 2),
            createInitialBulkRow(prev.length + 3),
            createInitialBulkRow(prev.length + 4),
            createInitialBulkRow(prev.length + 5)
        ]);
    };

    const removeBulkRow = (id: string) => {
        setBulkRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
    };

    const duplicateBulkRow = (id: string) => {
        setBulkRows(prev => {
            const target = prev.find(r => r.id === id);
            if (!target) return prev;
            const copy: BulkRow = {
                ...target,
                id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                partNumber: target.partNumber ? `${target.partNumber}-COPY` : ''
            };
            return [...prev, copy];
        });
    };

    const updateBulkRow = (id: string, field: keyof BulkRow, value: string) => {
        setBulkRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const clearBulkRows = () => {
        setBulkRows([
            createInitialBulkRow(1),
            createInitialBulkRow(2),
            createInitialBulkRow(3),
            createInitialBulkRow(4)
        ]);
    };

    const handleSaveBulkRows = async () => {
        const validRows = bulkRows.filter(r => r.name.trim().length > 0);
        if (validRows.length === 0) {
            showToast('Please enter at least one product with a Name to save.', 'warning');
            return;
        }

        setBulkSaving(true);
        try {
            const payload: Omit<PartItem, 'id'>[] = validRows.map((r, idx) => {
                const sku = r.partNumber.trim() ? r.partNumber.trim().toUpperCase() : `SKU-${Date.now().toString().slice(-4)}-${idx + 1}`;
                return {
                    name: r.name.trim(),
                    partNumber: sku,
                    barcode: sku,
                    category: r.category || 'General',
                    brand: r.brand || 'OEM',
                    cost: parseFloat(r.cost.replace(/[^0-9.-]+/g, '')) || 0,
                    price: parseFloat(r.price.replace(/[^0-9.-]+/g, '')) || 0,
                    stockQuantity: parseInt(r.stockQuantity) || 0,
                    reorderPoint: parseInt(r.reorderPoint) || 5,
                    location: r.location.trim(),
                    compatibility: r.compatibility.trim(),
                    description: `Bulk added on ${new Date().toLocaleDateString()}`
                };
            });

            await addBulkPartItems(payload);
            clearBulkRows();
            setShowAddModal(false);
            if (activeTab === 'add_product') {
                router.push('/inventory?tab=list_products');
            }
        } catch (err: any) {
            showToast(`Bulk save error: ${err?.message || 'unknown'}`, 'danger');
        } finally {
            setBulkSaving(false);
        }
    };

    const downloadCsvTemplate = () => {
        const headers = ['name', 'partNumber', 'category', 'brand', 'cost', 'price', 'stockQuantity', 'reorderPoint', 'location', 'compatibility', 'description'];
        const sampleRows = [
            ['Oil Filter (Spin-on)', 'OF-90915-10001', 'Engine', 'Toyota Genuine', '15000', '35000', '25', '5', 'Shelf A-1', 'Toyota Vitz, Corolla, Premio', 'High quality OEM filter'],
            ['Ceramic Front Brake Pads', 'BP-04465-33450', 'Brake System', 'Brembo', '95000', '180000', '15', '3', 'Shelf B-3', 'Toyota RAV4 2019-2024, Camry', 'Low dust ceramic formulation'],
            ['Spark Plug Iridium IX', 'SP-BKR6EIX-11', 'Electrical', 'NGK', '25000', '50000', '40', '10', 'Bin E-4', 'Universal Japanese Vehicles', 'Single electrode iridium plug']
        ];
        const csvContent = [headers.join(','), ...sampleRows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'garisphere_bulk_products_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const parseCsvString = (text: string) => {
        setCsvError(null);
        if (!text.trim()) {
            setCsvPreviewRows([]);
            return;
        }
        try {
            const lines = text.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
            if (lines.length <= 1) {
                setCsvError('CSV must include a header row and at least one data row.');
                setCsvPreviewRows([]);
                return;
            }
            const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
            const nameIdx = headers.findIndex(h => h.includes('name'));
            const partNumIdx = headers.findIndex(h => h.includes('part') || h.includes('sku') || h.includes('number'));
            const catIdx = headers.findIndex(h => h.includes('cat'));
            const brandIdx = headers.findIndex(h => h.includes('brand'));
            const costIdx = headers.findIndex(h => h.includes('cost'));
            const priceIdx = headers.findIndex(h => h.includes('price'));
            const stockIdx = headers.findIndex(h => h.includes('stock') || h.includes('qty') || h.includes('quantity'));
            const locIdx = headers.findIndex(h => h.includes('loc') || h.includes('bin') || h.includes('shelf'));
            const compIdx = headers.findIndex(h => h.includes('compat') || h.includes('fitment'));
            const descIdx = headers.findIndex(h => h.includes('desc'));

            if (nameIdx === -1 && partNumIdx === -1) {
                setCsvError('Could not find "name" or "partNumber/SKU" column in header row.');
                return;
            }

            const parsed: Omit<PartItem, 'id'>[] = [];
            for (let i = 1; i < lines.length; i++) {
                const rowValues = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
                const clean = (val: string | undefined) => (val || '').trim().replace(/^["']|["']$/g, '').trim();
                const name = clean(rowValues[nameIdx]);
                const partNumber = clean(rowValues[partNumIdx]) || `SKU-${Date.now().toString().slice(-4)}-${i}`;
                if (!name) continue;

                parsed.push({
                    name,
                    partNumber: partNumber.toUpperCase(),
                    barcode: partNumber.toUpperCase(),
                    category: catIdx !== -1 ? clean(rowValues[catIdx]) || 'General' : 'General',
                    brand: brandIdx !== -1 ? clean(rowValues[brandIdx]) || 'OEM' : 'OEM',
                    cost: costIdx !== -1 ? parseFloat(clean(rowValues[costIdx]).replace(/[^0-9.-]+/g, '')) || 0 : 0,
                    price: priceIdx !== -1 ? parseFloat(clean(rowValues[priceIdx]).replace(/[^0-9.-]+/g, '')) || 0 : 0,
                    stockQuantity: stockIdx !== -1 ? parseInt(clean(rowValues[stockIdx])) || 0 : 0,
                    reorderPoint: 5,
                    location: locIdx !== -1 ? clean(rowValues[locIdx]) : '',
                    compatibility: compIdx !== -1 ? clean(rowValues[compIdx]) : '',
                    description: descIdx !== -1 ? clean(rowValues[descIdx]) : ''
                });
            }
            if (parsed.length === 0) {
                setCsvError('No valid product rows could be parsed from CSV text.');
            } else {
                setCsvPreviewRows(parsed);
            }
        } catch (err: any) {
            setCsvError(`CSV Parse failed: ${err.message}`);
        }
    };

    const handleImportParsedCsv = async () => {
        if (csvPreviewRows.length === 0) {
            showToast('No parsed products to import', 'warning');
            return;
        }
        setBulkSaving(true);
        try {
            await addBulkPartItems(csvPreviewRows);
            setCsvInputText('');
            setCsvPreviewRows([]);
            setShowAddModal(false);
            if (activeTab === 'add_product') {
                router.push('/inventory?tab=list_products');
            }
        } catch (err: any) {
            showToast(`Import error: ${err.message}`, 'danger');
        } finally {
            setBulkSaving(false);
        }
    };

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

    // New Category / Brand Inline Forms & Management State
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryCode, setNewCategoryCode] = useState('');
    const [categorySearch, setCategorySearch] = useState('');
    const [categoryStatusFilter, setCategoryStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
    const [categoryViewMode, setCategoryViewMode] = useState<'table' | 'grid'>('table');
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
    const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<ProductCategory | null>(null);
    const [categoryDeleteTarget, setCategoryDeleteTarget] = useState<string>('Other');
    const [categoryForm, setCategoryForm] = useState<{
        name: string;
        code: string;
        description: string;
        parentCategory: string;
        status: 'Active' | 'Inactive';
    }>({
        name: '',
        code: '',
        description: '',
        parentCategory: '',
        status: 'Active'
    });

    const [newBrandName, setNewBrandName] = useState('');
    const [newUnitName, setNewUnitName] = useState('');
    const [newUnitShort, setNewUnitShort] = useState('');
    const [newVariationName, setNewVariationName] = useState('');
    const [newVariationValues, setNewVariationValues] = useState('');

    // ── Category Handlers ──────────────────────────────────────────────────
    const handleOpenAddCategory = () => {
        setEditingCategory(null);
        setCategoryForm({
            name: '',
            code: `CAT-${String(categoryItems.length + 1).padStart(2, '0')}`,
            description: '',
            parentCategory: '',
            status: 'Active'
        });
        setShowAddCategoryModal(true);
    };

    const handleOpenEditCategory = (cat: ProductCategory) => {
        setEditingCategory(cat);
        setCategoryForm({
            name: cat.name,
            code: cat.code,
            description: cat.description || '',
            parentCategory: cat.parentCategory || '',
            status: cat.status || 'Active'
        });
        setShowAddCategoryModal(true);
    };

    const handleSaveCategoryModal = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmedName = categoryForm.name.trim();
        if (!trimmedName) {
            showToast('Please enter a category name', 'warning');
            return;
        }

        const duplicate = categoryItems.find(c => 
            c.name.toLowerCase() === trimmedName.toLowerCase() && 
            (!editingCategory || c.id !== editingCategory.id)
        );
        if (duplicate) {
            showToast(`A category named "${trimmedName}" already exists`, 'warning');
            return;
        }

        const generatedCode = categoryForm.code.trim() || 
            `${trimmedName.slice(0, 3).toUpperCase()}-${String(categoryItems.length + 1).padStart(2, '0')}`;

        if (editingCategory) {
            const oldName = editingCategory.name;
            const updatedItems = categoryItems.map(c => 
                c.id === editingCategory.id 
                    ? {
                        ...c,
                        name: trimmedName,
                        code: generatedCode,
                        description: categoryForm.description.trim(),
                        parentCategory: categoryForm.parentCategory || undefined,
                        status: categoryForm.status
                    }
                    : c
            );
            setCategoryItems(updatedItems);

            if (oldName !== trimmedName) {
                const affectedParts = partsInventory.filter(p => p.category === oldName);
                if (affectedParts.length > 0) {
                    affectedParts.forEach(p => {
                        editPartItem(p.id, { category: trimmedName });
                    });
                    showToast(`Updated category "${trimmedName}" and re-tagged ${affectedParts.length} products`, 'success');
                } else {
                    showToast(`Category "${trimmedName}" updated successfully`, 'success');
                }
            } else {
                showToast(`Category "${trimmedName}" updated successfully`, 'success');
            }
        } else {
            const newCat: ProductCategory = {
                id: `cat-${Date.now()}`,
                name: trimmedName,
                code: generatedCode,
                description: categoryForm.description.trim(),
                parentCategory: categoryForm.parentCategory || undefined,
                status: categoryForm.status,
                createdAt: new Date().toISOString()
            };
            setCategoryItems(prev => [...prev, newCat]);
            showToast(`Category "${trimmedName}" created successfully`, 'success');
            setProductForm(prev => ({ ...prev, category: trimmedName }));
        }

        setShowAddCategoryModal(false);
        setEditingCategory(null);
    };

    const handleQuickAddCategory = () => {
        const trimmed = newCategoryName.trim();
        if (!trimmed) {
            showToast('Please enter a category name', 'warning');
            return;
        }
        if (categoryItems.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
            showToast(`Category "${trimmed}" already exists`, 'warning');
            return;
        }
        const code = newCategoryCode.trim() || 
            `${trimmed.slice(0, 3).toUpperCase()}-${String(categoryItems.length + 1).padStart(2, '0')}`;
        const newCat: ProductCategory = {
            id: `cat-${Date.now()}`,
            name: trimmed,
            code,
            description: '',
            status: 'Active',
            createdAt: new Date().toISOString()
        };
        setCategoryItems(prev => [...prev, newCat]);
        setNewCategoryName('');
        setNewCategoryCode('');
        showToast(`Category "${trimmed}" added successfully`, 'success');
    };

    const handleRequestDeleteCategory = (cat: ProductCategory) => {
        const fallback = categoryItems.find(c => c.id !== cat.id && c.name === 'Other')?.name || 
            categoryItems.find(c => c.id !== cat.id)?.name || 'General';
        setCategoryDeleteTarget(fallback);
        setConfirmDeleteCategory(cat);
    };

    const handleConfirmDeleteCategory = () => {
        if (!confirmDeleteCategory) return;
        const cat = confirmDeleteCategory;
        const affected = partsInventory.filter(p => p.category === cat.name);
        if (affected.length > 0) {
            affected.forEach(p => {
                editPartItem(p.id, { category: categoryDeleteTarget });
            });
            showToast(`Category "${cat.name}" removed. ${affected.length} products reassigned to "${categoryDeleteTarget}".`, 'info');
        } else {
            showToast(`Category "${cat.name}" removed`, 'info');
        }
        setCategoryItems(prev => prev.filter(c => c.id !== cat.id));
        setConfirmDeleteCategory(null);
    };

    const handleViewCategoryProducts = (categoryName: string) => {
        setCategoryFilter(categoryName);
        setActiveTab('list_products');
        showToast(`Filtered catalog to "${categoryName}"`, 'info');
    };

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

    // Filtered Category Items for Tab 6
    const filteredCategoryItems = useMemo(() => {
        return categoryItems.filter(cat => {
            const matchesSearch = !categorySearch.trim() ||
                cat.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
                cat.code.toLowerCase().includes(categorySearch.toLowerCase()) ||
                cat.description.toLowerCase().includes(categorySearch.toLowerCase());
            const matchesStatus = categoryStatusFilter === 'All' || cat.status === categoryStatusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [categoryItems, categorySearch, categoryStatusFilter]);

    // Category Analytics
    const categoryStats = useMemo(() => {
        const totalCats = categoryItems.length;
        const activeCats = categoryItems.filter(c => c.status === 'Active').length;
        const totalCategorizedParts = partsInventory.filter(p => !!p.category).length;
        
        let topCat = '—';
        let topCount = 0;
        let highestValuationCat = '—';
        let highestValuation = 0;

        categoryItems.forEach(c => {
            const partsInCat = partsInventory.filter(p => p.category === c.name);
            const cnt = partsInCat.length;
            const val = partsInCat.reduce((sum, p) => sum + (p.price * p.stockQuantity), 0);

            if (cnt > topCount) {
                topCount = cnt;
                topCat = `${c.name} (${cnt})`;
            }
            if (val > highestValuation) {
                highestValuation = val;
                highestValuationCat = `${c.name} (${fmt(val)})`;
            }
        });

        return { totalCats, activeCats, totalCategorizedParts, topCat, highestValuationCat };
    }, [categoryItems, partsInventory, fmt]);

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
                            {activeTab === 'categories' && (
                                <>
                                    <button className="btn-outline" onClick={() => exportToCSV(categoryItems as unknown as Record<string, unknown>[], 'spare_parts_categories.csv')}>
                                        Export CSV
                                    </button>
                                    <button className="btn-primary" onClick={handleOpenAddCategory}>
                                        + Add Category
                                    </button>
                                </>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* ── Top Header & Action Controls ── */}
                        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800, letterSpacing: '-0.01em' }}>
                                    Spare Parts Categories
                                </h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0.25rem 0 0' }}>
                                    Standardized hierarchy for inventory classification, search indexing, and POS fast-pick
                                </p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                                {/* View Switcher */}
                                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.2rem', border: '1px solid var(--border-color)' }}>
                                    <button
                                        type="button"
                                        onClick={() => setCategoryViewMode('table')}
                                        style={{
                                            border: 'none',
                                            borderRadius: '6px',
                                            padding: '0.35rem 0.75rem',
                                            fontSize: '0.78rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            background: categoryViewMode === 'table' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                                            color: categoryViewMode === 'table' ? 'white' : 'var(--text-muted)',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        📋 Table View
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCategoryViewMode('grid')}
                                        style={{
                                            border: 'none',
                                            borderRadius: '6px',
                                            padding: '0.35rem 0.75rem',
                                            fontSize: '0.78rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            background: categoryViewMode === 'grid' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                                            color: categoryViewMode === 'grid' ? 'white' : 'var(--text-muted)',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        ⊞ Grid View
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    className="btn-outline"
                                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
                                    onClick={() => exportToCSV(categoryItems as unknown as Record<string, unknown>[], 'spare_parts_categories.csv')}
                                >
                                    Export CSV
                                </button>

                                <button
                                    type="button"
                                    className="btn-primary"
                                    style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                                    onClick={handleOpenAddCategory}
                                >
                                    + Add Category
                                </button>
                            </div>
                        </div>

                        {/* ── KPI Row for Categories ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <StatCard
                                label="Total Categories"
                                value={`${categoryStats.totalCats}`}
                                sub="Classification groups"
                                color="white"
                            />
                            <StatCard
                                label="Active Categories"
                                value={`${categoryStats.activeCats}`}
                                sub="Visible in forms & POS"
                                color="var(--success)"
                            />
                            <StatCard
                                label="Categorized Products"
                                value={`${categoryStats.totalCategorizedParts}`}
                                sub={`Out of ${partsInventory.length} total catalogued`}
                                color="var(--primary)"
                            />
                            <StatCard
                                label="Top Category by Stock"
                                value={categoryStats.topCat}
                                sub={`Valuation: ${categoryStats.highestValuationCat}`}
                                color="#a855f7"
                            />
                        </div>

                        {/* ── Quick Add Bar ── */}
                        <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    ⚡ Quick Add Category
                                </span>
                                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                    Press Enter or click &quot;+ Quick Add&quot; to save immediately
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleQuickAddCategory();
                                        }
                                    }}
                                    placeholder="Category Name (e.g. Turbochargers, Coolant, Bearings)..."
                                    style={{ ...inputStyle, flex: '1 1 240px', height: '38px', fontSize: '0.85rem' }}
                                />
                                <input
                                    type="text"
                                    value={newCategoryCode}
                                    onChange={e => setNewCategoryCode(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleQuickAddCategory();
                                        }
                                    }}
                                    placeholder="Code (e.g. TRB-01)"
                                    style={{ ...inputStyle, width: '130px', height: '38px', fontSize: '0.85rem', fontFamily: 'monospace' }}
                                />
                                <button
                                    type="button"
                                    className="btn-primary"
                                    style={{ height: '38px', padding: '0 1.25rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                    onClick={handleQuickAddCategory}
                                >
                                    + Quick Add
                                </button>
                            </div>
                        </div>

                        {/* ── Search & Filter Controls ── */}
                        <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: '1 1 280px', maxWidth: '450px' }}>
                                <input
                                    type="text"
                                    value={categorySearch}
                                    onChange={e => setCategorySearch(e.target.value)}
                                    placeholder="Search categories by name, code, description..."
                                    style={{ ...inputStyle, height: '36px', fontSize: '0.84rem' }}
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    <span>Status:</span>
                                    <select
                                        value={categoryStatusFilter}
                                        onChange={e => setCategoryStatusFilter(e.target.value as 'All' | 'Active' | 'Inactive')}
                                        style={{ ...inputStyle, width: '120px', height: '34px', padding: '0.2rem 0.5rem', fontSize: '0.82rem' }}
                                    >
                                        <option value="All">All Statuses</option>
                                        <option value="Active">Active Only</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>

                                {(categorySearch || categoryStatusFilter !== 'All') && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCategorySearch('');
                                            setCategoryStatusFilter('All');
                                        }}
                                        style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                        Reset Filters
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ── Main Data View (Table or Grid) ── */}
                        {filteredCategoryItems.length === 0 ? (
                            <div className="glass-panel" style={{ padding: '3.5rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ fontSize: '2.5rem', opacity: 0.6 }}>📁</div>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>No Categories Found</h4>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, maxWidth: '400px' }}>
                                    {categorySearch ? `No categories match "${categorySearch}". Try a different keyword or clear your filter.` : 'No categories configured yet. Create your first category above.'}
                                </p>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    style={{ marginTop: '0.5rem', padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                                    onClick={handleOpenAddCategory}
                                >
                                    + Create Category
                                </button>
                            </div>
                        ) : categoryViewMode === 'table' ? (
                            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                                <div className="table-responsive">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                                                <th style={{ ...thStyle, width: '40px' }}>#</th>
                                                <th style={{ ...thStyle, width: '110px' }}>Code</th>
                                                <th style={thStyle}>Category Name</th>
                                                <th style={thStyle}>Description</th>
                                                <th style={{ ...thStyle, textAlign: 'center' }}>Products</th>
                                                <th style={{ ...thStyle, textAlign: 'right' }}>Stock Valuation</th>
                                                <th style={{ ...thStyle, textAlign: 'center', width: '100px' }}>Status</th>
                                                <th style={{ ...thStyle, textAlign: 'right', minWidth: '220px' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredCategoryItems.map((cat, idx) => {
                                                const catProducts = partsInventory.filter(p => p.category === cat.name);
                                                const productCount = catProducts.length;
                                                const catValuation = catProducts.reduce((sum, p) => sum + (p.price * p.stockQuantity), 0);
                                                const isDefault = DEFAULT_CATEGORY_OBJECTS.some(d => d.name.toLowerCase() === cat.name.toLowerCase());

                                                return (
                                                    <tr 
                                                        key={cat.id || cat.name}
                                                        style={{ 
                                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                            background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                                                            transition: 'background 0.15s ease'
                                                        }}
                                                    >
                                                        <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                                            {idx + 1}
                                                        </td>
                                                        <td style={tdStyle}>
                                                            <span style={{
                                                                fontFamily: 'monospace',
                                                                fontSize: '0.78rem',
                                                                fontWeight: 700,
                                                                padding: '0.2rem 0.55rem',
                                                                borderRadius: '4px',
                                                                background: 'rgba(59,130,246,0.12)',
                                                                color: '#60a5fa',
                                                                border: '1px solid rgba(59,130,246,0.25)'
                                                            }}>
                                                                {cat.code}
                                                            </span>
                                                        </td>
                                                        <td style={tdStyle}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                                                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'white' }}>
                                                                    {cat.name}
                                                                </span>
                                                                {isDefault && (
                                                                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                                                                        System
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.82rem', maxWidth: '320px' }}>
                                                            {cat.description ? (
                                                                <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                                    {cat.description}
                                                                </span>
                                                            ) : (
                                                                <span style={{ opacity: 0.4 }}>—</span>
                                                            )}
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleViewCategoryProducts(cat.name)}
                                                                title={`View all ${productCount} products in ${cat.name}`}
                                                                style={{
                                                                    background: productCount > 0 ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.04)',
                                                                    border: productCount > 0 ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.08)',
                                                                    borderRadius: '20px',
                                                                    padding: '0.25rem 0.75rem',
                                                                    fontSize: '0.78rem',
                                                                    fontWeight: 600,
                                                                    color: productCount > 0 ? '#60a5fa' : 'var(--text-muted)',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.15s ease',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.35rem'
                                                                }}
                                                            >
                                                                <span>📦 {productCount} item{productCount === 1 ? '' : 's'}</span>
                                                                <span style={{ fontSize: '0.7rem' }}>↗</span>
                                                            </button>
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontSize: '0.88rem' }}>
                                                            <span style={{ color: catValuation > 0 ? 'white' : 'var(--text-muted)' }}>
                                                                {fmt(catValuation)}
                                                            </span>
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                            <span style={{
                                                                padding: '0.2rem 0.6rem',
                                                                borderRadius: '12px',
                                                                fontSize: '0.72rem',
                                                                fontWeight: 600,
                                                                background: cat.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)',
                                                                color: cat.status === 'Active' ? '#34d399' : '#94a3b8',
                                                                border: cat.status === 'Active' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(148,163,184,0.3)'
                                                            }}>
                                                                {cat.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                            <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleViewCategoryProducts(cat.name)}
                                                                    className="btn-outline"
                                                                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                                                                    title="Filter inventory catalog by this category"
                                                                >
                                                                    View Products
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOpenEditCategory(cat)}
                                                                    className="btn-outline"
                                                                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                                                                    title="Edit category details and code"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRequestDeleteCategory(cat)}
                                                                    style={{
                                                                        background: 'none',
                                                                        border: '1px solid rgba(239,68,68,0.25)',
                                                                        color: '#f87171',
                                                                        padding: '0.3rem 0.65rem',
                                                                        borderRadius: 'var(--radius-sm)',
                                                                        fontSize: '0.75rem',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                    title="Delete this category"
                                                                >
                                                                    Delete
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
                        ) : (
                            /* ── Visual Grid View ── */
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                {filteredCategoryItems.map(cat => {
                                    const catProducts = partsInventory.filter(p => p.category === cat.name);
                                    const productCount = catProducts.length;
                                    const catValuation = catProducts.reduce((sum, p) => sum + (p.price * p.stockQuantity), 0);

                                    return (
                                        <div
                                            key={cat.id || cat.name}
                                            className="glass-panel"
                                            style={{
                                                padding: '1.25rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.85rem',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '10px',
                                                position: 'relative',
                                                transition: 'transform 0.15s ease, border-color 0.15s ease'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <span style={{
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    padding: '0.15rem 0.5rem',
                                                    borderRadius: '4px',
                                                    background: 'rgba(59,130,246,0.12)',
                                                    color: '#60a5fa',
                                                    border: '1px solid rgba(59,130,246,0.25)'
                                                }}>
                                                    {cat.code}
                                                </span>
                                                <span style={{
                                                    padding: '0.15rem 0.5rem',
                                                    borderRadius: '10px',
                                                    fontSize: '0.68rem',
                                                    fontWeight: 600,
                                                    background: cat.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)',
                                                    color: cat.status === 'Active' ? '#34d399' : '#94a3b8'
                                                }}>
                                                    {cat.status}
                                                </span>
                                            </div>

                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>
                                                    {cat.name}
                                                </h4>
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.35rem 0 0', minHeight: '34px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {cat.description || 'No detailed description specified.'}
                                                </p>
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.65rem', background: 'rgba(255,255,255,0.02)', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ flex: 1 }}>
                                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Products</span>
                                                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: productCount > 0 ? '#60a5fa' : 'var(--text-muted)' }}>
                                                        {productCount} items
                                                    </span>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Valuation</span>
                                                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: catValuation > 0 ? 'white' : 'var(--text-muted)' }}>
                                                        {fmt(catValuation)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleViewCategoryProducts(cat.name)}
                                                    style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                                >
                                                    View Products ↗
                                                </button>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditCategory(cat)}
                                                        className="btn-outline"
                                                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRequestDeleteCategory(cat)}
                                                        style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.85rem', cursor: 'pointer', padding: '0.25rem' }}
                                                        title="Delete category"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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

                {/* ── TAB 11: ADD PRODUCT / BULK INGESTION WORKSPACE ── */}
                {activeTab === 'add_product' && (
                    <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Mode Selector Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800 }}>Product Catalog Registration</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0.25rem 0 0' }}>
                                    Register spare parts individually, add multiple items in a spreadsheet grid, or import via CSV
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.03)', padding: '0.35rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <button
                                    type="button"
                                    onClick={() => setProductEntryMode('single')}
                                    style={{
                                        padding: '0.55rem 1rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                        fontWeight: productEntryMode === 'single' ? 700 : 500, fontSize: '0.84rem',
                                        background: productEntryMode === 'single' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                                        color: productEntryMode === 'single' ? 'white' : 'var(--text-muted)'
                                    }}
                                >
                                    📦 Single Product
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setProductEntryMode('bulk_grid')}
                                    style={{
                                        padding: '0.55rem 1rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                        fontWeight: productEntryMode === 'bulk_grid' ? 700 : 500, fontSize: '0.84rem',
                                        background: productEntryMode === 'bulk_grid' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                                        color: productEntryMode === 'bulk_grid' ? 'white' : 'var(--text-muted)'
                                    }}
                                >
                                    📋 Bulk Products Grid
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setProductEntryMode('csv_import')}
                                    style={{
                                        padding: '0.55rem 1rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                        fontWeight: productEntryMode === 'csv_import' ? 700 : 500, fontSize: '0.84rem',
                                        background: productEntryMode === 'csv_import' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                                        color: productEntryMode === 'csv_import' ? 'white' : 'var(--text-muted)'
                                    }}
                                >
                                    📄 CSV / Excel Import
                                </button>
                            </div>
                        </div>

                        {/* Mode 1: Single Product Form */}
                        {productEntryMode === 'single' && (
                            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '850px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                                    <LabelInput label="Product Name" value={productForm.name} onChange={(v: string) => setProductForm({ ...productForm, name: v })} placeholder="e.g. Front Brake Pad Set (Ceramic)" required />
                                    <LabelInput label="Part Number / SKU" value={productForm.partNumber} onChange={(v: string) => setProductForm({ ...productForm, partNumber: v })} placeholder="e.g. 04465-33450" required />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <label style={labelStyle}>Category</label>
                                            <button 
                                                type="button" 
                                                onClick={handleOpenAddCategory}
                                                style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '0.74rem', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                                            >
                                                + New Category
                                            </button>
                                        </div>
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
                                        style={{ ...inputStyle, height: '70px', resize: 'none' }}
                                        placeholder="OEM specifications, warranty conditions..."
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button type="submit" className="btn-primary" style={{ padding: '0.9rem 2rem', fontSize: '0.95rem', fontWeight: 700 }}>
                                        Create &amp; Save Product
                                    </button>
                                    <button type="button" className="btn-outline" onClick={() => setProductForm({ ...emptyProductForm })}>
                                        Reset Form
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Mode 2: Bulk Multi-Product Grid */}
                        {productEntryMode === 'bulk_grid' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            Fill in multiple products below. Part Number / SKU is auto-generated if left empty.
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button type="button" className="btn-outline" onClick={addBulkRow} style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}>
                                            + Add 1 Row
                                        </button>
                                        <button type="button" className="btn-outline" onClick={add5BulkRows} style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}>
                                            + Add 5 Rows
                                        </button>
                                        <button type="button" className="btn-outline" onClick={clearBulkRows} style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', color: '#f87171' }}>
                                            Clear All
                                        </button>
                                    </div>
                                </div>

                                <div className="table-responsive" style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                                                <th style={{ ...thStyle, width: '40px' }}>#</th>
                                                <th style={{ ...thStyle, minWidth: '180px' }}>Product Name *</th>
                                                <th style={{ ...thStyle, minWidth: '130px' }}>Part # / SKU *</th>
                                                <th style={{ ...thStyle, minWidth: '130px' }}>Category</th>
                                                <th style={{ ...thStyle, minWidth: '120px' }}>Brand</th>
                                                <th style={{ ...thStyle, width: '110px' }}>Cost Price</th>
                                                <th style={{ ...thStyle, width: '110px' }}>Sell Price</th>
                                                <th style={{ ...thStyle, width: '90px' }}>Initial Stock</th>
                                                <th style={{ ...thStyle, width: '100px' }}>Bin/Shelf</th>
                                                <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bulkRows.map((row, idx) => (
                                                <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.78rem' }}>{idx + 1}</td>
                                                    <td style={tdStyle}>
                                                        <input
                                                            value={row.name}
                                                            onChange={e => updateBulkRow(row.id, 'name', e.target.value)}
                                                            placeholder="e.g. Brake Disc Front"
                                                            style={{ ...inputStyle, padding: '0.45rem 0.65rem', fontSize: '0.85rem' }}
                                                        />
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <input
                                                            value={row.partNumber}
                                                            onChange={e => updateBulkRow(row.id, 'partNumber', e.target.value)}
                                                            placeholder="e.g. 43512-42050"
                                                            style={{ ...inputStyle, padding: '0.45rem 0.65rem', fontSize: '0.85rem', fontFamily: 'monospace' }}
                                                        />
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <select
                                                            value={row.category}
                                                            onChange={e => updateBulkRow(row.id, 'category', e.target.value)}
                                                            style={{ ...inputStyle, padding: '0.45rem 0.65rem', fontSize: '0.82rem', height: '34px' }}
                                                        >
                                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                                        </select>
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <select
                                                            value={row.brand}
                                                            onChange={e => updateBulkRow(row.id, 'brand', e.target.value)}
                                                            style={{ ...inputStyle, padding: '0.45rem 0.65rem', fontSize: '0.82rem', height: '34px' }}
                                                        >
                                                            {brands.map(b => <option key={b} value={b}>{b}</option>)}
                                                        </select>
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <input
                                                            value={row.cost}
                                                            onChange={e => updateBulkRow(row.id, 'cost', e.target.value)}
                                                            placeholder="Cost"
                                                            style={{ ...inputStyle, padding: '0.45rem 0.65rem', fontSize: '0.85rem' }}
                                                        />
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <input
                                                            value={row.price}
                                                            onChange={e => updateBulkRow(row.id, 'price', e.target.value)}
                                                            placeholder="Price"
                                                            style={{ ...inputStyle, padding: '0.45rem 0.65rem', fontSize: '0.85rem' }}
                                                        />
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <input
                                                            type="number"
                                                            value={row.stockQuantity}
                                                            onChange={e => updateBulkRow(row.id, 'stockQuantity', e.target.value)}
                                                            placeholder="Qty"
                                                            min="0"
                                                            style={{ ...inputStyle, padding: '0.45rem 0.65rem', fontSize: '0.85rem' }}
                                                        />
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <input
                                                            value={row.location}
                                                            onChange={e => updateBulkRow(row.id, 'location', e.target.value)}
                                                            placeholder="Bin"
                                                            style={{ ...inputStyle, padding: '0.45rem 0.65rem', fontSize: '0.85rem' }}
                                                        />
                                                    </td>
                                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => duplicateBulkRow(row.id)}
                                                                title="Duplicate row"
                                                                style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--primary)', cursor: 'pointer', borderRadius: '4px', padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                                                            >
                                                                📋
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeBulkRow(row.id)}
                                                                title="Delete row"
                                                                disabled={bulkRows.length <= 1}
                                                                style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', cursor: bulkRows.length <= 1 ? 'not-allowed' : 'pointer', borderRadius: '4px', padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        Ready to add {bulkRows.filter(r => r.name.trim().length > 0).length} valid products
                                    </span>
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        disabled={bulkSaving || bulkRows.filter(r => r.name.trim().length > 0).length === 0}
                                        onClick={handleSaveBulkRows}
                                        style={{ padding: '0.85rem 2rem', fontWeight: 700, fontSize: '0.95rem' }}
                                    >
                                        {bulkSaving ? 'Saving Products...' : `Save All ${bulkRows.filter(r => r.name.trim().length > 0).length} Products`}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Mode 3: CSV Import */}
                        {productEntryMode === 'csv_import' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Import from CSV or Excel Spreadsheet</h4>
                                        <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                            Quickly import hundreds of spare parts from a standard CSV file or paste directly.
                                        </p>
                                    </div>
                                    <button type="button" className="btn-outline" onClick={downloadCsvTemplate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.95rem', fontSize: '0.82rem' }}>
                                        <span>⬇ Download CSV Template</span>
                                    </button>
                                </div>

                                <div>
                                    <label style={labelStyle}>Paste CSV Content or Drag &amp; Drop CSV File</label>
                                    <textarea
                                        value={csvInputText}
                                        onChange={e => {
                                            setCsvInputText(e.target.value);
                                            parseCsvString(e.target.value);
                                        }}
                                        placeholder="name,partNumber,category,brand,cost,price,stockQuantity,reorderPoint,location,compatibility&#10;Brake Pad Set,BP-1020,Brakes,Brembo,85000,160000,12,4,Shelf A-1,RAV4&#10;Oil Filter,OF-3321,Engine,Denso,18000,35000,30,8,Shelf B-2,Universal"
                                        style={{ ...inputStyle, height: '130px', fontFamily: 'monospace', fontSize: '0.82rem' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            Supported: name, partNumber/sku, category, brand, cost, price, stockQuantity/qty, location, compatibility
                                        </span>
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = (evt) => {
                                                        const text = evt.target?.result as string;
                                                        setCsvInputText(text);
                                                        parseCsvString(text);
                                                    };
                                                    reader.readAsText(file);
                                                }
                                            }}
                                            style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
                                        />
                                    </div>
                                </div>

                                {csvError && (
                                    <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#ef4444', fontSize: '0.82rem' }}>
                                        {csvError}
                                    </div>
                                )}

                                {csvPreviewRows.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>
                                                ✓ Parsed {csvPreviewRows.length} Valid Products Ready for Import
                                            </span>
                                            <button
                                                type="button"
                                                className="btn-primary"
                                                disabled={bulkSaving}
                                                onClick={handleImportParsedCsv}
                                                style={{ padding: '0.65rem 1.4rem', fontWeight: 700 }}
                                            >
                                                {bulkSaving ? 'Importing...' : `Import All ${csvPreviewRows.length} Products Now`}
                                            </button>
                                        </div>

                                        <div className="table-responsive" style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                                                <thead>
                                                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                                                        <th style={thStyle}>#</th>
                                                        <th style={thStyle}>Name</th>
                                                        <th style={thStyle}>SKU</th>
                                                        <th style={thStyle}>Category</th>
                                                        <th style={thStyle}>Brand</th>
                                                        <th style={thStyle}>Cost</th>
                                                        <th style={thStyle}>Price</th>
                                                        <th style={thStyle}>Stock</th>
                                                        <th style={thStyle}>Location</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {csvPreviewRows.slice(0, 50).map((r, i) => (
                                                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                            <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{i + 1}</td>
                                                            <td style={{ ...tdStyle, fontWeight: 600 }}>{r.name}</td>
                                                            <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{r.partNumber}</td>
                                                            <td style={tdStyle}>{r.category}</td>
                                                            <td style={tdStyle}>{r.brand}</td>
                                                            <td style={tdStyle}>{fmt(r.cost)}</td>
                                                            <td style={{ ...tdStyle, color: 'var(--primary)', fontWeight: 700 }}>{fmt(r.price)}</td>
                                                            <td style={{ ...tdStyle, color: '#10b981', fontWeight: 700 }}>{r.stockQuantity}</td>
                                                            <td style={tdStyle}>{r.location || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

            </main>

            {/* ════════════════════ MODALS ════════════════════ */}

            {/* Modal: Add / Edit Product */}
            {showAddModal && (
                <Modal 
                    title={editingPart ? `Edit Product: ${editingPart.name}` : 'Add Spare Part(s) / Products'} 
                    onClose={() => setShowAddModal(false)} 
                    wide={productEntryMode !== 'bulk_grid'}
                    extraWide={productEntryMode === 'bulk_grid'}
                >
                    {!editingPart && (
                        <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.03)', padding: '0.35rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => setProductEntryMode('single')}
                                style={{
                                    flex: 1, padding: '0.55rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                    fontWeight: productEntryMode === 'single' ? 700 : 500, fontSize: '0.84rem',
                                    background: productEntryMode === 'single' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                                    color: productEntryMode === 'single' ? 'white' : 'var(--text-muted)'
                                }}
                            >
                                📦 Single Product
                            </button>
                            <button
                                type="button"
                                onClick={() => setProductEntryMode('bulk_grid')}
                                style={{
                                    flex: 1, padding: '0.55rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                    fontWeight: productEntryMode === 'bulk_grid' ? 700 : 500, fontSize: '0.84rem',
                                    background: productEntryMode === 'bulk_grid' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                                    color: productEntryMode === 'bulk_grid' ? 'white' : 'var(--text-muted)'
                                }}
                            >
                                📋 Bulk Products Grid
                            </button>
                            <button
                                type="button"
                                onClick={() => setProductEntryMode('csv_import')}
                                style={{
                                    flex: 1, padding: '0.55rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                    fontWeight: productEntryMode === 'csv_import' ? 700 : 500, fontSize: '0.84rem',
                                    background: productEntryMode === 'csv_import' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                                    color: productEntryMode === 'csv_import' ? 'white' : 'var(--text-muted)'
                                }}
                            >
                                📄 CSV / Excel Import
                            </button>
                        </div>
                    )}

                    {(productEntryMode === 'single' || editingPart) && (
                        <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                                <LabelInput label="Product Name" value={productForm.name} onChange={(v: string) => setProductForm({ ...productForm, name: v })} placeholder="e.g. Front Brake Pad Set (Ceramic)" required />
                                <LabelInput label="Part Number / SKU" value={productForm.partNumber} onChange={(v: string) => setProductForm({ ...productForm, partNumber: v })} placeholder="e.g. 04465-33450" required />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label style={labelStyle}>Category</label>
                                        <button 
                                            type="button" 
                                            onClick={handleOpenAddCategory}
                                            style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '0.74rem', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                                        >
                                            + New Category
                                        </button>
                                    </div>
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
                    )}

                    {productEntryMode === 'bulk_grid' && !editingPart && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    Fill in product rows. Unfilled rows will be automatically skipped.
                                </span>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button type="button" className="btn-outline" onClick={addBulkRow} style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}>+ Add Row</button>
                                    <button type="button" className="btn-outline" onClick={add5BulkRows} style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}>+ 5 Rows</button>
                                    <button type="button" className="btn-outline" onClick={clearBulkRows} style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', color: '#f87171' }}>Clear</button>
                                </div>
                            </div>

                            <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '920px' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                                            <th style={{ ...thStyle, width: '35px' }}>#</th>
                                            <th style={{ ...thStyle, minWidth: '180px' }}>Product Name *</th>
                                            <th style={{ ...thStyle, minWidth: '130px' }}>SKU / Part #</th>
                                            <th style={{ ...thStyle, minWidth: '120px' }}>Category</th>
                                            <th style={{ ...thStyle, minWidth: '110px' }}>Brand</th>
                                            <th style={{ ...thStyle, width: '100px' }}>Cost</th>
                                            <th style={{ ...thStyle, width: '100px' }}>Price</th>
                                            <th style={{ ...thStyle, width: '80px' }}>Stock</th>
                                            <th style={{ ...thStyle, width: '90px' }}>Bin</th>
                                            <th style={{ ...thStyle, width: '60px', textAlign: 'center' }}>Act</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bulkRows.map((row, idx) => (
                                            <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.75rem' }}>{idx + 1}</td>
                                                <td style={tdStyle}>
                                                    <input
                                                        value={row.name}
                                                        onChange={e => updateBulkRow(row.id, 'name', e.target.value)}
                                                        placeholder="Product Name"
                                                        style={{ ...inputStyle, padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                                                    />
                                                </td>
                                                <td style={tdStyle}>
                                                    <input
                                                        value={row.partNumber}
                                                        onChange={e => updateBulkRow(row.id, 'partNumber', e.target.value)}
                                                        placeholder="Auto if empty"
                                                        style={{ ...inputStyle, padding: '0.4rem 0.6rem', fontSize: '0.82rem', fontFamily: 'monospace' }}
                                                    />
                                                </td>
                                                <td style={tdStyle}>
                                                    <select
                                                        value={row.category}
                                                        onChange={e => updateBulkRow(row.id, 'category', e.target.value)}
                                                        style={{ ...inputStyle, padding: '0.4rem 0.6rem', fontSize: '0.8rem', height: '32px' }}
                                                    >
                                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </td>
                                                <td style={tdStyle}>
                                                    <select
                                                        value={row.brand}
                                                        onChange={e => updateBulkRow(row.id, 'brand', e.target.value)}
                                                        style={{ ...inputStyle, padding: '0.4rem 0.6rem', fontSize: '0.8rem', height: '32px' }}
                                                    >
                                                        {brands.map(b => <option key={b} value={b}>{b}</option>)}
                                                    </select>
                                                </td>
                                                <td style={tdStyle}>
                                                    <input
                                                        value={row.cost}
                                                        onChange={e => updateBulkRow(row.id, 'cost', e.target.value)}
                                                        placeholder="Cost"
                                                        style={{ ...inputStyle, padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                                                    />
                                                </td>
                                                <td style={tdStyle}>
                                                    <input
                                                        value={row.price}
                                                        onChange={e => updateBulkRow(row.id, 'price', e.target.value)}
                                                        placeholder="Price"
                                                        style={{ ...inputStyle, padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                                                    />
                                                </td>
                                                <td style={tdStyle}>
                                                    <input
                                                        type="number"
                                                        value={row.stockQuantity}
                                                        onChange={e => updateBulkRow(row.id, 'stockQuantity', e.target.value)}
                                                        placeholder="Qty"
                                                        min="0"
                                                        style={{ ...inputStyle, padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                                                    />
                                                </td>
                                                <td style={tdStyle}>
                                                    <input
                                                        value={row.location}
                                                        onChange={e => updateBulkRow(row.id, 'location', e.target.value)}
                                                        placeholder="Bin"
                                                        style={{ ...inputStyle, padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                                                    />
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '0.2rem', justifyContent: 'center' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => duplicateBulkRow(row.id)}
                                                            title="Duplicate"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                                                        >
                                                            📋
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeBulkRow(row.id)}
                                                            title="Delete"
                                                            disabled={bulkRows.length <= 1}
                                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: bulkRows.length <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {bulkRows.filter(r => r.name.trim().length > 0).length} valid rows
                                </span>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    disabled={bulkSaving || bulkRows.filter(r => r.name.trim().length > 0).length === 0}
                                    onClick={handleSaveBulkRows}
                                    style={{ padding: '0.75rem 1.6rem', fontWeight: 700 }}
                                >
                                    {bulkSaving ? 'Saving...' : `Save ${bulkRows.filter(r => r.name.trim().length > 0).length} Products`}
                                </button>
                            </div>
                        </div>
                    )}

                    {productEntryMode === 'csv_import' && !editingPart && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Paste CSV or select file below:</span>
                                <button type="button" className="btn-outline" onClick={downloadCsvTemplate} style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>
                                    ⬇ Download Template
                                </button>
                            </div>
                            <textarea
                                value={csvInputText}
                                onChange={e => {
                                    setCsvInputText(e.target.value);
                                    parseCsvString(e.target.value);
                                }}
                                placeholder="name,partNumber,category,brand,cost,price,stockQuantity,location&#10;Brake Pad Set,BP-1020,Brakes,Brembo,85000,160000,12,Shelf A-1"
                                style={{ ...inputStyle, height: '110px', fontFamily: 'monospace', fontSize: '0.8rem' }}
                            />
                            <input
                                type="file"
                                accept=".csv"
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (evt) => {
                                            const text = evt.target?.result as string;
                                            setCsvInputText(text);
                                            parseCsvString(text);
                                        };
                                        reader.readAsText(file);
                                    }
                                }}
                                style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
                            />
                            {csvError && <div style={{ color: '#ef4444', fontSize: '0.8rem' }}>{csvError}</div>}
                            {csvPreviewRows.length > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 700 }}>
                                        ✓ {csvPreviewRows.length} products ready to import
                                    </span>
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        disabled={bulkSaving}
                                        onClick={handleImportParsedCsv}
                                        style={{ padding: '0.65rem 1.4rem', fontWeight: 700 }}
                                    >
                                        {bulkSaving ? 'Importing...' : `Import ${csvPreviewRows.length} Products`}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
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

            {/* Modal: Add or Edit Category */}
            {showAddCategoryModal && (
                <Modal 
                    title={editingCategory ? `Edit Category: ${editingCategory.name}` : "Create New Product Category"} 
                    onClose={() => { setShowAddCategoryModal(false); setEditingCategory(null); }}
                >
                    <form onSubmit={handleSaveCategoryModal} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1rem' }}>
                            <LabelInput
                                label="Category Name *"
                                value={categoryForm.name}
                                onChange={(v: string) => {
                                    setCategoryForm(prev => {
                                        const autoCode = (!prev.code || prev.code.startsWith('CAT-') || prev.code === `${prev.name.slice(0, 3).toUpperCase()}-01`)
                                            ? `${v.slice(0, 3).toUpperCase()}-${String(categoryItems.length + 1).padStart(2, '0')}`
                                            : prev.code;
                                        return { ...prev, name: v, code: autoCode };
                                    });
                                }}
                                placeholder="e.g. Turbochargers & Boost"
                                required
                            />
                            <div>
                                <label style={labelStyle}>Category Code *</label>
                                <input
                                    type="text"
                                    value={categoryForm.code}
                                    onChange={e => setCategoryForm({ ...categoryForm, code: e.target.value.toUpperCase() })}
                                    placeholder="e.g. TRB-01"
                                    style={{ ...inputStyle, fontFamily: 'monospace' }}
                                    required
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Parent Category (Optional)</label>
                                <select
                                    value={categoryForm.parentCategory}
                                    onChange={e => setCategoryForm({ ...categoryForm, parentCategory: e.target.value })}
                                    style={{ ...inputStyle, height: '42px' }}
                                >
                                    <option value="">None (Top Level Category)</option>
                                    {categoryItems
                                        .filter(c => !editingCategory || c.id !== editingCategory.id)
                                        .map(c => (
                                            <option key={c.id || c.name} value={c.name}>{c.name}</option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div>
                                <label style={labelStyle}>Category Status</label>
                                <select
                                    value={categoryForm.status}
                                    onChange={e => setCategoryForm({ ...categoryForm, status: e.target.value as 'Active' | 'Inactive' })}
                                    style={{ ...inputStyle, height: '42px' }}
                                >
                                    <option value="Active">Active (Visible)</option>
                                    <option value="Inactive">Inactive (Hidden)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Description &amp; Classification Notes</label>
                            <textarea
                                value={categoryForm.description}
                                onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                style={{ ...inputStyle, height: '75px', resize: 'none' }}
                                placeholder="Specify what components and spare parts belong to this category..."
                            />
                        </div>

                        {editingCategory && (
                            <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(59,130,246,0.08)', borderRadius: '6px', border: '1px solid rgba(59,130,246,0.2)', fontSize: '0.78rem', color: '#93c5fd' }}>
                                ℹ️ Renaming this category will automatically update all {partsInventory.filter(p => p.category === editingCategory.name).length} associated products in the inventory catalog.
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                className="btn-outline"
                                onClick={() => { setShowAddCategoryModal(false); setEditingCategory(null); }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                style={{ padding: '0.75rem 1.5rem', fontWeight: 700 }}
                            >
                                {editingCategory ? 'Save Changes' : 'Create Category'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal: Confirm Delete Category */}
            {confirmDeleteCategory && (
                <Modal 
                    title={`Delete Category: ${confirmDeleteCategory.name}`} 
                    onClose={() => setConfirmDeleteCategory(null)}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {(() => {
                            const affected = partsInventory.filter(p => p.category === confirmDeleteCategory.name);
                            return (
                                <>
                                    {affected.length > 0 ? (
                                        <div style={{ padding: '0.85rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <div style={{ fontWeight: 700, color: '#f87171', fontSize: '0.92rem' }}>
                                                ⚠️ {affected.length} Product{affected.length === 1 ? '' : 's'} Currently Assigned
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                                There are currently {affected.length} product(s) classified under &quot;{confirmDeleteCategory.name}&quot;. Please select a category to reassign them to so they remain accessible:
                                            </p>
                                            <div style={{ marginTop: '0.25rem' }}>
                                                <label style={labelStyle}>Reassign Products To:</label>
                                                <select
                                                    value={categoryDeleteTarget}
                                                    onChange={e => setCategoryDeleteTarget(e.target.value)}
                                                    style={{ ...inputStyle, height: '40px' }}
                                                >
                                                    {categoryItems
                                                        .filter(c => c.id !== confirmDeleteCategory.id)
                                                        .map(c => (
                                                            <option key={c.id || c.name} value={c.name}>{c.name}</option>
                                                        ))
                                                    }
                                                </select>
                                            </div>
                                        </div>
                                    ) : (
                                        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                                            Are you sure you want to delete the category &quot;<strong>{confirmDeleteCategory.name}</strong>&quot; ({confirmDeleteCategory.code})? This category currently has 0 products and can be safely removed.
                                        </p>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
                                        <button
                                            type="button"
                                            className="btn-outline"
                                            onClick={() => setConfirmDeleteCategory(null)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleConfirmDeleteCategory}
                                            style={{
                                                background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: 'var(--radius-sm)',
                                                padding: '0.75rem 1.5rem',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {affected.length > 0 ? `Reassign & Delete` : `Confirm Delete`}
                                        </button>
                                    </div>
                                </>
                            );
                        })()}
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

function Modal({ title, children, onClose, wide, extraWide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean; extraWide?: boolean }) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div className="glass-panel" style={{ width: extraWide ? '1060px' : wide ? '680px' : '480px', maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
