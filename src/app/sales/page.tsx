'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useData, Deal, PartsSale, PartsSaleItem, PartItem, Shipment } from '../../context/DataContext';
import Sidebar from '../../components/Sidebar';
import { BarChart } from '../../components/Charts';
import { useCurrency } from '../../context/CurrencyContext';
import { useBusiness, DEFAULT_FI_PACKAGES } from '../../context/BusinessContext';
import { printSalesAgreement } from '../../lib/printSalesAgreement';
import '../globals.css';
import { usePageGuard } from '../../hooks/usePageGuard';

// ─── Interfaces for Local Sell Extensions ───────────────────────────────────

export interface SellQuote {
    id: string;
    date: string;
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    vehicleLabel: string;
    listPrice: number;
    discount: number;
    tradeInValue: number;
    fiProducts: string;
    validDays: number;
    notes: string;
    status: 'Draft' | 'Sent' | 'Accepted' | 'Expired';
    createdBy: string;
    taxMode?: 'exclusive' | 'inclusive';
    applyVAT?: boolean;
    applyWHT?: boolean;
}

export interface SellReturn {
    id: string;
    date: string;
    type: 'Parts POS Return' | 'Vehicle Sale Return';
    reference: string;
    client: string;
    reason: string;
    amount: number;
    status: 'Pending' | 'Approved' | 'Rejected';
    createdBy: string;
}

export interface DiscountRule {
    id: string;
    name: string;
    code: string;
    type: 'Percentage' | 'Fixed Amount';
    value: number;
    appliesTo: 'All Sales' | 'POS Only' | 'Vehicle Deals Only';
    minPurchase: number;
    active: boolean;
    expiresAt?: string;
}

const DEFAULT_QUOTES: SellQuote[] = [
    { id: 'QT-2026001', date: 'May 28, 2026', clientName: 'Robert K.', clientPhone: '+256 700 111 222', clientEmail: 'robert@example.com', vehicleLabel: '2024 BMW X5 M Competition', listPrice: 114000, discount: 4000, tradeInValue: 8000, fiProducts: 'Extended Warranty, Gap Insurance', validDays: 7, notes: 'Client requesting red color option.', status: 'Sent', createdBy: 'Alex T.' },
    { id: 'QT-2026002', date: 'May 30, 2026', clientName: 'Grace N.', clientPhone: '+256 711 333 444', clientEmail: 'grace@example.com', vehicleLabel: '2024 Lexus LX 600', listPrice: 120000, discount: 0, tradeInValue: 0, fiProducts: 'Paint Protection Film', validDays: 14, notes: '', status: 'Accepted', createdBy: 'Sarah M.' },
    { id: 'QT-2026003', date: 'May 15, 2026', clientName: 'Peter O.', clientPhone: '+256 722 555 666', clientEmail: 'peter@example.com', vehicleLabel: '2023 Porsche 911 Carrera S', listPrice: 135000, discount: 5000, tradeInValue: 12000, fiProducts: '', validDays: 7, notes: 'Expired — client went with competitor.', status: 'Expired', createdBy: 'Alex T.' },
];

const DEFAULT_RETURNS: SellReturn[] = [
    { id: 'RET-001', date: 'Oct 12, 2026', type: 'Parts POS Return', reference: 'SALE-2026-0004', client: 'John Mukasa', reason: 'Incorrect brake pad sizing', amount: 180000, status: 'Approved', createdBy: 'Alex T.' },
    { id: 'RET-002', date: 'Oct 14, 2026', type: 'Vehicle Sale Return', reference: 'D-803', client: 'James O.', reason: 'Trade-in valuation adjustment', amount: 2500000, status: 'Pending', createdBy: 'Sarah M.' },
];

const DEFAULT_DISCOUNTS: DiscountRule[] = [
    { id: 'DSC-1', name: 'Fleet Customer VIP', code: 'FLEET10', type: 'Percentage', value: 10, appliesTo: 'All Sales', minPurchase: 500000, active: true, expiresAt: '2026-12-31' },
    { id: 'DSC-2', name: 'Parts Weekend Promo', code: 'PARTS50K', type: 'Fixed Amount', value: 50000, appliesTo: 'POS Only', minPurchase: 300000, active: true, expiresAt: '2026-11-30' },
    { id: 'DSC-3', name: 'Showroom Clearance Discount', code: 'CLEARANCE5', type: 'Percentage', value: 5, appliesTo: 'Vehicle Deals Only', minPurchase: 20000000, active: false, expiresAt: '2026-10-31' },
];

const PAY_METHODS = ['Cash', 'MTN Mobile Money', 'Airtel Money', 'Card', 'Credit'] as const;

export type SellTab = 
    | 'all_sales' 
    | 'pos_list' 
    | 'pos' 
    | 'drafts' 
    | 'quotations' 
    | 'sell_return' 
    | 'shipments' 
    | 'discounts';

// ─── Main Component Body ────────────────────────────────────────────────────

function SellDeskContent() {
    const { user, isAuthenticated } = useAuth();
    const { isAllowed } = usePageGuard('sales');
    const { 
        deals, vehicles, clients, partsInventory, partsSales, shipments,
        closeDeal, addPartsSale, exportToCSV, addJournalEntry, selectedBranch, 
        logDocumentPrint, showToast 
    } = useData();
    const { formatCurrency: fmt, formatUSDToStore, formatRaw } = useCurrency();
    const { business } = useBusiness();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Active tab management with URL parameter sync
    const initialTab = (searchParams.get('tab') as SellTab) || 'all_sales';
    const [activeTab, setActiveTab] = useState<SellTab>(initialTab);
    // When a ?tab= param is explicitly set in the URL (sidebar navigation),
    // treat it as a dedicated standalone module — hide the internal tab strip.
    const isModuleView = !!searchParams.get('tab');

    useEffect(() => {
        const tabParam = searchParams.get('tab') as SellTab;
        if (tabParam && ['all_sales', 'pos_list', 'pos', 'drafts', 'quotations', 'sell_return', 'shipments', 'discounts'].includes(tabParam)) {
            setActiveTab(tabParam);
        }
    }, [searchParams]);

    // Modals
    const [showNewDealModal, setShowNewDealModal] = useState(false);
    const [showDraftModal, setShowDraftModal] = useState(false);
    const [showAddQuoteModal, setShowAddQuoteModal] = useState(false);
    const [showAddReturnModal, setShowAddReturnModal] = useState(false);
    const [showAddDiscountModal, setShowAddDiscountModal] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
    const [selectedReceipt, setSelectedReceipt] = useState<PartsSale | null>(null);
    const [selectedQuote, setSelectedQuote] = useState<SellQuote | null>(null);

    const F_I_PACKAGES = business.fiPackages?.length ? business.fiPackages : DEFAULT_FI_PACKAGES;

    // ─── POS Terminal State ──────────────────────────────────────────────────
    const [posSearch, setPosSearch] = useState('');
    const [cart, setCart] = useState<(PartsSaleItem & { tempId: string })[]>([]);
    const [discountPct, setDiscountPct] = useState(0);
    const [payMethod, setPayMethod] = useState<typeof PAY_METHODS[number]>('Cash');
    const [posCustomer, setPosCustomer] = useState('');
    const [posNotes, setPosNotes] = useState('');
    const [processingSale, setProcessingSale] = useState(false);
    const [lastReceipt, setLastReceipt] = useState<PartsSale | null>(null);
    const posSearchRef = useRef<HTMLInputElement>(null);

    // ─── Quotations Local State ──────────────────────────────────────────────
    const [quotes, setQuotes] = useState<SellQuote[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('dms_sell_quotes');
            if (saved) {
                try { return JSON.parse(saved); } catch {}
            }
        }
        return DEFAULT_QUOTES;
    });

    useEffect(() => {
        try { localStorage.setItem('dms_sell_quotes', JSON.stringify(quotes)); } catch {}
    }, [quotes]);

    // ─── Returns Local State ─────────────────────────────────────────────────
    const [returns, setReturns] = useState<SellReturn[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('dms_sell_returns');
            if (saved) {
                try { return JSON.parse(saved); } catch {}
            }
        }
        return DEFAULT_RETURNS;
    });

    useEffect(() => {
        try { localStorage.setItem('dms_sell_returns', JSON.stringify(returns)); } catch {}
    }, [returns]);

    // ─── Discounts Local State ───────────────────────────────────────────────
    const [discounts, setDiscounts] = useState<DiscountRule[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('dms_sell_discounts');
            if (saved) {
                try { return JSON.parse(saved); } catch {}
            }
        }
        return DEFAULT_DISCOUNTS;
    });

    useEffect(() => {
        try { localStorage.setItem('dms_sell_discounts', JSON.stringify(discounts)); } catch {}
    }, [discounts]);

    // ─── Forms State ─────────────────────────────────────────────────────────
    const [newDeal, setNewDeal] = useState({ 
        client: '', clientId: '', vehicleId: '', vehicleLabel: '', salePrice: '', agent: user?.name || 'Alex T.', notes: '',
        paymentType: 'Outright' as 'Outright' | 'Financed',
        paymentOption: 'Full' as 'Full' | 'Partial',
        paymentMethod: 'Cash' as 'Cash' | 'Bank Transfer' | 'Cheque' | 'Mobile Money',
        tradeInMake: '', tradeInModel: '', tradeInYear: '', tradeInMileage: '', tradeInValue: '',
        apr: '5.9', term: '60', downPayment: '0',
        selectedFiProducts: [] as string[]
    });

    const [quoteForm, setQuoteForm] = useState({
        clientName: '', clientPhone: '', clientEmail: '',
        vehicleLabel: '', listPrice: '', discount: '0', tradeInValue: '0',
        fiProducts: '', validDays: '7', notes: '', taxMode: 'exclusive' as 'exclusive' | 'inclusive',
        applyVAT: true, applyWHT: false
    });

    const [returnForm, setReturnForm] = useState({
        type: 'Parts POS Return' as SellReturn['type'],
        reference: '', client: '', reason: '', amount: ''
    });

    const [discountForm, setDiscountForm] = useState({
        name: '', code: '', type: 'Percentage' as DiscountRule['type'],
        value: '', appliesTo: 'All Sales' as DiscountRule['appliesTo'],
        minPurchase: '0', expiresAt: ''
    });

    useEffect(() => {
        if (!isAuthenticated) router.push('/login');
    }, [isAuthenticated, router]);

    if (!isAllowed || !isAuthenticated || !user) return null;

    // ─── Scoped Branch Data Filtering ─────────────────────────────────────────
    const branchDeals = deals.filter(d => selectedBranch === 'All' || d.branch === selectedBranch);
    const closedDeals = branchDeals.filter(d => d.status === 'Closed');
    const pendingDeals = branchDeals.filter(d => d.status === 'Pending Finance');
    const branchPartsSales = (partsSales || []).filter(s => selectedBranch === 'All' || !s.branch || s.branch === selectedBranch);
    const branchShipments = (shipments || []).filter(s => selectedBranch === 'All' || s.branch === selectedBranch);
    const availableVehicles = vehicles.filter(v => v.status === 'In Stock' || v.status === 'In Transit');

    // Financial Computations
    const posRevenue = branchPartsSales.reduce((acc, s) => acc + (s.total || 0), 0);
    const dealRevenue = closedDeals.reduce((acc, d) => {
        const v = parseFloat((d.salePrice ?? '0').replace(/[^0-9.-]+/g, ''));
        return isNaN(v) ? acc : acc + v;
    }, 0);
    const totalCommercialSales = closedDeals.length + branchPartsSales.length;
    const totalGrossMargin = closedDeals.reduce((acc, d) => acc + (parseFloat((d.margin ?? '0').replace(/[^0-9.-]+/g, '')) || 0), 0) +
        branchPartsSales.reduce((acc, s) => {
            const m = (s.items || []).reduce((sum, item) => sum + ((item.unitPrice - (item.unitCost || 0)) * item.quantity), 0);
            return acc + (m > 0 ? m : (s.total * 0.25));
        }, 0);

    // Leaderboard
    const leaderboard: Record<string, number> = {};
    closedDeals.forEach(d => {
        const c = parseFloat((d.commission ?? '0').replace(/[^0-9.-]+/g, ''));
        if (!isNaN(c)) leaderboard[d.agent] = (leaderboard[d.agent] || 0) + c;
    });
    const sortedLeaderboard = Object.entries(leaderboard).map(([name, commission]) => ({ name, commission })).sort((a, b) => b.commission - a.commission);

    // Monthly data
    const monthlyData = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((label, i) => ({
        label,
        value: closedDeals.filter(d => {
            const dt = new Date(d.date);
            return !isNaN(dt.getTime()) && dt.getMonth() === i;
        }).length + branchPartsSales.filter(s => {
            const dt = new Date(s.date);
            return !isNaN(dt.getTime()) && dt.getMonth() === i;
        }).length
    }));

    // ─── Deal Action Handlers ────────────────────────────────────────────────
    const handleStartNewDeal = (e: React.FormEvent, isDraft = false) => {
        e.preventDefault();
        const isOutsourced = newDeal.vehicleId === 'outsourced';
        const selectedCar = vehicles.find(v => v.id === newDeal.vehicleId);
        if ((!selectedCar && !isOutsourced) || !newDeal.client) return;
        if (isOutsourced && !newDeal.vehicleLabel.trim()) return;
        
        const originalCost = isOutsourced ? 0 : parseFloat(selectedCar!.cost?.replace(/[^0-9.-]+/g, '') || selectedCar!.price.replace(/[^0-9.-]+/g, '')) || 80000;
        const saleVal = parseFloat(newDeal.salePrice.replace(/[^0-9.-]+/g, '')) || (originalCost + 10000);
        const marginVal = isOutsourced ? saleVal : saleVal - originalCost;
        const commissionVal = Math.max(marginVal * 0.10, 0);
        
        const tradeInValue = parseFloat(newDeal.tradeInValue.replace(/[^0-9.-]+/g, '')) || 0;
        const downPayment = parseFloat(newDeal.downPayment.replace(/[^0-9.-]+/g, '')) || 0;
        const fiTotal = newDeal.selectedFiProducts.reduce((sum, id) => sum + (F_I_PACKAGES.find(p => p.id === id)?.price || 0), 0);
        const amountFinanced = saleVal + fiTotal - downPayment - tradeInValue;
        
        const r = (parseFloat(newDeal.apr) || 0) / 100 / 12;
        const n = parseInt(newDeal.term) || 60;
        const monthlyPayment = amountFinanced > 0 && r > 0 ? (amountFinanced * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : (amountFinanced / n);

        const fiProductsStr = newDeal.selectedFiProducts.map(id => F_I_PACKAGES.find(p => p.id === id)?.name).join(', ');

        closeDeal({
            client: newDeal.client,
            clientId: newDeal.clientId || undefined,
            vehicle: isOutsourced ? newDeal.vehicleLabel : `${selectedCar!.year} ${selectedCar!.make} ${selectedCar!.model}`,
            salePrice: formatUSDToStore(saleVal), margin: formatUSDToStore(marginVal), commission: formatUSDToStore(commissionVal),
            agent: newDeal.agent, 
            status: isDraft ? 'Pending Finance' : 'Closed', 
            fiProducts: fiProductsStr, notes: newDeal.notes,
            branch: selectedBranch !== 'All' ? selectedBranch as import('../../context/DataContext').Branch : user.branch,
            tradeIn: tradeInValue > 0 ? {
                make: newDeal.tradeInMake, model: newDeal.tradeInModel, year: parseInt(newDeal.tradeInYear),
                mileage: parseInt(newDeal.tradeInMileage), value: tradeInValue
            } : undefined,
            financing: {
                apr: parseFloat(newDeal.apr) || 0, term: n, downPayment, amountFinanced, monthlyPayment
            }
        });

        // Trigger GL Entries if closed
        if (!isDraft) {
            const dealId = `D-${800 + deals.length + 1}`;
            const entries: any[] = [];
            entries.push({ accountId: '1200', accountName: 'Accounts Receivable', type: 'Asset', amount: amountFinanced + downPayment, entryType: 'Debit', description: `Vehicle Sale ${dealId}` });
            entries.push({ accountId: '4000', accountName: 'Vehicle Sales Revenue', type: 'Revenue', amount: saleVal, entryType: 'Credit', description: `Vehicle Sale ${dealId}` });
            if (fiTotal > 0) entries.push({ accountId: '4100', accountName: 'F&I Revenue', type: 'Revenue', amount: fiTotal, entryType: 'Credit', description: `F&I Products ${dealId}` });
            if (tradeInValue > 0) {
                entries.push({ accountId: '1300', accountName: 'Vehicle Inventory', type: 'Asset', amount: tradeInValue, entryType: 'Debit', description: `Trade-in ${dealId}` });
                entries.push({ accountId: '1200', accountName: 'Accounts Receivable', type: 'Asset', amount: tradeInValue, entryType: 'Credit', description: `Trade-in Applied ${dealId}` });
            }
            entries.push({ accountId: '5000', accountName: 'Cost of Goods Sold', type: 'Expense', amount: originalCost, entryType: 'Debit', description: `COGS ${dealId}` });
            entries.push({ accountId: '1300', accountName: 'Vehicle Inventory', type: 'Asset', amount: originalCost, entryType: 'Credit', description: `Vehicle Sold ${dealId}` });
            if (addJournalEntry) addJournalEntry(entries);
        }

        setShowNewDealModal(false);
        setShowDraftModal(false);
        showToast(isDraft ? 'Draft deal saved to pipeline' : 'Deal closed & booked successfully', 'success');
        setNewDeal({ 
            client: '', clientId: '', vehicleId: '', vehicleLabel: '', salePrice: '', agent: user?.name || '', notes: '',
            paymentType: 'Outright', paymentOption: 'Full', paymentMethod: 'Cash',
            tradeInMake: '', tradeInModel: '', tradeInYear: '', tradeInMileage: '', tradeInValue: '',
            apr: '5.9', term: '60', downPayment: '0', selectedFiProducts: []
        });
    };

    const handlePrintAgreement = (deal: any) => {
        const client = clients.find(c => (deal.clientId && c.id === deal.clientId) || c.name === deal.client);
        const saleVal = deal.salePrice ? deal.salePrice : '$0';
        const downPayment = deal.financing ? deal.financing.downPayment : 0;
        const balance = deal.financing ? deal.financing.amountFinanced : 0;

        logDocumentPrint({
            type: 'Sales Agreement',
            client: deal.client,
            amount: String(saleVal),
            referenceId: deal.id,
            generatedBy: deal.agent || user?.name || 'System',
            branch: deal.branch,
        });

        printSalesAgreement(business, {
            docNo: deal.id ? deal.id.replace(/[^0-9]/g, '') || '048' : '048',
            agreementDate: deal.date !== 'Today' && deal.date !== 'Yesterday' ? deal.date : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            vehicleName: deal.vehicle,
            sellerName: business.name,
            sellerAddress: business.address,
            sellerPhone: business.phone,
            buyerName: deal.client,
            buyerAddress: client?.address || '',
            buyerPhone: client?.phone || '',
            nextOfKin: client?.idPassport || '',
            agreedPrice: saleVal,
            amountPaid: downPayment,
            balance: balance,
            formatCurrencyFn: (v) => fmt(v)
        });
    };

    // ─── POS Handlers ────────────────────────────────────────────────────────
    const posFiltered = posSearch.trim().length > 0
        ? partsInventory.filter(p =>
            p.name.toLowerCase().includes(posSearch.toLowerCase()) ||
            p.partNumber.toLowerCase().includes(posSearch.toLowerCase()) ||
            (p.category || '').toLowerCase().includes(posSearch.toLowerCase())
          )
        : [];

    const addToCart = (part: PartItem) => {
        const availableStock = Number(part.stockQuantity) || 0;
        if (availableStock <= 0) {
            showToast(`Cannot sell "${part.name}": Product has not been purchased / is out of stock (Stock: 0).`, 'danger');
            return;
        }
        setCart(prev => {
            const ex = prev.find(c => c.partId === part.id);
            if (ex) {
                if (ex.quantity >= availableStock) {
                    showToast(`Cannot add more: Max available stock is ${availableStock} units.`, 'warning');
                    return prev;
                }
                return prev.map(c => c.partId === part.id ? { ...c, quantity: c.quantity + 1, lineTotal: (c.quantity + 1) * c.unitPrice } : c);
            }
            return [...prev, {
                tempId: Date.now().toString(),
                partId: part.id,
                partNumber: part.partNumber,
                name: part.name,
                quantity: 1,
                unitPrice: part.price,
                unitCost: part.cost,
                lineTotal: part.price
            }];
        });
        setPosSearch('');
        posSearchRef.current?.focus();
    };

    const removeFromCart = (tempId: string) => setCart(prev => prev.filter(c => c.tempId !== tempId));
    
    const updateCartQty = (tempId: string, qty: number) => {
        if (qty <= 0) { removeFromCart(tempId); return; }
        const item = cart.find(c => c.tempId === tempId);
        if (item) {
            const part = partsInventory.find(p => p.id === item.partId);
            const stock = part ? (Number(part.stockQuantity) || 0) : 0;
            if (stock <= 0) {
                removeFromCart(tempId);
                showToast(`"${item.name}" has 0 stock / not purchased and was removed from cart.`, 'danger');
                return;
            }
            if (qty > stock) {
                showToast(`Cannot exceed available stock of ${stock} units for "${item.name}".`, 'warning');
                return;
            }
        }
        setCart(prev => prev.map(c => c.tempId === tempId ? { ...c, quantity: qty, lineTotal: qty * c.unitPrice } : c));
    };

    const cartSubtotal = cart.reduce((s, c) => s + c.lineTotal, 0);
    const cartDiscountAmt = (cartSubtotal * discountPct) / 100;
    const cartTotal = Math.max(0, cartSubtotal - cartDiscountAmt);

    const handleCompletePOS = async () => {
        if (cart.length === 0) { showToast('Cart is empty', 'warning'); return; }

        // Final verification: ensure every cart item was purchased and is in stock
        for (const item of cart) {
            const part = partsInventory.find(p => p.id === item.partId);
            const stock = part ? (Number(part.stockQuantity) || 0) : 0;
            if (stock <= 0) {
                showToast(`Sale blocked: "${item.name}" has 0 stock or was not purchased into inventory.`, 'danger');
                return;
            }
            if (item.quantity > stock) {
                showToast(`Sale blocked: Requested ${item.quantity} of "${item.name}", but only ${stock} in stock.`, 'danger');
                return;
            }
        }

        setProcessingSale(true);
        const saleNum = `POS-${new Date().getFullYear()}-${String(partsSales.length + 1).padStart(4, '0')}`;
        const sale: Omit<PartsSale, 'id'> = {
            saleNumber: saleNum,
            date: new Date().toISOString(),
            customerName: posCustomer.trim() || 'Walk-in Customer',
            items: cart,
            subtotal: cartSubtotal,
            discount: discountPct,
            total: cartTotal,
            paymentMethod: payMethod,
            notes: posNotes,
            branch: selectedBranch !== 'All' ? selectedBranch : user.branch,
            createdBy: user.name || user.email || 'Cashier'
        };

        try {
            await addPartsSale(sale, cart);
            const createdSaleRecord = { ...sale, id: `pos-${Date.now()}` } as PartsSale;
            setLastReceipt(createdSaleRecord);
            setSelectedReceipt(createdSaleRecord);
            setCart([]);
            setDiscountPct(0);
            setPosCustomer('');
            setPosNotes('');
            showToast(`Receipt ${saleNum} issued successfully!`, 'success');
        } catch {
            showToast('Failed to record POS sale', 'danger');
        } finally {
            setProcessingSale(false);
        }
    };

    // ─── Quotations Handlers ─────────────────────────────────────────────────
    const handleCreateQuote = (e: React.FormEvent) => {
        e.preventDefault();
        const lp = parseFloat(quoteForm.listPrice.replace(/[^0-9.-]+/g, '')) || 0;
        const disc = parseFloat(quoteForm.discount.replace(/[^0-9.-]+/g, '')) || 0;
        const trd = parseFloat(quoteForm.tradeInValue.replace(/[^0-9.-]+/g, '')) || 0;
        const q: SellQuote = {
            id: `QT-${Date.now().toString().slice(-6)}`,
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            clientName: quoteForm.clientName,
            clientPhone: quoteForm.clientPhone,
            clientEmail: quoteForm.clientEmail,
            vehicleLabel: quoteForm.vehicleLabel,
            listPrice: lp,
            discount: disc,
            tradeInValue: trd,
            fiProducts: quoteForm.fiProducts,
            validDays: parseInt(quoteForm.validDays) || 7,
            notes: quoteForm.notes,
            status: 'Draft',
            createdBy: user.name || 'Sales Staff',
            taxMode: quoteForm.taxMode,
            applyVAT: quoteForm.applyVAT,
            applyWHT: quoteForm.applyWHT
        };
        setQuotes(prev => [q, ...prev]);
        setShowAddQuoteModal(false);
        setQuoteForm({
            clientName: '', clientPhone: '', clientEmail: '', vehicleLabel: '',
            listPrice: '', discount: '0', tradeInValue: '0', fiProducts: '',
            validDays: '7', notes: '', taxMode: 'exclusive', applyVAT: true, applyWHT: false
        });
        showToast(`Quotation ${q.id} created`, 'success');
    };

    const handleConvertQuoteToDeal = (q: SellQuote) => {
        closeDeal({
            client: q.clientName,
            vehicle: q.vehicleLabel,
            salePrice: formatUSDToStore(q.listPrice - q.discount - q.tradeInValue),
            margin: formatUSDToStore((q.listPrice - q.discount - q.tradeInValue) * 0.12),
            commission: formatUSDToStore((q.listPrice - q.discount - q.tradeInValue) * 0.012),
            agent: q.createdBy || user.name || 'Alex T.',
            status: 'Closed',
            fiProducts: q.fiProducts,
            notes: `Converted from Proforma ${q.id}. ${q.notes}`,
            branch: selectedBranch !== 'All' ? selectedBranch as import('../../context/DataContext').Branch : user.branch
        });
        setQuotes(prev => prev.map(item => item.id === q.id ? { ...item, status: 'Accepted' } : item));
        showToast(`Quotation ${q.id} converted into active closed deal!`, 'success');
        setActiveTab('all_sales');
    };

    // ─── Returns Handlers ────────────────────────────────────────────────────
    const handleCreateReturn = (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(returnForm.amount.replace(/[^0-9.-]+/g, '')) || 0;
        const newRet: SellReturn = {
            id: `RET-${Date.now().toString().slice(-4)}`,
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            type: returnForm.type,
            reference: returnForm.reference,
            client: returnForm.client,
            reason: returnForm.reason,
            amount: amt,
            status: 'Pending',
            createdBy: user.name || 'Staff'
        };
        setReturns(prev => [newRet, ...prev]);
        setShowAddReturnModal(false);
        setReturnForm({ type: 'Parts POS Return', reference: '', client: '', reason: '', amount: '' });
        showToast('Sell return recorded for review', 'success');
    };

    // ─── Discounts Handlers ──────────────────────────────────────────────────
    const handleCreateDiscount = (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(discountForm.value.replace(/[^0-9.-]+/g, '')) || 0;
        const minP = parseFloat(discountForm.minPurchase.replace(/[^0-9.-]+/g, '')) || 0;
        const rule: DiscountRule = {
            id: `DSC-${Date.now().toString().slice(-4)}`,
            name: discountForm.name,
            code: discountForm.code.toUpperCase().replace(/\s+/g, ''),
            type: discountForm.type,
            value: val,
            appliesTo: discountForm.appliesTo,
            minPurchase: minP,
            active: true,
            expiresAt: discountForm.expiresAt || '2026-12-31'
        };
        setDiscounts(prev => [rule, ...prev]);
        setShowAddDiscountModal(false);
        setDiscountForm({ name: '', code: '', type: 'Percentage', value: '', appliesTo: 'All Sales', minPurchase: '0', expiresAt: '' });
        showToast(`Discount rule ${rule.code} activated`, 'success');
    };

    // Unified All Sales list
    const unifiedSalesList = [
        ...closedDeals.map(d => ({
            type: 'Vehicle Deal' as const,
            id: d.id,
            date: d.date,
            client: d.client,
            desc: d.vehicle,
            amount: parseFloat((d.salePrice ?? '0').replace(/[^0-9.-]+/g, '')) || 0,
            statusBadge: d.status,
            agent: d.agent,
            rawDeal: d
        })),
        ...branchPartsSales.map(s => ({
            type: 'Parts POS' as const,
            id: s.saleNumber,
            date: new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            client: s.customerName || 'Walk-in Customer',
            desc: `${(s.items || []).length} parts item(s)`,
            amount: s.total || 0,
            statusBadge: s.paymentMethod,
            agent: s.createdBy || 'Cashier',
            rawSale: s
        }))
    ].sort((a, b) => b.id.localeCompare(a.id));

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
                                    onClick={() => router.push('/sales')}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                                    All Sales
                                </button>
                                <span style={{ color: 'var(--border-color)' }}>/</span>
                                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    {{
                                        pos: 'POS Terminal',
                                        pos_list: 'List POS',
                                        drafts: 'Drafts & Pending',
                                        quotations: 'Quotations',
                                        sell_return: 'Sell Returns',
                                        shipments: 'Shipments',
                                        discounts: 'Discounts',
                                        all_sales: 'All Sales'
                                    }[activeTab]}
                                </span>
                            </div>
                            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                                {{
                                    pos: 'POS Terminal',
                                    pos_list: 'POS Sales List',
                                    drafts: 'Drafts & Pending',
                                    quotations: 'Quotations & Proforma',
                                    sell_return: 'Sell Returns',
                                    shipments: 'Shipments',
                                    discounts: 'Discount Rules',
                                    all_sales: 'All Sales'
                                }[activeTab]}
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0.25rem 0 0' }}>
                                {{
                                    pos: 'Counter retail — scan or search parts and process payment',
                                    pos_list: 'All completed counter sales and POS receipts',
                                    drafts: 'Pending vehicle deals and pipeline deals awaiting finance',
                                    quotations: 'Customer proforma invoices and vehicle quotations',
                                    sell_return: 'Approved and pending product & deal returns',
                                    shipments: 'Vehicle import shipments and logistics tracking',
                                    discounts: 'Discount codes, promotions and pricing rules',
                                    all_sales: 'Unified commercial sales — vehicle deals and POS receipts'
                                }[activeTab]}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                            {activeTab === 'pos' && (
                                <button className="btn-primary" onClick={() => { setActiveTab('pos'); setTimeout(() => posSearchRef.current?.focus(), 50); }}>
                                    Open POS Terminal
                                </button>
                            )}
                            {activeTab === 'drafts' && (
                                <button className="btn-primary" onClick={() => setShowDraftModal(true)}>+ New Draft Deal</button>
                            )}
                            {activeTab === 'quotations' && (
                                <button className="btn-primary" onClick={() => setShowAddQuoteModal(true)}>+ New Quotation</button>
                            )}
                            {activeTab === 'sell_return' && (
                                <button className="btn-primary" onClick={() => setShowAddReturnModal(true)}>+ Log Return</button>
                            )}
                            {activeTab === 'discounts' && (
                                <button className="btn-primary" onClick={() => setShowAddDiscountModal(true)}>+ New Discount Rule</button>
                            )}
                            {activeTab === 'all_sales' || activeTab === 'pos_list' ? (
                                <button className="btn-outline" onClick={() => exportToCSV(unifiedSalesList, 'all_sales.csv')}>Export CSV</button>
                            ) : null}
                        </div>
                    </header>
                ) : (
                    // ── Unified overview header (base /sales page) ──
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Sell Operations</h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0.25rem 0 0' }}>
                                Unified commercial sales desk &mdash; Vehicle deals, POS retail, drafts, proformas &amp; returns
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                            <button className="btn-outline" onClick={() => exportToCSV(unifiedSalesList, 'all_sales.csv')}>
                                Export CSV
                            </button>
                            <button className="btn-outline" onClick={() => setShowReport(true)}>
                                Performance Report
                            </button>
                            <button className="btn-outline" onClick={() => { setActiveTab('pos'); setTimeout(() => posSearchRef.current?.focus(), 50); }}>
                                + Open POS Terminal
                            </button>
                            <button className="btn-primary" onClick={() => setShowNewDealModal(true)}>
                                + Start Vehicle Deal
                            </button>
                        </div>
                    </header>
                )}


                {/* ── KPI Row ── */}
                <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
                    <StatCard 
                        label="Total Commercial Sales" 
                        value={`${totalCommercialSales}`} 
                        sub={`${closedDeals.length} Deals • ${branchPartsSales.length} POS Receipts`} 
                        color="white" 
                    />
                    <StatCard 
                        label="Gross Revenue" 
                        value={fmt(dealRevenue + posRevenue)} 
                        sub={`Deals: ${fmt(dealRevenue)} | POS: ${fmt(posRevenue)}`} 
                        color="var(--primary)" 
                    />
                    <StatCard 
                        label="Gross Profit / Margin" 
                        value={fmt(totalGrossMargin)} 
                        sub="Vehicle margin + parts retail markup" 
                        color="var(--success)" 
                    />
                    <StatCard 
                        label="Pending Drafts & F&I" 
                        value={`${pendingDeals.length}`} 
                        sub={`${quotes.filter(q => q.status === 'Draft' || q.status === 'Sent').length} Active Proformas`} 
                        color="var(--warning)" 
                    />
                </div>

                {/* ── Nav Tabs Bar — only shown on unified /sales view, not module views ── */}
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
                        { id: 'all_sales', label: 'All Sales', count: unifiedSalesList.length },
                        { id: 'pos_list', label: 'List POS', count: branchPartsSales.length },
                        { id: 'pos', label: 'POS Terminal', badge: cart.length > 0 ? `${cart.length}` : undefined },
                        { id: 'drafts', label: 'List Drafts', count: pendingDeals.length },
                        { id: 'quotations', label: 'Quotations', count: quotes.length },
                        { id: 'sell_return', label: 'Sell Returns', count: returns.length },
                        { id: 'shipments', label: 'Shipments', count: branchShipments.length },
                        { id: 'discounts', label: 'Discounts', count: discounts.filter(d => d.active).length }
                    ].map(t => {
                        const isActive = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id as SellTab)}
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
                                {t.badge && (
                                    <span style={{
                                        fontSize: '0.72rem',
                                        padding: '0.1rem 0.45rem',
                                        borderRadius: '10px',
                                        background: 'var(--success)',
                                        color: '#022c22',
                                        fontWeight: 800
                                    }}>
                                        {t.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>}

                {/* ── TAB 1: ALL SALES ── */}
                {activeTab === 'all_sales' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '2.3fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                        
                        {/* Table */}
                        <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Unified Commercial Ledger</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>Vehicle contract sales and counter POS receipts</p>
                                </div>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Showing {unifiedSalesList.length} total entries</span>
                            </div>

                            <div className="table-responsive">
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                            <th style={thStyle}>Type</th>
                                            <th style={thStyle}>Ref #</th>
                                            <th style={thStyle}>Date</th>
                                            <th style={thStyle}>Customer / Product</th>
                                            <th style={thStyle}>Total Amount</th>
                                            <th style={thStyle}>Status / Tender</th>
                                            <th style={thStyle}>Staff</th>
                                            <th style={{ ...thStyle, textAlign: 'right' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {unifiedSalesList.map((item, idx) => (
                                            <tr key={`${item.type}-${item.id}-${idx}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={tdStyle}>
                                                    <span style={{
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        padding: '0.2rem 0.55rem',
                                                        borderRadius: '4px',
                                                        background: item.type === 'Vehicle Deal' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                                                        color: item.type === 'Vehicle Deal' ? '#60a5fa' : '#c084fc'
                                                    }}>
                                                        {item.type}
                                                    </span>
                                                </td>
                                                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                                    {item.id}
                                                </td>
                                                <td style={{ ...tdStyle, fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                    {item.date}
                                                </td>
                                                <td style={tdStyle}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{item.client}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                                                </td>
                                                <td style={{ ...tdStyle, fontWeight: 700, fontSize: '0.92rem', color: 'white' }}>
                                                    {fmt(item.amount)}
                                                </td>
                                                <td style={tdStyle}>
                                                    <span className={`badge ${item.statusBadge === 'Closed' ? 'badge-success' : 'badge-info'}`} style={{ fontSize: '0.72rem' }}>
                                                        {item.statusBadge}
                                                    </span>
                                                </td>
                                                <td style={{ ...tdStyle, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {item.agent}
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                    {item.type === 'Vehicle Deal' ? (
                                                        <button 
                                                            onClick={() => setSelectedDeal(item.rawDeal!)}
                                                            className="btn-outline"
                                                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                                                        >
                                                            Contract
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => setSelectedReceipt(item.rawSale!)}
                                                            className="btn-outline"
                                                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                                                        >
                                                            Receipt
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}

                                        {unifiedSalesList.length === 0 && (
                                            <tr>
                                                <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                    No sales records found in current branch scope.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Leaderboard and Sales Volume */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="glass-panel" style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.65rem' }}>
                                    Staff Leaderboard (MTD)
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {sortedLeaderboard.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                                <span style={{ 
                                                    width: '24px', height: '24px', borderRadius: '50%', 
                                                    background: idx === 0 ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '0.75rem', fontWeight: 700 
                                                }}>
                                                    {idx + 1}
                                                </span>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.name}</span>
                                            </div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: idx === 0 ? 'var(--primary)' : 'white' }}>
                                                {fmt(item.commission)}
                                            </span>
                                        </div>
                                    ))}
                                    {sortedLeaderboard.length === 0 && (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>No agent commission logged yet.</p>
                                    )}
                                </div>
                            </div>

                            <div className="glass-panel" style={{ padding: '1.4rem' }}>
                                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                    Monthly Commercial Transactions
                                </h4>
                                <BarChart data={monthlyData.slice(6)} height={130} formatValue={v => `${v}`} />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TAB 2: LIST POS ── */}
                {activeTab === 'pos_list' && (
                    <div className="glass-panel" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Parts POS Sales Receipts</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>Over-the-counter spare parts point of sale receipts</p>
                            </div>
                            <button className="btn-primary" onClick={() => setActiveTab('pos')}>+ Open POS Terminal</button>
                        </div>

                        <div className="table-responsive">
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={thStyle}>Receipt #</th>
                                        <th style={thStyle}>Date &amp; Time</th>
                                        <th style={thStyle}>Customer</th>
                                        <th style={thStyle}>Items Sold</th>
                                        <th style={thStyle}>Subtotal</th>
                                        <th style={thStyle}>Discount</th>
                                        <th style={thStyle}>Final Total</th>
                                        <th style={thStyle}>Payment Tender</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {branchPartsSales.map(sale => (
                                        <tr key={sale.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600, color: 'var(--secondary-accent)' }}>
                                                {sale.saleNumber}
                                            </td>
                                            <td style={{ ...tdStyle, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {new Date(sale.date).toLocaleString()}
                                            </td>
                                            <td style={{ ...tdStyle, fontWeight: 600 }}>
                                                {sale.customerName || 'Walk-in Customer'}
                                            </td>
                                            <td style={tdStyle}>
                                                <span style={{ fontSize: '0.82rem' }}>{(sale.items || []).length} items</span>
                                            </td>
                                            <td style={tdStyle}>{fmt(sale.subtotal)}</td>
                                            <td style={{ ...tdStyle, color: sale.discount > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                                                {sale.discount > 0 ? `${sale.discount}%` : '0%'}
                                            </td>
                                            <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--success)' }}>
                                                {fmt(sale.total)}
                                            </td>
                                            <td style={tdStyle}>
                                                <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>{sale.paymentMethod}</span>
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                <button 
                                                    onClick={() => setSelectedReceipt(sale)}
                                                    className="btn-outline"
                                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                                                >
                                                    View Receipt
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {branchPartsSales.length === 0 && (
                                        <tr>
                                            <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No POS receipts recorded yet. Click &quot;+ Open POS Terminal&quot; to begin.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── TAB 3: POS TERMINAL ── */}
                {activeTab === 'pos' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem', alignItems: 'start' }}>
                        
                        {/* Left: Product Search and Catalog */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="glass-panel" style={{ padding: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                                    Search Parts Inventory (Name, Part Number, Barcode)
                                </label>
                                <input
                                    ref={posSearchRef}
                                    value={posSearch}
                                    onChange={e => setPosSearch(e.target.value)}
                                    placeholder="Type part name (e.g. Brake Pad, Spark Plug) or scan barcode..."
                                    style={{ ...inputStyle, fontSize: '0.95rem', padding: '0.8rem 1rem' }}
                                    autoFocus
                                />

                                {posFiltered.length > 0 && (
                                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '280px', overflowY: 'auto' }}>
                                        {posFiltered.map(p => {
                                            const stock = Number(p.stockQuantity) || 0;
                                            const isOut = stock <= 0;
                                            const isLow = !isOut && stock <= (p.reorderPoint ?? 5);
                                            return (
                                                <div
                                                    key={p.id}
                                                    onClick={() => !isOut && addToCart(p)}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        background: isOut ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)',
                                                        border: isOut ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '8px',
                                                        padding: '0.75rem 1rem',
                                                        cursor: isOut ? 'not-allowed' : 'pointer',
                                                        opacity: isOut ? 0.6 : 1,
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: isOut ? '#fca5a5' : 'white' }}>{p.name}</span>
                                                            <span style={{
                                                                fontSize: '0.72rem',
                                                                fontWeight: 700,
                                                                padding: '0.15rem 0.5rem',
                                                                borderRadius: '6px',
                                                                background: isOut ? 'rgba(239,68,68,0.18)' : isLow ? 'rgba(245,158,11,0.18)' : 'rgba(16,185,129,0.18)',
                                                                color: isOut ? '#ef4444' : isLow ? '#f59e0b' : '#10b981',
                                                                border: `1px solid ${isOut ? 'rgba(239,68,68,0.35)' : isLow ? 'rgba(245,158,11,0.35)' : 'rgba(16,185,129,0.35)'}`
                                                            }}>
                                                                {isOut ? '⛔ Unpurchased / Out of Stock' : isLow ? `⚠️ ${stock} in stock (Low)` : `📦 ${stock} in stock`}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                                            SKU: <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{p.partNumber}</span> &bull; {p.category} {p.brand ? `&bull; ${p.brand}` : ''}
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontWeight: 700, color: isOut ? 'var(--text-muted)' : 'var(--primary)', fontSize: '0.95rem' }}>{fmt(p.price)}</div>
                                                        <div style={{ fontSize: '0.72rem', color: isOut ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                                                            {isOut ? 'Cannot Sell (0)' : 'Click to add +'}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Catalog Quick Browse */}
                            <div className="glass-panel" style={{ padding: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                                    <h3 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 700 }}>Quick Selection Catalog</h3>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Only in-stock products sellable</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
                                    {partsInventory.slice(0, 20).map(p => {
                                        const stock = Number(p.stockQuantity) || 0;
                                        const isOut = stock <= 0;
                                        const isLow = !isOut && stock <= (p.reorderPoint ?? 5);
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => !isOut && addToCart(p)}
                                                disabled={isOut}
                                                style={{
                                                    textAlign: 'left',
                                                    padding: '0.75rem',
                                                    background: isOut ? 'rgba(239,68,68,0.03)' : 'rgba(255,255,255,0.02)',
                                                    border: isOut ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.06)',
                                                    borderRadius: '8px',
                                                    cursor: isOut ? 'not-allowed' : 'pointer',
                                                    opacity: isOut ? 0.55 : 1,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.35rem',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.partNumber}</span>
                                                    <span style={{
                                                        fontSize: '0.65rem',
                                                        fontWeight: 700,
                                                        padding: '0.1rem 0.35rem',
                                                        borderRadius: '4px',
                                                        background: isOut ? 'rgba(239,68,68,0.2)' : isLow ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.18)',
                                                        color: isOut ? '#ef4444' : isLow ? '#f59e0b' : '#10b981'
                                                    }}>
                                                        {isOut ? 'Stock: 0' : `Qty: ${stock}`}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {p.name}
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>{fmt(p.price)}</span>
                                                    <span style={{ fontSize: '0.68rem', color: isOut ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                                                        {isOut ? 'Out of Stock' : 'Add +'}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Right: Cart and Checkout */}
                        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem', position: 'sticky', top: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.65rem' }}>
                                <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>POS Cart</h3>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{cart.length} item(s)</span>
                            </div>

                            {cart.length === 0 ? (
                                <div style={{ padding: '2.5rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    Cart is empty. Search for parts or select from catalog.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
                                    {cart.map(item => (
                                        <div key={item.tempId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{fmt(item.unitPrice)} each</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <button onClick={() => updateCartQty(item.tempId, item.quantity - 1)} style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'white', cursor: 'pointer' }}>-</button>
                                                <span style={{ fontSize: '0.82rem', fontWeight: 700, minWidth: '18px', textAlign: 'center' }}>{item.quantity}</span>
                                                <button onClick={() => updateCartQty(item.tempId, item.quantity + 1)} style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'white', cursor: 'pointer' }}>+</button>
                                            </div>
                                            <div style={{ minWidth: '60px', textAlign: 'right', fontWeight: 700, fontSize: '0.82rem', color: 'white' }}>
                                                {fmt(item.lineTotal)}
                                            </div>
                                            <button onClick={() => removeFromCart(item.tempId)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.2rem' }}>✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Calculations */}
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                                    <span>Subtotal</span>
                                    <span>{fmt(cartSubtotal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Discount %</span>
                                    <input 
                                        type="number" 
                                        min="0" 
                                        max="100" 
                                        value={discountPct} 
                                        onChange={e => setDiscountPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                        style={{ ...inputStyle, width: '70px', padding: '0.25rem 0.5rem', textAlign: 'right', height: '30px' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.15rem', color: 'var(--success)', marginTop: '0.2rem' }}>
                                    <span>Net Total Due</span>
                                    <span>{fmt(cartTotal)}</span>
                                </div>
                            </div>

                            {/* Customer & Payment Tender */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                <input
                                    value={posCustomer}
                                    onChange={e => setPosCustomer(e.target.value)}
                                    placeholder="Customer name (e.g. John Mukasa / Walk-in)"
                                    style={inputStyle}
                                />
                                <select 
                                    value={payMethod} 
                                    onChange={e => setPayMethod(e.target.value as any)}
                                    style={{ ...inputStyle, height: '42px', cursor: 'pointer' }}
                                >
                                    {PAY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <input
                                    value={posNotes}
                                    onChange={e => setPosNotes(e.target.value)}
                                    placeholder="Sale notes or vehicle plate reference..."
                                    style={inputStyle}
                                />
                            </div>

                            <button 
                                onClick={handleCompletePOS} 
                                disabled={processingSale || cart.length === 0}
                                className="btn-primary"
                                style={{ padding: '0.9rem', fontSize: '0.95rem', fontWeight: 700 }}
                            >
                                {processingSale ? 'Processing...' : `Complete Sale & Print (${fmt(cartTotal)})`}
                            </button>

                            {lastReceipt && (
                                <button 
                                    onClick={() => setSelectedReceipt(lastReceipt)}
                                    className="btn-outline"
                                    style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                                >
                                    View Last Receipt ({lastReceipt.saleNumber})
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ── TAB 4: LIST DRAFTS ── */}
                {activeTab === 'drafts' && (
                    <div className="glass-panel" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Draft Sales &amp; Pending Financing</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>Deals awaiting bank credit approval, deposit clearance or final customer signoff</p>
                            </div>
                            <button className="btn-primary" onClick={() => setShowDraftModal(true)}>+ Add Draft Deal</button>
                        </div>

                        <div className="table-responsive">
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={thStyle}>Draft ID</th>
                                        <th style={thStyle}>Date</th>
                                        <th style={thStyle}>Customer</th>
                                        <th style={thStyle}>Proposed Vehicle</th>
                                        <th style={thStyle}>Price</th>
                                        <th style={thStyle}>Financing Details</th>
                                        <th style={thStyle}>Sales Advisor</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingDeals.map(deal => (
                                        <tr key={deal.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600, color: 'var(--warning)' }}>
                                                {deal.id}
                                            </td>
                                            <td style={{ ...tdStyle, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {deal.date}
                                            </td>
                                            <td style={{ ...tdStyle, fontWeight: 600 }}>{deal.client}</td>
                                            <td style={tdStyle}>{deal.vehicle}</td>
                                            <td style={{ ...tdStyle, fontWeight: 700, color: 'white' }}>
                                                {deal.salePrice ? fmt(deal.salePrice) : '—'}
                                            </td>
                                            <td style={tdStyle}>
                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                    {deal.financing ? `${fmt(deal.financing.monthlyPayment)} /mo (${deal.financing.term} mos)` : 'Under appraisal'}
                                                </span>
                                            </td>
                                            <td style={{ ...tdStyle, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{deal.agent}</td>
                                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                                    <button 
                                                        onClick={() => setSelectedDeal(deal)}
                                                        className="btn-outline"
                                                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                                                    >
                                                        Details
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            closeDeal({
                                                                ...deal,
                                                                status: 'Closed'
                                                            });
                                                            showToast(`Deal ${deal.id} marked as closed!`, 'success');
                                                        }}
                                                        className="btn-primary"
                                                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                                                    >
                                                        Approve &amp; Close
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {pendingDeals.length === 0 && (
                                        <tr>
                                            <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No draft or pending finance deals found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── TAB 5: QUOTATIONS ── */}
                {activeTab === 'quotations' && (
                    <div className="glass-panel" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Proforma Invoices &amp; Quotations</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>Formal client price quotations with validity periods and conversion tracking</p>
                            </div>
                            <button className="btn-primary" onClick={() => setShowAddQuoteModal(true)}>+ Add Quotation</button>
                        </div>

                        <div className="table-responsive">
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={thStyle}>Quote #</th>
                                        <th style={thStyle}>Date</th>
                                        <th style={thStyle}>Customer</th>
                                        <th style={thStyle}>Vehicle / Description</th>
                                        <th style={thStyle}>Net Payable</th>
                                        <th style={thStyle}>Validity</th>
                                        <th style={thStyle}>Status</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quotes.map(q => {
                                        const netPayable = q.listPrice - q.discount - q.tradeInValue;
                                        return (
                                            <tr key={q.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>{q.id}</td>
                                                <td style={{ ...tdStyle, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{q.date}</td>
                                                <td style={tdStyle}>
                                                    <div style={{ fontWeight: 600 }}>{q.clientName}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{q.clientPhone}</div>
                                                </td>
                                                <td style={tdStyle}>{q.vehicleLabel}</td>
                                                <td style={{ ...tdStyle, fontWeight: 700, color: 'white' }}>{fmt(netPayable)}</td>
                                                <td style={{ ...tdStyle, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{q.validDays} days</td>
                                                <td style={tdStyle}>
                                                    <span className={`badge ${
                                                        q.status === 'Accepted' ? 'badge-success' :
                                                        q.status === 'Sent' ? 'badge-info' :
                                                        q.status === 'Expired' ? 'badge-danger' : 'badge-warning'
                                                    }`} style={{ fontSize: '0.72rem' }}>
                                                        {q.status}
                                                    </span>
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                                                        <button 
                                                            onClick={() => setSelectedQuote(q)}
                                                            className="btn-outline" 
                                                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                                                        >
                                                            View
                                                        </button>
                                                        {q.status !== 'Accepted' && (
                                                            <button 
                                                                onClick={() => handleConvertQuoteToDeal(q)}
                                                                className="btn-primary" 
                                                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                                                            >
                                                                Convert to Deal
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {quotes.length === 0 && (
                                        <tr>
                                            <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No quotations created yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── TAB 6: SELL RETURNS ── */}
                {activeTab === 'sell_return' && (
                    <div className="glass-panel" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Customer Sell Returns &amp; Credit Notes</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>Returned parts, refunded sales, credit notes, and warranty compensations</p>
                            </div>
                            <button className="btn-primary" onClick={() => setShowAddReturnModal(true)}>+ Add Return Record</button>
                        </div>

                        <div className="table-responsive">
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={thStyle}>Return ID</th>
                                        <th style={thStyle}>Date</th>
                                        <th style={thStyle}>Type</th>
                                        <th style={thStyle}>Original Ref</th>
                                        <th style={thStyle}>Customer</th>
                                        <th style={thStyle}>Reason for Return</th>
                                        <th style={thStyle}>Refund Amount</th>
                                        <th style={thStyle}>Status</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {returns.map(ret => (
                                        <tr key={ret.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600, color: 'var(--danger)' }}>{ret.id}</td>
                                            <td style={{ ...tdStyle, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ret.date}</td>
                                            <td style={tdStyle}>
                                                <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                                    {ret.type}
                                                </span>
                                            </td>
                                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ret.reference}</td>
                                            <td style={{ ...tdStyle, fontWeight: 600 }}>{ret.client}</td>
                                            <td style={tdStyle}>{ret.reason}</td>
                                            <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--danger)' }}>{fmt(ret.amount)}</td>
                                            <td style={tdStyle}>
                                                <span className={`badge ${
                                                    ret.status === 'Approved' ? 'badge-success' :
                                                    ret.status === 'Rejected' ? 'badge-danger' : 'badge-warning'
                                                }`} style={{ fontSize: '0.72rem' }}>
                                                    {ret.status}
                                                </span>
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                {ret.status === 'Pending' ? (
                                                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                                                        <button 
                                                            onClick={() => {
                                                                setReturns(prev => prev.map(r => r.id === ret.id ? { ...r, status: 'Approved' } : r));
                                                                showToast(`Return ${ret.id} approved`, 'success');
                                                            }}
                                                            className="btn-primary" 
                                                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                                                        >
                                                            Approve
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                setReturns(prev => prev.map(r => r.id === ret.id ? { ...r, status: 'Rejected' } : r));
                                                                showToast(`Return ${ret.id} rejected`, 'warning');
                                                            }}
                                                            className="btn-outline" 
                                                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Completed</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}

                                    {returns.length === 0 && (
                                        <tr>
                                            <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No customer sell returns logged.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── TAB 7: SHIPMENTS ── */}
                {activeTab === 'shipments' && (
                    <div className="glass-panel" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Inbound Vehicle &amp; Parts Logistics</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>Consignments on order or transit connected to client deals and workshop supply</p>
                            </div>
                            <button className="btn-outline" onClick={() => router.push('/logistics')}>Go to Logistics Desk &rarr;</button>
                        </div>

                        <div className="table-responsive">
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={thStyle}>Order ID</th>
                                        <th style={thStyle}>Consignment Vehicle / Goods</th>
                                        <th style={thStyle}>Origin</th>
                                        <th style={thStyle}>Vessel</th>
                                        <th style={thStyle}>Estimated Arrival</th>
                                        <th style={thStyle}>Freight Cost</th>
                                        <th style={thStyle}>Status</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>Logistics Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {branchShipments.map(s => (
                                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>{s.orderId}</td>
                                            <td style={{ ...tdStyle, fontWeight: 600 }}>{s.vehicle}</td>
                                            <td style={{ ...tdStyle, fontSize: '0.85rem' }}>{s.from}</td>
                                            <td style={{ ...tdStyle, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.vessel || 'TBD'}</td>
                                            <td style={{ ...tdStyle, fontSize: '0.85rem' }}>{s.eta}</td>
                                            <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(s.cost)}</td>
                                            <td style={tdStyle}>
                                                <span className={`badge ${
                                                    s.status === 'Delivered' ? 'badge-success' :
                                                    s.status === 'Port Clearance' ? 'badge-warning' : 'badge-info'
                                                }`} style={{ fontSize: '0.72rem' }}>
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                <button 
                                                    onClick={() => router.push('/logistics')}
                                                    className="btn-outline"
                                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                                                >
                                                    Manage in Logistics
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {branchShipments.length === 0 && (
                                        <tr>
                                            <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No active shipments registered for this branch.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── TAB 8: DISCOUNTS ── */}
                {activeTab === 'discounts' && (
                    <div className="glass-panel" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Promotional &amp; Volume Discount Matrix</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>Configure automated promo codes and staff margin allowances for sales staff</p>
                            </div>
                            <button className="btn-primary" onClick={() => setShowAddDiscountModal(true)}>+ Add Discount Rule</button>
                        </div>

                        <div className="table-responsive">
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={thStyle}>Promo Code</th>
                                        <th style={thStyle}>Rule Name</th>
                                        <th style={thStyle}>Discount Type</th>
                                        <th style={thStyle}>Discount Value</th>
                                        <th style={thStyle}>Scope</th>
                                        <th style={thStyle}>Min. Spend</th>
                                        <th style={thStyle}>Expiry</th>
                                        <th style={thStyle}>Status</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>Toggle</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {discounts.map(d => (
                                        <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 800, color: 'var(--primary)' }}>
                                                {d.code}
                                            </td>
                                            <td style={{ ...tdStyle, fontWeight: 600 }}>{d.name}</td>
                                            <td style={tdStyle}>{d.type}</td>
                                            <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--success)' }}>
                                                {d.type === 'Percentage' ? `${d.value}%` : fmt(d.value)}
                                            </td>
                                            <td style={tdStyle}>
                                                <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                                    {d.appliesTo}
                                                </span>
                                            </td>
                                            <td style={tdStyle}>{fmt(d.minPurchase)}</td>
                                            <td style={{ ...tdStyle, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{d.expiresAt || 'Never'}</td>
                                            <td style={tdStyle}>
                                                <span className={`badge ${d.active ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.72rem' }}>
                                                    {d.active ? 'Active' : 'Disabled'}
                                                </span>
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                <button
                                                    onClick={() => {
                                                        setDiscounts(prev => prev.map(item => item.id === d.id ? { ...item, active: !item.active } : item));
                                                        showToast(`Rule ${d.code} ${d.active ? 'disabled' : 'enabled'}`, 'info');
                                                    }}
                                                    className="btn-outline"
                                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                                                >
                                                    {d.active ? 'Disable' : 'Enable'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {discounts.length === 0 && (
                                        <tr>
                                            <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No discount rules configured.
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

            {/* Modal: New Vehicle Deal / Draft */}
            {(showNewDealModal || showDraftModal) && (
                <Modal 
                    title={showDraftModal ? 'Create Draft Sale (F&I)' : 'Desking Console (F&I) — Close Vehicle Deal'} 
                    onClose={() => { setShowNewDealModal(false); setShowDraftModal(false); }} 
                    wide
                >
                    <form onSubmit={e => handleStartNewDeal(e, showDraftModal)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* Section 1: Deal Basics */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h4 style={{ color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', margin: 0 }}>
                                1. Customer &amp; Vehicle Selection
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Client / Buyer</label>
                                    <select 
                                        value={newDeal.client} 
                                        onChange={e => {
                                            const selected = clients.find(c => c.name === e.target.value);
                                            setNewDeal({ ...newDeal, client: e.target.value, clientId: selected?.id || '' });
                                        }} 
                                        required 
                                        style={{ ...inputStyle, height: '45px' }}
                                    >
                                        <option value="">Select a Client...</option>
                                        {clients.map(c => <option key={c.id} value={c.name}>{c.name} ({c.email || c.phone})</option>)}
                                        <option value="Walk-in Customer">Walk-in Customer</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Vehicle</label>
                                    <select 
                                        value={newDeal.vehicleId} 
                                        onChange={e => {
                                            const val = e.target.value;
                                            const car = vehicles.find(v => v.id === val);
                                            setNewDeal({ ...newDeal, vehicleId: val, vehicleLabel: '', salePrice: car ? car.price : '' });
                                        }} 
                                        required 
                                        style={{ ...inputStyle, height: '45px' }}
                                    >
                                        <option value="">Select Vehicle...</option>
                                        {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model} &mdash; {v.price}</option>)}
                                        <option value="outsourced">&#129309; Outsourced / Custom Vehicle...</option>
                                    </select>
                                    {newDeal.vehicleId === 'outsourced' && (
                                        <input
                                            required
                                            value={newDeal.vehicleLabel}
                                            onChange={e => setNewDeal({ ...newDeal, vehicleLabel: e.target.value })}
                                            placeholder="Enter model (e.g. 2025 Toyota Land Cruiser 300)"
                                            style={{ ...inputStyle, marginTop: '0.5rem' }}
                                        />
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <LabelInput label="Agreed Selling Price" value={newDeal.salePrice} onChange={(v: string) => setNewDeal({ ...newDeal, salePrice: v })} placeholder={fmt(120000)} required />
                                <LabelInput label="Sales Advisor" value={newDeal.agent} onChange={(v: string) => setNewDeal({ ...newDeal, agent: v })} required />
                            </div>
                        </div>

                        {/* Section 2: Trade-In */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h4 style={{ color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', margin: 0 }}>
                                2. Trade-In Vehicle Appraisal (Optional)
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <LabelInput label="Year" value={newDeal.tradeInYear} onChange={(v: string) => setNewDeal({ ...newDeal, tradeInYear: v })} placeholder="e.g. 2020" />
                                <LabelInput label="Make" value={newDeal.tradeInMake} onChange={(v: string) => setNewDeal({ ...newDeal, tradeInMake: v })} placeholder="e.g. Toyota" />
                                <LabelInput label="Model" value={newDeal.tradeInModel} onChange={(v: string) => setNewDeal({ ...newDeal, tradeInModel: v })} placeholder="e.g. Prado TX" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <LabelInput label="Mileage" value={newDeal.tradeInMileage} onChange={(v: string) => setNewDeal({ ...newDeal, tradeInMileage: v })} placeholder="e.g. 45000" />
                                <LabelInput label="Trade-In Allowance" value={newDeal.tradeInValue} onChange={(v: string) => setNewDeal({ ...newDeal, tradeInValue: v })} placeholder={fmt(0)} />
                            </div>
                        </div>

                        {/* Section 3: F&I Packages */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h4 style={{ color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', margin: 0 }}>
                                3. Warranty &amp; F&amp;I Packages
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {F_I_PACKAGES.map(pkg => (
                                    <label key={pkg.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', cursor: 'pointer', border: newDeal.selectedFiProducts.includes(pkg.id) ? '1px solid var(--primary)' : '1px solid transparent' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={newDeal.selectedFiProducts.includes(pkg.id)} 
                                            onChange={e => {
                                                const set = new Set(newDeal.selectedFiProducts);
                                                e.target.checked ? set.add(pkg.id) : set.delete(pkg.id);
                                                setNewDeal({ ...newDeal, selectedFiProducts: Array.from(set) });
                                            }} 
                                            style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }} 
                                        />
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{pkg.name}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+{formatRaw(pkg.price)}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Section 4: Payment Terms */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                                <h4 style={{ color: 'var(--primary)', margin: 0 }}>4. Payment Terms</h4>
                                <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem', borderRadius: '6px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setNewDeal({ ...newDeal, paymentType: 'Outright' })}
                                        style={{
                                            padding: '0.4rem 0.8rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                                            background: (newDeal.paymentType || 'Outright') === 'Outright' ? 'var(--primary)' : 'transparent',
                                            color: 'white'
                                        }}
                                    >
                                        Outright / Cash
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewDeal({ ...newDeal, paymentType: 'Financed' })}
                                        style={{
                                            padding: '0.4rem 0.8rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                                            background: newDeal.paymentType === 'Financed' ? 'var(--primary)' : 'transparent',
                                            color: 'white'
                                        }}
                                    >
                                        Financed / Installments
                                    </button>
                                </div>
                            </div>

                            {newDeal.paymentType === 'Financed' ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <LabelInput label="Down Payment" value={newDeal.downPayment} onChange={(v: string) => setNewDeal({ ...newDeal, downPayment: v })} placeholder={fmt(0)} />
                                    <LabelInput label="Annual Rate (%)" value={newDeal.apr} onChange={(v: string) => setNewDeal({ ...newDeal, apr: v })} placeholder="5.9" />
                                    <div>
                                        <label style={labelStyle}>Financing Term</label>
                                        <select value={newDeal.term} onChange={e => setNewDeal({ ...newDeal, term: e.target.value })} style={{ ...inputStyle, height: '45px' }}>
                                            <option value="24">24 Months</option>
                                            <option value="36">36 Months</option>
                                            <option value="48">48 Months</option>
                                            <option value="60">60 Months</option>
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={labelStyle}>Settlement Option</label>
                                        <select value={newDeal.paymentOption || 'Full'} onChange={e => setNewDeal({ ...newDeal, paymentOption: e.target.value as any })} style={{ ...inputStyle, height: '45px' }}>
                                            <option value="Full">100% Full Payment</option>
                                            <option value="Partial">Deposit + Balance Left</option>
                                        </select>
                                    </div>
                                    <LabelInput label="Amount Paid Upfront" value={newDeal.downPayment} onChange={(v: string) => setNewDeal({ ...newDeal, downPayment: v })} placeholder={fmt(0)} />
                                    <div>
                                        <label style={labelStyle}>Payment Method</label>
                                        <select value={newDeal.paymentMethod || 'Cash'} onChange={e => setNewDeal({ ...newDeal, paymentMethod: e.target.value as any })} style={{ ...inputStyle, height: '45px' }}>
                                            <option value="Cash">Cash</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                            <option value="Cheque">Cheque</option>
                                            <option value="Mobile Money">MTN / Airtel Mobile Money</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={labelStyle}>Notes &amp; Deal Conditions</label>
                            <textarea 
                                value={newDeal.notes} 
                                onChange={e => setNewDeal({ ...newDeal, notes: e.target.value })} 
                                style={{ ...inputStyle, height: '70px', resize: 'none' }} 
                                placeholder="Logbook transfer details, accessories included, special requests..." 
                            />
                        </div>

                        <button type="submit" className="btn-primary" style={{ padding: '1rem', fontSize: '1rem', fontWeight: 700 }}>
                            {showDraftModal ? 'Save Draft to Pipeline' : 'Submit & Book to General Ledger'}
                        </button>
                    </form>
                </Modal>
            )}

            {/* Modal: Deal Details */}
            {selectedDeal && (
                <Modal title={`Commercial Deal Contract — ${selectedDeal.id}`} onClose={() => setSelectedDeal(null)} wide>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <InfoBlock label="Client" value={selectedDeal.client} />
                            <InfoBlock label="Vehicle" value={selectedDeal.vehicle} />
                            <InfoBlock label="Sale Price" value={selectedDeal.salePrice ? fmt(selectedDeal.salePrice) : '—'} highlight="white" />
                            <InfoBlock label="Gross Margin" value={fmt(selectedDeal.margin)} highlight="var(--success)" />
                            <InfoBlock label="Commission" value={fmt(selectedDeal.commission)} highlight="var(--primary)" />
                            <InfoBlock label="Sales Agent" value={selectedDeal.agent} />
                            <InfoBlock label="Status" value={selectedDeal.status} highlight={selectedDeal.status === 'Closed' ? 'var(--success)' : 'var(--warning)'} />
                            <InfoBlock label="Date" value={selectedDeal.date} />
                        </div>

                        {selectedDeal.tradeIn && (
                            <InfoBlock 
                                label="Trade-In Vehicle" 
                                value={`${selectedDeal.tradeIn.year} ${selectedDeal.tradeIn.make} ${selectedDeal.tradeIn.model}`} 
                                sub={`Allowance: ${fmt(selectedDeal.tradeIn.value)} (${selectedDeal.tradeIn.mileage} miles)`} 
                            />
                        )}

                        {selectedDeal.financing && (
                            <InfoBlock 
                                label="Financing Arrangement" 
                                value={`${fmt(selectedDeal.financing.monthlyPayment)} /mo for ${selectedDeal.financing.term} months`} 
                                sub={`${selectedDeal.financing.apr}% APR | Financed: ${fmt(selectedDeal.financing.amountFinanced)}`} 
                            />
                        )}

                        {selectedDeal.fiProducts && <InfoBlock label="F&I Products" value={selectedDeal.fiProducts} />}
                        {selectedDeal.notes && <InfoBlock label="Special Deal Notes" value={selectedDeal.notes} />}

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button
                                className="btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}
                                onClick={() => handlePrintAgreement(selectedDeal)}
                            >
                                Print Official Sales Agreement
                            </button>
                            <button className="btn-outline" onClick={() => setSelectedDeal(null)}>Close</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal: POS Receipt Details */}
            {selectedReceipt && (
                <Modal title={`Point of Sale Receipt — ${selectedReceipt.saleNumber}`} onClose={() => setSelectedReceipt(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                            <div>
                                <h4 style={{ margin: 0, fontWeight: 700 }}>{business.name || 'GariSphere Parts Desk'}</h4>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer: {selectedReceipt.customerName || 'Walk-in Customer'}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{selectedReceipt.saleNumber}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(selectedReceipt.date).toLocaleString()}</div>
                            </div>
                        </div>

                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                        <th style={{ textAlign: 'left', padding: '0.4rem 0' }}>Item</th>
                                        <th style={{ textAlign: 'center', padding: '0.4rem 0' }}>Qty</th>
                                        <th style={{ textAlign: 'right', padding: '0.4rem 0' }}>Rate</th>
                                        <th style={{ textAlign: 'right', padding: '0.4rem 0' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selectedReceipt.items || []).map((it, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '0.4rem 0' }}>{it.name}</td>
                                            <td style={{ textAlign: 'center', padding: '0.4rem 0' }}>{it.quantity}</td>
                                            <td style={{ textAlign: 'right', padding: '0.4rem 0' }}>{fmt(it.unitPrice)}</td>
                                            <td style={{ textAlign: 'right', padding: '0.4rem 0', fontWeight: 600 }}>{fmt(it.lineTotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                                <span>Subtotal</span><span>{fmt(selectedReceipt.subtotal)}</span>
                            </div>
                            {selectedReceipt.discount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--warning)' }}>
                                    <span>Discount ({selectedReceipt.discount}%)</span>
                                    <span>-{fmt((selectedReceipt.subtotal * selectedReceipt.discount) / 100)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', color: 'var(--success)' }}>
                                <span>Paid Total ({selectedReceipt.paymentMethod})</span>
                                <span>{fmt(selectedReceipt.total)}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button className="btn-primary" style={{ flex: 1 }} onClick={() => window.print()}>Print Receipt</button>
                            <button className="btn-outline" onClick={() => setSelectedReceipt(null)}>Close</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal: Add Quotation */}
            {showAddQuoteModal && (
                <Modal title="Create Quotation / Proforma Invoice" onClose={() => setShowAddQuoteModal(false)} wide>
                    <form onSubmit={handleCreateQuote} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <LabelInput label="Customer Full Name" value={quoteForm.clientName} onChange={(v: string) => setQuoteForm({ ...quoteForm, clientName: v })} placeholder="Robert Kato" required />
                            <LabelInput label="Contact Phone" value={quoteForm.clientPhone} onChange={(v: string) => setQuoteForm({ ...quoteForm, clientPhone: v })} placeholder="+256 700 000 000" required />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <LabelInput label="Customer Email" value={quoteForm.clientEmail} onChange={(v: string) => setQuoteForm({ ...quoteForm, clientEmail: v })} placeholder="robert@example.com" />
                            <LabelInput label="Vehicle Description" value={quoteForm.vehicleLabel} onChange={(v: string) => setQuoteForm({ ...quoteForm, vehicleLabel: v })} placeholder="2024 Land Cruiser LC300" required />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <LabelInput label="List Price" value={quoteForm.listPrice} onChange={(v: string) => setQuoteForm({ ...quoteForm, listPrice: v })} placeholder={fmt(100000)} required />
                            <LabelInput label="Discount Amount" value={quoteForm.discount} onChange={(v: string) => setQuoteForm({ ...quoteForm, discount: v })} placeholder="0" />
                            <LabelInput label="Trade-In Allowance" value={quoteForm.tradeInValue} onChange={(v: string) => setQuoteForm({ ...quoteForm, tradeInValue: v })} placeholder="0" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <LabelInput label="Validity (Days)" value={quoteForm.validDays} onChange={(v: string) => setQuoteForm({ ...quoteForm, validDays: v })} placeholder="7" />
                            <LabelInput label="F&I Packages" value={quoteForm.fiProducts} onChange={(v: string) => setQuoteForm({ ...quoteForm, fiProducts: v })} placeholder="Extended Warranty" />
                        </div>
                        <div>
                            <label style={labelStyle}>Quotation Notes &amp; Terms</label>
                            <textarea 
                                value={quoteForm.notes} 
                                onChange={e => setQuoteForm({ ...quoteForm, notes: e.target.value })} 
                                style={{ ...inputStyle, height: '60px', resize: 'none' }}
                                placeholder="Valid while stock lasts, subject to prior sale..."
                            />
                        </div>
                        <button type="submit" className="btn-primary" style={{ padding: '0.85rem', fontWeight: 700 }}>
                            Issue &amp; Save Quotation
                        </button>
                    </form>
                </Modal>
            )}

            {/* Modal: View Quotation */}
            {selectedQuote && (
                <Modal title={`Proforma Invoice — ${selectedQuote.id}`} onClose={() => setSelectedQuote(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <InfoBlock label="Client" value={selectedQuote.clientName} sub={selectedQuote.clientPhone} />
                            <InfoBlock label="Vehicle" value={selectedQuote.vehicleLabel} />
                            <InfoBlock label="List Price" value={fmt(selectedQuote.listPrice)} />
                            <InfoBlock label="Discount Applied" value={fmt(selectedQuote.discount)} highlight="var(--warning)" />
                            <InfoBlock label="Trade-In Deduction" value={fmt(selectedQuote.tradeInValue)} />
                            <InfoBlock label="Net Payable" value={fmt(selectedQuote.listPrice - selectedQuote.discount - selectedQuote.tradeInValue)} highlight="var(--success)" />
                            <InfoBlock label="Status" value={selectedQuote.status} />
                            <InfoBlock label="Issued Date" value={selectedQuote.date} />
                        </div>
                        {selectedQuote.notes && <InfoBlock label="Terms & Notes" value={selectedQuote.notes} />}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {selectedQuote.status !== 'Accepted' && (
                                <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleConvertQuoteToDeal(selectedQuote)}>
                                    Convert to Closed Deal
                                </button>
                            )}
                            <button className="btn-outline" onClick={() => setSelectedQuote(null)}>Close</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal: Add Sell Return */}
            {showAddReturnModal && (
                <Modal title="Record Customer Return / Credit Note" onClose={() => setShowAddReturnModal(false)}>
                    <form onSubmit={handleCreateReturn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>Return Category</label>
                            <select 
                                value={returnForm.type} 
                                onChange={e => setReturnForm({ ...returnForm, type: e.target.value as any })}
                                style={{ ...inputStyle, height: '42px' }}
                            >
                                <option value="Parts POS Return">Parts POS Return</option>
                                <option value="Vehicle Sale Return">Vehicle Sale Return</option>
                            </select>
                        </div>
                        <LabelInput label="Original Reference (Sale # or Deal ID)" value={returnForm.reference} onChange={(v: string) => setReturnForm({ ...returnForm, reference: v })} placeholder="e.g. POS-2026-0004 or D-802" required />
                        <LabelInput label="Client Name" value={returnForm.client} onChange={(v: string) => setReturnForm({ ...returnForm, client: v })} placeholder="Customer Name" required />
                        <LabelInput label="Reason for Return" value={returnForm.reason} onChange={(v: string) => setReturnForm({ ...returnForm, reason: v })} placeholder="Defective component / cancelled booking" required />
                        <LabelInput label="Refund Amount" value={returnForm.amount} onChange={(v: string) => setReturnForm({ ...returnForm, amount: v })} placeholder={fmt(100000)} required />
                        <button type="submit" className="btn-primary" style={{ padding: '0.85rem', fontWeight: 700 }}>
                            Submit Return Request
                        </button>
                    </form>
                </Modal>
            )}

            {/* Modal: Add Discount Rule */}
            {showAddDiscountModal && (
                <Modal title="Create Promotional Discount Rule" onClose={() => setShowAddDiscountModal(false)}>
                    <form onSubmit={handleCreateDiscount} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <LabelInput label="Rule Name" value={discountForm.name} onChange={(v: string) => setDiscountForm({ ...discountForm, name: v })} placeholder="Corporate Fleet Promo" required />
                        <LabelInput label="Promo Code" value={discountForm.code} onChange={(v: string) => setDiscountForm({ ...discountForm, code: v })} placeholder="FLEET10" required />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Discount Type</label>
                                <select 
                                    value={discountForm.type} 
                                    onChange={e => setDiscountForm({ ...discountForm, type: e.target.value as any })}
                                    style={{ ...inputStyle, height: '42px' }}
                                >
                                    <option value="Percentage">Percentage (%)</option>
                                    <option value="Fixed Amount">Fixed Amount</option>
                                </select>
                            </div>
                            <LabelInput label="Value (% or Amount)" value={discountForm.value} onChange={(v: string) => setDiscountForm({ ...discountForm, value: v })} placeholder="10" required />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Applicable Module</label>
                                <select 
                                    value={discountForm.appliesTo} 
                                    onChange={e => setDiscountForm({ ...discountForm, appliesTo: e.target.value as any })}
                                    style={{ ...inputStyle, height: '42px' }}
                                >
                                    <option value="All Sales">All Sales</option>
                                    <option value="POS Only">POS Only</option>
                                    <option value="Vehicle Deals Only">Vehicle Deals Only</option>
                                </select>
                            </div>
                            <LabelInput label="Minimum Purchase" value={discountForm.minPurchase} onChange={(v: string) => setDiscountForm({ ...discountForm, minPurchase: v })} placeholder="0" />
                        </div>
                        <LabelInput label="Expiry Date" value={discountForm.expiresAt} onChange={(v: string) => setDiscountForm({ ...discountForm, expiresAt: v })} placeholder="2026-12-31" />
                        <button type="submit" className="btn-primary" style={{ padding: '0.85rem', fontWeight: 700 }}>
                            Activate Discount Rule
                        </button>
                    </form>
                </Modal>
            )}

            {/* Modal: Full Performance Report */}
            {showReport && (
                <Modal title="Commercial Sales Performance Report" onClose={() => setShowReport(false)} wide>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                            <InfoBlock label="Total Commercial Orders" value={`${totalCommercialSales}`} />
                            <InfoBlock label="Closed Vehicle Deals" value={`${closedDeals.length}`} highlight="var(--success)" />
                            <InfoBlock label="POS Receipts" value={`${branchPartsSales.length}`} highlight="var(--primary)" />
                            <InfoBlock label="Combined Gross Revenue" value={fmt(dealRevenue + posRevenue)} highlight="white" />
                            <InfoBlock label="Gross Margin & Markup" value={fmt(totalGrossMargin)} highlight="var(--success)" />
                            <InfoBlock label="Pending Draft Deals" value={`${pendingDeals.length}`} highlight="var(--warning)" />
                        </div>
                        <div>
                            <h4 style={{ marginBottom: '0.8rem', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Top Performer Breakdown</h4>
                            {sortedLeaderboard.map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                                    <span>{i + 1}. {item.name}</span>
                                    <span style={{ fontWeight: 600 }}>{fmt(item.commission)}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button className="btn-primary" onClick={() => { exportToCSV(unifiedSalesList, 'sales_full_report.csv'); setShowReport(false); }}>Download Report CSV</button>
                            <button className="btn-outline" onClick={() => setShowReport(false)}>Close</button>
                        </div>
                    </div>
                </Modal>
            )}

        </div>
    );
}

// Wrap in Suspense boundary for App Router useSearchParams compliance
export default function SalesPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }} />}>
            <SellDeskContent />
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

function InfoBlock({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: string }) {
    return (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem', marginTop: 0 }}>{label}</p>
            <p style={{ fontWeight: 600, color: highlight || 'white', fontSize: '0.9rem', margin: 0 }}>{value}</p>
            {sub && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', marginBottom: 0 }}>{sub}</p>}
        </div>
    );
}

const labelStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' };
const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-color)', padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box' };
const thStyle: React.CSSProperties = { padding: '0.85rem 1.25rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle: React.CSSProperties = { padding: '0.85rem 1.25rem', verticalAlign: 'middle', fontSize: '0.88rem' };
