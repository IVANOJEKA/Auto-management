'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Branch, useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

export type { Branch };
export type BranchSelection = 'All' | Branch;

// ─── Entity Interfaces ────────────────────────────────────────────────────────

export interface AcquisitionDetails {
    sellerName: string;
    sellerContact: string;
    sellerEmail: string;
    sellerAddress: string;
    sellerId: string;
    agreedPrice: number;
    paymentType: 'Cash' | 'Bank Transfer' | 'Mobile Money';
    paymentOption: 'Full' | 'Partial';
    amountPaid: number;
    balanceLeft: number;
    isSwap: boolean;
    swapVehicleMake?: string;
    swapVehicleModel?: string;
    swapVehicleYear?: number;
    swapVehicleMileage?: number;
    swapVehicleCondition?: string;
    swapTradeInValue?: number;
    swapTopUpAmount?: number;
    swapVehicleType?: 'Car' | 'Motorcycle' | 'Truck' | 'SUV' | 'Van' | 'Other';
    acquisitionDate: string;
}

export interface Vehicle {
    id: string;
    vin: string;
    make: string;
    model: string;
    year: number;
    color: string;
    mileage: number;
    cost: string;
    status: 'In Stock' | 'In Transit' | 'Reserved' | 'Sold';
    price: string;
    notes?: string;
    branch?: Branch;
    source?: 'Shipped' | 'Local Acquisition' | 'Swap Trade-in';
    acquisitionDetails?: AcquisitionDetails;
    type?: 'Car' | 'Motorcycle' | 'Truck' | 'SUV' | 'Van' | 'Other';
    photos?: string[];
    reconditioningCost?: string;
    numberPlate?: string;
}

export interface Lead {
    id: string;
    name: string;
    phone: string;
    email: string;
    interest: string;
    status: 'Hot' | 'Follow-up' | 'Cold';
    lastContact: string;
    notes: string;
    branch?: Branch;
}

export interface Client {
    id: string;
    name: string;
    email: string;
    phone: string;
    purchases: number;
    tv: string;
    kyc: 'Verified' | 'Pending';
    kycNotes?: string;
    branch?: Branch;
    address?: string;
    idPassport?: string;
    clientType?: 'Individual' | 'Company';
    regNo?: string;
    tinNo?: string;
}

export interface Deal {
    id: string;
    date: string;
    client: string;
    vehicle: string;
    salePrice: string;
    margin: string;
    commission: string;
    agent: string;
    status: 'Closed' | 'Pending Finance';
    fiProducts?: string;
    notes?: string;
    tradeIn?: { make: string; model: string; year: number; mileage: number; value: number };
    financing?: { apr: number; term: number; downPayment: number; amountFinanced: number; monthlyPayment: number };
    branch?: Branch;
}

export interface LogbookDetails {
    serialNo?: string;
    registeredOwner?: string;
    status: 'Dealer Stock' | 'Pending Transfer' | 'Transferred' | 'Missing';
    previousOwner?: string;
    newOwner?: string;
    transferInitiatedDate?: string;
    transferCompletedDate?: string;
    transferReference?: string;
    feePaid?: number;
    vehicleNumber?: string;
    tin?: string;
    amount?: number;
    transferType?: 'Normal' | 'Court Order';
    paymentOption?: 'Initial' | 'Full';
    amountPaid?: number;
    balanceLeft?: number;
}

export interface ComplianceRecord {
    id: string;
    vehicle: string;
    vin: string;
    client: string;
    taxes: string;
    logbook: string;
    plates: string;
    esign: 'Signed' | 'Pending';
    documents?: { name: string; date: string; url?: string; type?: string; size?: number }[];
    logbookDetails?: LogbookDetails;
    branch?: Branch;
}

export interface RepairOrder {
    ro: string;
    vehicle: string;
    client: string;
    issue: string;
    technician: string;
    status: 'In Bay' | 'Awaiting Parts' | 'Completed';
    due: string;
    laborHours?: number;
    parts?: string;
    cost?: string;
    partsList?: { partId: string; name: string; quantity: number; price: number }[];
    branch?: Branch;
}

export interface Invoice {
    id: string;
    date: string;
    client: string;
    amount: string;
    type: string;
    status: 'Paid' | 'Pending Finance' | 'Overdue';
    paidDate?: string;
    branch?: Branch;
    paymentMethod?: 'Cash' | 'Mobile Money' | 'Bank Transfer';
    paymentOption?: 'Full' | 'Installment';
    efrisStatus?: 'Not Synced' | 'Synced' | 'Offline Queue' | 'Failed';
    efrisFsdn?: string;
    efrisFiscalSign?: string;
    efrisQrCode?: string;
    clientTin?: string;
    vatAmount?: number;
    whtAmount?: number;
    efrisSyncedAt?: string;
}

export interface Shipment {
    id: string;
    orderId: string;
    vehicle: string;
    from: string;
    eta: string;
    status: 'Awaiting Vessel' | 'At Sea' | 'Port Clearance' | 'Delivered';
    cost: string;
    vessel: string;
    customsEntry?: string;
    branch?: Branch;
}

export interface PartItem {
    id: string;
    partNumber: string;
    name: string;
    description: string;
    cost: number;
    price: number;
    stockQuantity: number;
    category: 'Engine' | 'Electrical' | 'Suspension' | 'Body' | 'Consumable' | 'Other';
}

export interface LedgerEntry {
    id: string;
    date: string;
    accountId: string;
    accountName: string;
    type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
    amount: number;
    entryType: 'Debit' | 'Credit';
    description: string;
    referenceId?: string;
    branch?: Branch;
}

export interface ToastMessage {
    id: string;
    message: string;
    type: 'success' | 'danger' | 'info' | 'warning';
}

export interface WorkShift {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    branch: Branch;
    startTime: string;
    endTime?: string;
    status: 'Active' | 'Ended';
}

export type AppType = 'Test Drive' | 'Service Booking' | 'Delivery' | 'Viewing';
export type AppStatus = 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled';

export interface Appointment {
    id: string;
    type: AppType;
    clientName: string;
    clientPhone: string;
    vehicleLabel: string;
    date: string;   // ISO date YYYY-MM-DD
    time: string;   // e.g. '10:00'
    agent: string;
    notes: string;
    status: AppStatus;
    branch: Branch;
}

export interface TeamNotice {
    id: string;
    text: string;
    priority: 'Info' | 'Warning' | 'Urgent';
    author: string;
    branch: Branch;
    timestamp: string;
}

export interface Supplier {
    id: string;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    country: string;
    type: 'Local' | 'Overseas';
    rating: number;
    outstandingBalance: number;
    creditTerms: string;
    notes: string;
}

export interface SupplierTransaction {
    id: string;
    supplierId: string;
    date: string;
    type: 'Vehicle Purchase' | 'Parts Restock' | 'Payment';
    reference: string;
    amount: number;
    status: 'Settled' | 'Outstanding';
}

export interface PartsPurchaseOrderItem {
    id?: string;
    poId?: string;
    partNumber: string;
    name: string;
    quantity: number;
    unitCost: number;
}

export interface PartsPurchaseOrder {
    id: string;
    poNumber: string;
    supplierId?: string;
    status: 'Ordered' | 'Received' | 'Cancelled';
    totalCost: number;
    branch: Branch;
    notes: string;
    createdAt: string;
    items?: PartsPurchaseOrderItem[];
}


// ─── Bidirectional Mappings ──────────────────────────────────────────────────

const mapDbVehicle = (v: any): Vehicle => {
    const notesStr = v.notes || '';
    let type: 'Car' | 'Motorcycle' | 'Truck' | 'SUV' | 'Van' | 'Other' = 'Car';
    let cleanNotes = notesStr;
    const typeMatch = notesStr.match(/^\[Type:\s*([^\]]+)\]\s*/);
    if (typeMatch) {
        type = typeMatch[1] as any;
        cleanNotes = notesStr.slice(typeMatch[0].length);
    }
    const acq = v.acquisition_details || v.acquisitionDetails || {};
    return {
        id: v.id,
        vin: v.vin,
        make: v.make,
        model: v.model,
        year: v.year,
        color: v.color || '',
        mileage: Number(v.mileage) || 0,
        cost: v.cost || '$0',
        status: v.status || 'In Stock',
        price: v.price || '$0',
        notes: cleanNotes,
        branch: v.branch,
        source: v.source || 'Shipped',
        acquisitionDetails: v.acquisition_details || v.acquisitionDetails || undefined,
        photos: acq.photos || v.photos || [],
        reconditioningCost: acq.reconditioningCost || v.reconditioningCost || '0',
        numberPlate: acq.numberPlate || v.numberPlate || '',
        type
    };
};

const mapDbLead = (l: any): Lead => ({
    id: l.id,
    name: l.name,
    phone: l.phone || '',
    email: l.email || '',
    interest: l.interest || '',
    status: l.status || 'Hot',
    lastContact: l.last_contact || l.lastContact || 'Never',
    notes: l.notes || '',
    branch: l.branch
});

const mapDbClient = (c: any): Client => {
    const kycNotesStr = c.kyc_notes || c.kycNotes || '';
    let address = c.address || '';
    let idPassport = c.idPassport || '';
    let clientType: 'Individual' | 'Company' = (c.clientType as any) || 'Individual';
    let regNo = c.regNo || '';
    let tinNo = c.tinNo || '';
    let cleanKycNotes = kycNotesStr;

    // Pattern matching for serialized metadata fields
    const addrMatch = kycNotesStr.match(/\[Address:\s*([^\]]*?)\]/);
    if (addrMatch) {
        address = addrMatch[1];
        cleanKycNotes = cleanKycNotes.replace(addrMatch[0], '').trim();
    }
    const idPassMatch = kycNotesStr.match(/\[ID\/Passport:\s*([^\]]*?)\]/);
    if (idPassMatch) {
        idPassport = idPassMatch[1];
        cleanKycNotes = cleanKycNotes.replace(idPassMatch[0], '').trim();
    }
    const typeMatch = kycNotesStr.match(/\[ClientType:\s*([^\]]*?)\]/);
    if (typeMatch) {
        clientType = typeMatch[1] as 'Individual' | 'Company';
        cleanKycNotes = cleanKycNotes.replace(typeMatch[0], '').trim();
    }
    const regNoMatch = kycNotesStr.match(/\[RegNo:\s*([^\]]*?)\]/);
    if (regNoMatch) {
        regNo = regNoMatch[1];
        cleanKycNotes = cleanKycNotes.replace(regNoMatch[0], '').trim();
    }
    const tinMatch = kycNotesStr.match(/\[TIN:\s*([^\]]*?)\]/);
    if (tinMatch) {
        tinNo = tinMatch[1];
        cleanKycNotes = cleanKycNotes.replace(tinMatch[0], '').trim();
    }

    return {
        id: c.id,
        name: c.name,
        email: c.email || '',
        phone: c.phone || '',
        purchases: Number(c.purchases) || 0,
        tv: c.tv || '$0',
        kyc: c.kyc || 'Pending',
        kycNotes: cleanKycNotes,
        branch: c.branch,
        address,
        idPassport,
        clientType,
        regNo,
        tinNo
    };
};

const mapDbDeal = (d: any): Deal => ({
    id: d.id,
    date: d.date || '',
    client: d.client,
    vehicle: d.vehicle,
    salePrice: d.sale_price || d.salePrice || '$0',
    margin: d.margin || '$0',
    commission: d.commission || '$0',
    agent: d.agent || '',
    status: d.status || 'Closed',
    fiProducts: d.fi_products || d.fiProducts || '',
    notes: d.notes || '',
    tradeIn: d.trade_in || d.tradeIn || undefined,
    financing: d.financing || d.financing || undefined,
    branch: d.branch
});

const mapDbCompliance = (c: any): ComplianceRecord => ({
    id: c.id,
    vehicle: c.vehicle,
    vin: c.vin || '',
    client: c.client || 'Unassigned',
    taxes: c.taxes || 'Pending Assessment',
    logbook: c.logbook || 'Not Started',
    plates: c.plates || 'Pending Allocation',
    esign: c.esign || 'Pending',
    documents: c.documents || [],
    logbookDetails: c.logbook_details || c.logbookDetails || undefined,
    branch: c.branch
});

const mapDbRepairOrder = (r: any): RepairOrder => ({
    ro: r.ro,
    vehicle: r.vehicle,
    client: r.client,
    issue: r.issue,
    technician: r.technician || '',
    status: r.status || 'In Bay',
    due: r.due || '',
    laborHours: r.labor_hours !== undefined ? Number(r.labor_hours) : (r.laborHours !== undefined ? Number(r.laborHours) : undefined),
    parts: r.parts || '',
    cost: r.cost || '$0',
    partsList: r.parts_list || r.partsList || [],
    branch: r.branch
});

const mapDbInvoice = (i: any): Invoice => ({
    id: i.id,
    date: i.date || '',
    client: i.client,
    amount: i.amount,
    type: i.type,
    status: i.status || 'Pending Finance',
    paidDate: i.paid_date || i.paidDate || undefined,
    branch: i.branch,
    paymentMethod: i.payment_method || i.paymentMethod || undefined,
    paymentOption: i.payment_option || i.paymentOption || undefined,
    efrisStatus: i.efris_status || i.efrisStatus || 'Not Synced',
    efrisFsdn: i.efris_fsdn || i.efrisFsdn || undefined,
    efrisFiscalSign: i.efris_fiscal_sign || i.efrisFiscalSign || undefined,
    efrisQrCode: i.efris_qr_code || i.efrisQrCode || undefined,
    clientTin: i.client_tin || i.clientTin || undefined,
    vatAmount: i.vat_amount !== undefined ? Number(i.vat_amount) : (i.vatAmount !== undefined ? Number(i.vatAmount) : undefined),
    whtAmount: i.wht_amount !== undefined ? Number(i.wht_amount) : (i.whtAmount !== undefined ? Number(i.whtAmount) : undefined),
    efrisSyncedAt: i.efris_synced_at || i.efrisSyncedAt || undefined,
});

const mapDbShipment = (s: any): Shipment => ({
    id: s.id,
    orderId: s.order_id || s.orderId,
    vehicle: s.vehicle,
    from: s.from || '',
    eta: s.eta || '',
    status: s.status || 'Awaiting Vessel',
    cost: s.cost || '$0',
    vessel: s.vessel || '',
    customsEntry: s.customs_entry || s.customsEntry || undefined,
    branch: s.branch
});

const mapDbPartItem = (p: any): PartItem => ({
    id: p.id,
    partNumber: p.part_number || p.partNumber,
    name: p.name,
    description: p.description || '',
    cost: Number(p.cost) || 0,
    price: Number(p.price) || 0,
    stockQuantity: p.stock_quantity !== undefined ? Number(p.stock_quantity) : (p.stockQuantity !== undefined ? Number(p.stockQuantity) : 0),
    category: p.category || 'Other'
});

const mapDbLedgerEntry = (e: any): LedgerEntry => ({
    id: e.id,
    date: e.date || '',
    accountId: e.account_id || e.accountId,
    accountName: e.account_name || e.accountName,
    type: e.type,
    amount: Number(e.amount) || 0,
    entryType: e.entry_type || e.entryType,
    description: e.description || '',
    referenceId: e.reference_id || e.referenceId || undefined,
    branch: e.branch
});

const mapDbShift = (s: any): WorkShift => ({
    id: s.id,
    userId: s.user_id || s.userId || 'offline-usr',
    userName: s.user_name || s.userName || 'Operator',
    userEmail: s.user_email || s.userEmail || '',
    branch: s.branch || 'Kampala Main',
    startTime: s.start_time || s.startTime || '',
    endTime: s.end_time || s.endTime || undefined,
    status: s.status || 'Active'
});

const mapDbAppointment = (a: any): Appointment => ({
    id: a.id,
    type: a.type || 'Test Drive',
    clientName: a.client_name || a.clientName || '',
    clientPhone: a.client_phone || a.clientPhone || '',
    vehicleLabel: a.vehicle_label || a.vehicleLabel || '',
    date: a.date || '',
    time: a.time || '',
    agent: a.agent || '',
    notes: a.notes || '',
    status: a.status || 'Scheduled',
    branch: a.branch || 'Kampala Main'
});

const mapDbNotice = (n: any): TeamNotice => ({
    id: n.id,
    text: n.text || '',
    priority: n.priority || 'Info',
    author: n.author || '',
    branch: n.branch || 'Kampala Main',
    timestamp: n.created_at ? new Date(n.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ', Today' : 'Just now'
});

const mapDbSupplier = (s: any): Supplier => ({
    id: s.id,
    name: s.name || '',
    contactPerson: s.contact_person || s.contactPerson || '',
    phone: s.phone || '',
    email: s.email || '',
    address: s.address || '',
    country: s.country || '',
    type: s.type || 'Overseas',
    rating: Number(s.rating) || 5,
    outstandingBalance: Number(s.outstanding_balance || s.outstandingBalance || 0),
    creditTerms: s.credit_terms || s.creditTerms || 'Net 30',
    notes: s.notes || ''
});

const mapDbSupplierTransaction = (tx: any): SupplierTransaction => ({
    id: tx.id,
    supplierId: tx.supplier_id || tx.supplierId || '',
    date: tx.date || '',
    type: tx.type || 'Vehicle Purchase',
    reference: tx.reference || '',
    amount: Number(tx.amount) || 0,
    status: tx.status || 'Outstanding'
});

const mapDbPartsPurchaseOrder = (po: any): PartsPurchaseOrder => ({
    id: po.id,
    poNumber: po.po_number || po.poNumber || '',
    supplierId: po.supplier_id || po.supplierId || undefined,
    status: po.status || 'Ordered',
    totalCost: Number(po.total_cost || po.totalCost || 0),
    branch: po.branch || 'Kampala Main',
    notes: po.notes || '',
    createdAt: po.created_at || po.createdAt || '',
    items: (po.parts_purchase_order_items || po.items || []).map((item: any) => ({
        id: item.id,
        poId: item.po_id || item.poId,
        partNumber: item.part_number || item.partNumber || '',
        name: item.name || '',
        quantity: Number(item.quantity) || 0,
        unitCost: Number(item.unit_cost || item.unitCost || 0)
    }))
});


// ─── Context Type ─────────────────────────────────────────────────────────────

interface DataContextType {
    isLive: boolean;
    vehicles: Vehicle[];
    leads: Lead[];
    clients: Client[];
    deals: Deal[];
    complianceRecords: ComplianceRecord[];
    repairOrders: RepairOrder[];
    invoices: Invoice[];
    shipments: Shipment[];
    partsInventory: PartItem[];
    ledgerEntries: LedgerEntry[];
    toasts: ToastMessage[];
    workShifts: WorkShift[];
    activeShift: WorkShift | null;
    appointments: Appointment[];
    notices: TeamNotice[];
    suppliers: Supplier[];
    supplierTransactions: SupplierTransaction[];
    partsPurchaseOrders: PartsPurchaseOrder[];

    selectedBranch: BranchSelection;
    setSelectedBranch: (branch: BranchSelection) => void;

    // Vehicle operations
    addVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<void>;
    editVehicle: (id: string, updates: Partial<Vehicle>) => Promise<void>;
    deleteVehicle: (id: string) => Promise<void>;

    // Lead / Client operations
    addLead: (lead: Omit<Lead, 'id' | 'lastContact'>) => Promise<void>;
    updateLeadStatus: (id: string, status: Lead['status']) => Promise<void>;
    updateLeadNotes: (id: string, notes: string) => Promise<void>;
    convertLeadToClient: (leadId: string) => Promise<void>;
    addClient: (client: Omit<Client, 'id'>) => Promise<void>;
    updateClient: (id: string, updates: Partial<Client>) => Promise<void>;

    // Deal operations
    closeDeal: (deal: Omit<Deal, 'id' | 'date'>) => Promise<void>;

    // Compliance operations
    updateCompliance: (id: string, updates: Partial<ComplianceRecord>) => Promise<void>;
    addComplianceDocument: (id: string, doc: { name: string; url?: string; type?: string; size?: number }) => Promise<void>;
    removeComplianceDocument: (id: string, docIndex: number) => Promise<void>;

    // Repair order operations
    addRepairOrder: (ro: Omit<RepairOrder, 'ro'>) => Promise<void>;
    updateRepairOrderStatus: (roNum: string, status: RepairOrder['status']) => Promise<void>;
    updateRepairOrder: (roNum: string, updates: Partial<RepairOrder>) => Promise<void>;

    // Appointment operations
    addAppointment: (apt: Omit<Appointment, 'id' | 'status'> & { status?: AppStatus }) => Promise<void>;
    editAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
    updateAppointmentStatus: (id: string, status: AppStatus) => Promise<void>;
    deleteAppointment: (id: string) => Promise<void>;

    // Notices / bulletins operations
    addNotice: (notice: Omit<TeamNotice, 'id' | 'timestamp'>) => Promise<void>;
    deleteNotice: (id: string) => Promise<void>;

    // Supplier operations
    addSupplier: (supplier: Omit<Supplier, 'id' | 'outstandingBalance'> & { outstandingBalance?: number }) => Promise<void>;
    editSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
    deleteSupplier: (id: string) => Promise<void>;
    addSupplierTransaction: (tx: Omit<SupplierTransaction, 'id'>) => Promise<void>;
    deleteSupplierTransaction: (id: string) => Promise<void>;
    recordSupplierPayment: (supplierId: string, amount: number, reference: string) => Promise<void>;

    // Parts Purchase Orders operations
    createPartsPurchaseOrder: (po: Omit<PartsPurchaseOrder, 'id' | 'createdAt' | 'totalCost'>, items: PartsPurchaseOrderItem[]) => Promise<void>;
    updatePartsPurchaseOrderStatus: (id: string, status: PartsPurchaseOrder['status']) => Promise<void>;
    deletePartsPurchaseOrder: (id: string) => Promise<void>;

    // Invoice operations
    createInvoice: (invoice: Omit<Invoice, 'id' | 'date'>) => Promise<void>;
    updateInvoiceStatus: (id: string, status: Invoice['status'], paymentMethod?: Invoice['paymentMethod'], paymentOption?: Invoice['paymentOption']) => Promise<void>;
    syncInvoiceWithEfris: (invoiceId: string, clientTin?: string, whtApplicable?: boolean) => Promise<void>;

    // Extended Finance operations
    recordExpense: (category: string, amount: number, description: string, branch?: Branch) => Promise<void>;
    recordDeposit: (client: string, amount: number, method: string, notes: string, branch?: Branch) => Promise<void>;
    payCommission: (agent: string, amount: number, notes: string, branch?: Branch) => Promise<void>;
    recordURATax: (vehicleId: string, taxType: string, amount: number, notes: string, branch?: Branch) => Promise<void>;
    recordLogbookTransfer: (vin: string, fee: number, reference: string, notes: string, branch?: Branch) => Promise<void>;

    // Shipment operations
    createShipment: (shipment: Omit<Shipment, 'id' | 'orderId'>) => Promise<void>;
    updateShipmentStatus: (id: string, status: Shipment['status']) => Promise<void>;

    // Parts Operations
    addPartToRO: (roNum: string, partId: string, quantity: number) => Promise<void>;
    updatePartStock: (partId: string, quantityChange: number) => Promise<void>;

    // Trade-In Operations
    appraiseTradeIn: (dealId: string, tradeInDetails: NonNullable<Deal['tradeIn']>) => Promise<void>;
    updateDealFinancing: (dealId: string, financingDetails: NonNullable<Deal['financing']>) => Promise<void>;

    // General Ledger Operations
    addJournalEntry: (entries: Omit<LedgerEntry, 'id' | 'date'>[]) => Promise<void>;

    // Utility
    showToast: (message: string, type?: ToastMessage['type']) => void;
    removeToast: (id: string) => void;
    resetAllData: () => void;
    exportToCSV: (data: Record<string, unknown>[], filename: string) => void;
    startWorkShift: () => Promise<void>;
    endWorkShift: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// ─── Default Data ─────────────────────────────────────────────────────────────

const DEFAULT_VEHICLES: Vehicle[] = [
    { id: '1', vin: 'WBA5S7C56', make: 'BMW', model: 'X5 M Competition', year: 2024, color: 'Marina Bay Blue', mileage: 1200, cost: '$98,000', status: 'In Stock', price: '$114,000', branch: 'Kampala Main' },
    { id: '2', vin: 'WP0AA2996', make: 'Porsche', model: '911 Carrera S', year: 2023, color: 'Guards Red', mileage: 800, cost: '$120,000', status: 'In Transit', price: '$135,000', branch: 'Kampala Main' },
    { id: '3', vin: 'WDC463276', make: 'Mercedes', model: 'G63 AMG', year: 2022, color: 'Obsidian Black', mileage: 5400, cost: '$160,000', status: 'Reserved', price: '$185,000', branch: 'Jinja Showroom' },
    { id: '4', vin: 'JTJHY7AX6', make: 'Lexus', model: 'LX 600', year: 2024, color: 'Eminent White', mileage: 0, cost: '$105,000', status: 'In Stock', price: '$120,000', branch: 'Kampala Main' },
    { id: '5', vin: 'SALCA2EX6', make: 'Land Rover', model: 'Range Rover SV', year: 2023, color: 'Belgravia Green', mileage: 2100, cost: '$185,000', status: 'Sold', price: '$210,000', branch: 'Entebbe Hub' },
];

const DEFAULT_LEADS: Lead[] = [
    { id: 'L-101', name: 'James O.', phone: '+254 712 345 678', email: 'james@example.com', interest: 'Range Rover SV', status: 'Hot', lastContact: 'Today, 10:00 AM', notes: 'Ready to buy, needs financing options.', branch: 'Kampala Main' },
    { id: 'L-102', name: 'Sarah M.', phone: '+254 722 987 654', email: 'sarah@example.com', interest: 'BMW X5', status: 'Follow-up', lastContact: 'Yesterday', notes: 'Comparing with Toyota Land Cruiser.', branch: 'Jinja Showroom' },
    { id: 'L-103', name: 'Michael K.', phone: '+254 733 111 222', email: 'mike.k@example.com', interest: 'Porsche 911', status: 'Cold', lastContact: 'Oct 12', notes: 'Budget not confirmed yet.', branch: 'Entebbe Hub' },
];

const DEFAULT_CLIENTS: Client[] = [
    { id: 'C-5582', name: 'Daniel R.', email: 'dan@example.com', phone: '+254 700 123 456', purchases: 3, tv: '$420,000', kyc: 'Verified', branch: 'Kampala Main' },
    { id: 'C-5583', name: 'Alice W.', email: 'alice.w@example.com', phone: '+254 711 654 321', purchases: 1, tv: '$85,000', kyc: 'Pending', kycNotes: 'Awaiting national ID copy.', branch: 'Jinja Showroom' },
    { id: 'C-5584', name: 'Dr. Evans', email: 'evans@hospital.org', phone: '+254 722 000 111', purchases: 2, tv: '$210,000', kyc: 'Verified', branch: 'Entebbe Hub' },
];

const DEFAULT_DEALS: Deal[] = [
    { id: 'D-802', date: 'Today', client: 'Daniel R.', vehicle: 'Porsche 911 Carrera S', salePrice: '$138,500', margin: '$18,500', commission: '$1,850', agent: 'Alex T.', status: 'Closed', branch: 'Kampala Main' },
    { id: 'D-803', date: 'Yesterday', client: 'James O.', vehicle: 'Toyota Land Cruiser LC300', salePrice: '$123,200', margin: '$9,200', commission: '$920', agent: 'Sarah M.', status: 'Pending Finance', branch: 'Jinja Showroom' },
    { id: 'D-804', date: 'Oct 14', client: 'Dr. Evans', vehicle: 'Range Rover SV', salePrice: '$209,000', margin: '$24,000', commission: '$2,400', agent: 'Alex T.', status: 'Closed', branch: 'Kampala Main' },
];

const DEFAULT_COMPLIANCE: ComplianceRecord[] = [
    {
        id: '1', vehicle: 'Porsche 911 Carrera S', vin: 'WP0AA2996', client: 'Daniel R.', taxes: 'Cleared', logbook: 'Pending Transfer', plates: 'UBQ 911S', esign: 'Signed',
        documents: [{ name: 'Invoice.pdf', date: 'Oct 15' }],
        branch: 'Kampala Main',
        logbookDetails: {
            serialNo: 'LB-99218-UG',
            registeredOwner: 'GariSphere Dealers Ltd',
            status: 'Pending Transfer',
            previousOwner: 'GariSphere Dealers Ltd',
            newOwner: 'Daniel R.',
            transferInitiatedDate: '2026-05-20',
            transferReference: 'PRN-882910-KLA',
            feePaid: 150,
            vehicleNumber: 'UBQ 911S',
            tin: '1002938102',
            amount: 138500,
            transferType: 'Normal',
            paymentOption: 'Initial',
            amountPaid: 80000,
            balanceLeft: 58500
        }
    },
    {
        id: '2', vehicle: 'Toyota Land Cruiser LC300', vin: 'JTJHY7AXX', client: 'James O.', taxes: 'Pending Assessment', logbook: 'Not Started', plates: 'Pending Allocation', esign: 'Pending',
        documents: [],
        branch: 'Jinja Showroom',
        logbookDetails: {
            serialNo: 'LB-33821-UG',
            registeredOwner: 'Toyota Kenya Ltd',
            status: 'Dealer Stock',
            vehicleNumber: '',
            tin: '',
            amount: 0,
            transferType: 'Normal',
            paymentOption: 'Full',
            amountPaid: 0,
            balanceLeft: 0
        }
    },
    {
        id: '3', vehicle: 'Range Rover SV', vin: 'SALCA2EX6', client: 'Dr. Evans', taxes: 'Cleared', logbook: 'Transferred', plates: 'UBP 001A', esign: 'Signed',
        documents: [{ name: 'Logbook.pdf', date: 'Oct 10' }, { name: 'Customs.pdf', date: 'Oct 8' }],
        branch: 'Kampala Main',
        logbookDetails: {
            serialNo: 'LB-00122-UG',
            registeredOwner: 'Dr. Evans',
            status: 'Transferred',
            previousOwner: 'GariSphere Dealers Ltd',
            newOwner: 'Dr. Evans',
            transferInitiatedDate: '2026-05-08',
            transferCompletedDate: '2026-05-10',
            transferReference: 'PRN-773821-KLA',
            feePaid: 150,
            vehicleNumber: 'UBP 001A',
            tin: '1008892182',
            amount: 209000,
            transferType: 'Court Order',
            paymentOption: 'Full',
            amountPaid: 209000,
            balanceLeft: 0
        }
    },
];

const DEFAULT_RO: RepairOrder[] = [
    { ro: 'RO-9912', vehicle: 'BMW X5 M', client: 'Sarah M.', issue: '10,000km Service', technician: 'Mike R.', status: 'In Bay', due: 'Today, 4:00 PM', laborHours: 2, parts: 'Oil Filter, Spark Plugs', cost: '$450', branch: 'Jinja Showroom' },
    { ro: 'RO-9913', vehicle: 'Range Rover SV', client: 'Daniel R.', issue: 'Air Suspension Fault (Warranty)', technician: 'John D.', status: 'Awaiting Parts', due: 'Tomorrow', laborHours: 4, parts: 'Pending order', cost: '$1,200', branch: 'Kampala Main' },
    { ro: 'RO-9914', vehicle: 'Porsche 911', client: 'Dr. Evans', issue: 'Brake Pad Replacement', technician: 'Mike R.', status: 'Completed', due: 'Today, 1:00 PM', laborHours: 1.5, parts: 'Brembo Pads x4', cost: '$750', branch: 'Jinja Showroom' },
];

const DEFAULT_INVOICES: Invoice[] = [
    { id: 'INV-2026-001', date: 'Today', client: 'Dr. Evans', amount: '$210,000', type: 'Vehicle Sale', status: 'Paid', paidDate: 'Today', branch: 'Kampala Main' },
    { id: 'INV-2026-002', date: 'Yesterday', client: 'James O.', amount: '$114,000', type: 'Vehicle Sale', status: 'Pending Finance', branch: 'Jinja Showroom' },
    { id: 'INV-2026-003', date: 'Oct 12', client: 'Sarah M.', amount: '$1,200', type: 'Service & Parts', status: 'Paid', paidDate: 'Oct 13', branch: 'Jinja Showroom' },
    { id: 'INV-2026-004', date: 'Oct 10', client: 'Global Freight', amount: '$4,200', type: 'Logistics Cost (Out)', status: 'Overdue', branch: 'Entebbe Hub' },
];

const DEFAULT_SHIPMENTS: Shipment[] = [
    { id: '1', orderId: 'ORD-8910', vehicle: '2024 Toyota Land Cruiser LC300', from: 'Yokohama, JP', eta: '2026-06-15', status: 'At Sea', cost: '$4,200', vessel: 'Hoegh Target', branch: 'Entebbe Hub' },
    { id: '2', orderId: 'ORD-8912', vehicle: '2023 Mercedes Benz S580', from: 'Bremerhaven, DE', eta: '2026-06-03', status: 'Port Clearance', cost: '$3,800', vessel: 'Glovis Symphony', customsEntry: 'C/EN-2026-0044', branch: 'Entebbe Hub' },
    { id: '3', orderId: 'ORD-8915', vehicle: '2024 Lexus RX 350', from: 'Nagoya, JP', eta: '2026-07-02', status: 'Awaiting Vessel', cost: '$3,950', vessel: 'TBD', branch: 'Entebbe Hub' },
    { id: '4', orderId: 'ORD-8918', vehicle: '2022 Range Rover Vogue', from: 'Southampton, UK', eta: '2026-02-22', status: 'Delivered', cost: '$4,500', vessel: 'Morning Lena', customsEntry: 'C/EN-2026-0031', branch: 'Entebbe Hub' },
];

const DEFAULT_PARTS: PartItem[] = [
    { id: 'P-101', partNumber: 'OEM-123', name: 'Oil Filter', description: 'Standard synthetic oil filter', cost: 12, price: 25, stockQuantity: 45, category: 'Consumable' },
    { id: 'P-102', partNumber: 'OEM-124', name: 'Brake Pads (Front)', description: 'Ceramic brake pads set', cost: 45, price: 120, stockQuantity: 12, category: 'Consumable' },
    { id: 'P-103', partNumber: 'OEM-125', name: 'Alternator', description: '12V 150A Alternator', cost: 180, price: 350, stockQuantity: 3, category: 'Electrical' },
];

const DEFAULT_LEDGER: LedgerEntry[] = [
    { id: 'GL-1001', date: new Date().toISOString(), accountId: '1000', accountName: 'Cash', type: 'Asset', amount: 500000, entryType: 'Debit', description: 'Initial Capital', branch: 'Kampala Main' },
    { id: 'GL-1002', date: new Date().toISOString(), accountId: '3000', accountName: 'Owner Equity', type: 'Equity', amount: 500000, entryType: 'Credit', description: 'Initial Capital', branch: 'Kampala Main' },
];

const DEFAULT_APPOINTMENTS: Appointment[] = [
    { id: 'APT-001', type: 'Test Drive', clientName: 'David K.', clientPhone: '+256 700 123 456', vehicleLabel: '2024 BMW X5 M Competition', date: new Date().toISOString().split('T')[0], time: '10:00', agent: 'Alex T.', notes: 'Client interested in midnight blue.', status: 'Confirmed', branch: 'Kampala Main' },
    { id: 'APT-002', type: 'Viewing', clientName: 'Mary A.', clientPhone: '+256 712 987 654', vehicleLabel: '2024 Lexus LX 600', date: new Date().toISOString().split('T')[0], time: '14:30', agent: 'Sarah M.', notes: '', status: 'Scheduled', branch: 'Jinja Showroom' },
    { id: 'APT-003', type: 'Service Booking', clientName: 'Paul N.', clientPhone: '+256 751 456 789', vehicleLabel: '2022 Mercedes G63 AMG', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: '09:00', agent: 'Mike R.', notes: 'Oil change + brake check', status: 'Scheduled', branch: 'Entebbe Hub' },
    { id: 'APT-004', type: 'Delivery', clientName: 'Grace N.', clientPhone: '+256 702 111 222', vehicleLabel: '2024 Lexus LX 600', date: new Date(Date.now() + 172800000).toISOString().split('T')[0], time: '11:00', agent: 'Alex T.', notes: 'Full delivery package — plates ready.', status: 'Confirmed', branch: 'Kampala Main' },
];

const DEFAULT_NOTICES: TeamNotice[] = [
    {
        id: '1',
        text: 'Lexus LX 600 custom order arriving at Port Clearance on Monday. Entebbe team, prepare vehicle logs.',
        priority: 'Warning',
        author: 'Alex T.',
        branch: 'Kampala Main',
        timestamp: '10:15 AM, Today'
    },
    {
        id: '2',
        text: 'Reminder: Check client KYC verification status before printing any final Vehicle Sales Agreement.',
        priority: 'Urgent',
        author: 'Sarah M.',
        branch: 'Jinja Showroom',
        timestamp: 'Yesterday'
    }
];

// ─── Provider ─────────────────────────────────────────────────────────────────

/** Load from localStorage immediately — cache-then-network pattern */
function loadLS<T>(key: string, fallback: T[]): T[] {
    if (typeof window === 'undefined') return fallback;
    try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [selectedBranch, setSelectedBranchState] = useState<BranchSelection>('All');
    // Lazy initialisers: start empty — real data is loaded from bootstrap API.
    // Using DEFAULT_* fallbacks here caused demo data to reappear after reset.
    const [vehicles, setVehicles] = useState<Vehicle[]>(() => loadLS('dms_vehicles', []));
    const [leads, setLeads] = useState<Lead[]>(() => loadLS('dms_leads', []));
    const [clients, setClients] = useState<Client[]>(() => loadLS('dms_clients', []));
    const [deals, setDeals] = useState<Deal[]>(() => loadLS('dms_deals', []));
    const [complianceRecords, setComplianceRecords] = useState<ComplianceRecord[]>(() => loadLS('dms_compliance', []));
    const [repairOrders, setRepairOrders] = useState<RepairOrder[]>(() => loadLS('dms_repair_orders', []));
    const [invoices, setInvoices] = useState<Invoice[]>(() => loadLS('dms_invoices', []));
    const [shipments, setShipments] = useState<Shipment[]>(() => loadLS('dms_shipments', []));
    const [partsInventory, setPartsInventory] = useState<PartItem[]>(() => loadLS('dms_parts', []));
    const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(() => loadLS('dms_ledger', []));
    const [appointments, setAppointments] = useState<Appointment[]>(() => loadLS('dms_appointments', []));
    const [notices, setNotices] = useState<TeamNotice[]>(() => loadLS('dms_team_notices', []));
    const [suppliers, setSuppliers] = useState<Supplier[]>(() => loadLS('dms_suppliers', []));
    const [supplierTransactions, setSupplierTransactions] = useState<SupplierTransaction[]>(() => loadLS('dms_supplier_transactions', []));
    const [partsPurchaseOrders, setPartsPurchaseOrders] = useState<PartsPurchaseOrder[]>(() => loadLS('dms_parts_purchase_orders', []));
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [workShifts, setWorkShifts] = useState<WorkShift[]>([]);
    const [activeShift, setActiveShift] = useState<WorkShift | null>(null);

    const [isLive, setIsLive] = useState(false);

    // Auto-locking hook based on logged-in user role
    useEffect(() => {
        if (user && user.role !== 'Admin' && user.role !== 'Finance') {
            setSelectedBranchState(user.branch);
        }
    }, [user]);

    const setSelectedBranch = (branch: BranchSelection) => {
        if (user && user.role !== 'Admin' && user.role !== 'Finance') {
            setSelectedBranchState(user.branch);
            return;
        }
        setSelectedBranchState(branch);
        try { localStorage.setItem('dms_selected_branch', JSON.stringify(branch)); } catch { /* ignore */ }
    };

    const save = (key: string, data: unknown) => {
        try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore */ }
    };

    const fetchApi = async (url: string, options?: RequestInit) => {
        const sessionRes = await supabase.auth.getSession();
        const token = sessionRes.data.session?.access_token;
        const headers = new Headers(options?.headers);
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        const res = await fetch(url, {
            ...options,
            headers,
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.error || `HTTP ${res.status}`);
        }
        return res.json();
    };

    // Load data on mount
    useEffect(() => {
        const loadAllData = async () => {
            try {
                const bootstrap = await fetchApi('/api/bootstrap');

                setVehicles((bootstrap.vehicles || []).map(mapDbVehicle));
                setLeads((bootstrap.leads || []).map(mapDbLead));
                setClients((bootstrap.clients || []).map(mapDbClient));
                setDeals((bootstrap.deals || []).map(mapDbDeal));
                setComplianceRecords((bootstrap.compliance || []).map(mapDbCompliance));
                setRepairOrders((bootstrap.repairOrders || []).map(mapDbRepairOrder));
                setInvoices((bootstrap.invoices || []).map(mapDbInvoice));
                setShipments((bootstrap.shipments || []).map(mapDbShipment));
                setPartsInventory((bootstrap.parts || []).map(mapDbPartItem));
                setLedgerEntries((bootstrap.ledger || []).map(mapDbLedgerEntry));
                setWorkShifts((bootstrap.shifts || []).map(mapDbShift));
                setAppointments((bootstrap.appointments || []).map(mapDbAppointment));
                setNotices((bootstrap.notices || []).map(mapDbNotice));
                setSuppliers((bootstrap.suppliers || []).map(mapDbSupplier));
                setSupplierTransactions((bootstrap.supplierTransactions || []).map(mapDbSupplierTransaction));
                setPartsPurchaseOrders((bootstrap.partsPurchaseOrders || []).map(mapDbPartsPurchaseOrder));
                
                setIsLive(true);
                // Silent — no toast on every page load
            } catch (err) {
                console.warn("Could not load database from API routes. Using localStorage offline mode.", err);
                setIsLive(false);

                // FALLBACK TO LOCAL STORAGE
                try {
                    const s = (key: string, fallback: unknown) => {
                        const v = localStorage.getItem(key);
                        return v ? JSON.parse(v) : fallback;
                    };
                    const deduplicateById = <T extends { id: string }>(arr: T[]): T[] => {
                        const seen = new Set<string>();
                        return (arr || []).filter(item => {
                            if (!item || !item.id) return true;
                            if (seen.has(item.id)) return false;
                            seen.add(item.id);
                            return true;
                        });
                    };
                    const deduplicateByRo = (arr: RepairOrder[]): RepairOrder[] => {
                        const seen = new Set<string>();
                        return (arr || []).filter(item => {
                            if (!item || !item.ro) return true;
                            if (seen.has(item.ro)) return false;
                            seen.add(item.ro);
                            return true;
                        });
                    };
                    const rawVehicles = s('dms_vehicles', DEFAULT_VEHICLES) as Vehicle[];
                    const sanitizedVehicles = deduplicateById(rawVehicles.map(v => {
                        const mapped = mapDbVehicle(v);
                        mapped.id = v.id || mapped.id;
                        return mapped;
                    }));
                    setVehicles(sanitizedVehicles);
                    setLeads(deduplicateById(s('dms_leads', DEFAULT_LEADS)));
                    const rawClients = s('dms_clients', DEFAULT_CLIENTS) as Client[];
                    const sanitizedClients = deduplicateById(rawClients.map(c => {
                        const mapped = mapDbClient(c);
                        mapped.id = c.id || mapped.id;
                        return mapped;
                    }));
                    setClients(sanitizedClients);
                    setDeals(deduplicateById(s('dms_deals', DEFAULT_DEALS)));
                    setComplianceRecords(deduplicateById(s('dms_compliance', DEFAULT_COMPLIANCE)));
                    setRepairOrders(deduplicateByRo(s('dms_repair_orders', DEFAULT_RO)));
                    setInvoices(deduplicateById(s('dms_invoices', DEFAULT_INVOICES)));
                    setShipments(deduplicateById(s('dms_shipments', DEFAULT_SHIPMENTS)));
                    setPartsInventory(deduplicateById(s('dms_parts', DEFAULT_PARTS)));
                    setLedgerEntries(deduplicateById(s('dms_ledger', DEFAULT_LEDGER)));
                    setWorkShifts(deduplicateById(s('dms_work_shifts', [])));
                    setAppointments(deduplicateById(s('dms_appointments', DEFAULT_APPOINTMENTS)));
                    setNotices(deduplicateById(s('dms_team_notices', DEFAULT_NOTICES)));
                    setSuppliers(deduplicateById(s('dms_suppliers', [])));
                    setSupplierTransactions(deduplicateById(s('dms_supplier_transactions', [])));
                    setPartsPurchaseOrders(deduplicateById(s('dms_parts_purchase_orders', [])));
                } catch { /* ignore */ }
            }
        };

        loadAllData();
        
        try {
            const storedBranch = localStorage.getItem('dms_selected_branch');
            if (storedBranch) {
                const parsedBranch = JSON.parse(storedBranch);
                const storedUser = localStorage.getItem('garisphere_user');
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    if (parsedUser.role !== 'Admin' && parsedUser.role !== 'Finance') {
                        setSelectedBranchState(parsedUser.branch);
                        return;
                    }
                }
                setSelectedBranchState(parsedBranch);
            }
        } catch { /* ignore */ }
    }, []);

    // Evaluate active shift whenever user or loaded shifts change
    useEffect(() => {
        if (user) {
            const active = workShifts.find(s => s.userEmail.toLowerCase() === user.email.toLowerCase() && s.status === 'Active');
            if (active) {
                setActiveShift(active);
            } else {
                try {
                    const storedActive = localStorage.getItem('dms_active_shift');
                    if (storedActive) {
                        const parsed = JSON.parse(storedActive);
                        if (parsed.userEmail.toLowerCase() === user.email.toLowerCase() && parsed.status === 'Active') {
                            setActiveShift(parsed);
                        } else {
                            setActiveShift(null);
                        }
                    } else {
                        setActiveShift(null);
                    }
                } catch {
                    setActiveShift(null);
                }
            }
        } else {
            setActiveShift(null);
        }
    }, [user, workShifts]);

    // ─── Toast ───────────────────────────────────────────────────────────────
    const showToast = (message: string, type: ToastMessage['type'] = 'success') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 4000);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    // ─── CSV Export ───────────────────────────────────────────────────────────
    const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
        if (!data.length) return;
        const headers = Object.keys(data[0]);
        const rows = data.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`${filename} exported successfully.`, 'success');
    };

    // ─── Reset ────────────────────────────────────────────────────────────────
    const resetAllData = async () => {
        const EMPTY: never[] = [];

        // Step 1: If live (Supabase), wipe the cloud DB first
        if (isLive) {
            try {
                showToast('Resetting database — please wait…', 'info');
                await fetchApi('/api/reset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ confirmToken: 'RESET_ALL_DATA' }),
                });
            } catch (err: any) {
                showToast(`Reset failed: ${err?.message || 'Server error'}`, 'danger');
                return; // Abort — don't clear local state if cloud wipe failed
            }
        }

        // Step 2: Clear all React state to empty arrays (NOT demo defaults)
        setVehicles(EMPTY); setLeads(EMPTY); setClients(EMPTY);
        setDeals(EMPTY); setComplianceRecords(EMPTY);
        setRepairOrders(EMPTY); setInvoices(EMPTY); setShipments(EMPTY);
        setPartsInventory(EMPTY); setLedgerEntries(EMPTY);
        setAppointments(EMPTY); setNotices(EMPTY);
        setSuppliers(EMPTY); setSupplierTransactions(EMPTY);
        setPartsPurchaseOrders(EMPTY);

        // Step 3: Clear localStorage cache so refresh stays empty
        [
            'dms_vehicles','dms_leads','dms_clients','dms_deals','dms_compliance',
            'dms_repair_orders','dms_invoices','dms_shipments','dms_parts','dms_ledger',
            'dms_appointments','dms_team_notices','dms_suppliers',
            'dms_supplier_transactions','dms_parts_purchase_orders'
        ].forEach(k => { try { localStorage.removeItem(k); } catch { /* ignore */ } });

        showToast('✅ All data wiped successfully. The system is now empty.', 'success');
    };

    // ─── Vehicle Operations ───────────────────────────────────────────────────
    const addVehicle = async (vehicle: Omit<Vehicle, 'id'>) => {
        const type = vehicle.type || 'Car';
        const serializedNotes = `[Type: ${type}] ${vehicle.notes || ''}`;

        if (isLive) {
            try {
                const apiPayload: any = {
                    ...vehicle,
                    notes: serializedNotes,
                    acquisitionDetails: {
                        ...vehicle.acquisitionDetails,
                        photos: vehicle.photos || [],
                        reconditioningCost: vehicle.reconditioningCost || '0',
                        numberPlate: vehicle.numberPlate || ''
                    }
                };
                delete apiPayload.photos;
                delete apiPayload.reconditioningCost;
                delete apiPayload.numberPlate;
                delete apiPayload.type;

                const newV = await fetchApi('/api/vehicles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(apiPayload)
                });
                const mappedV = mapDbVehicle(newV);
                setVehicles(prev => [...prev, mappedV]);

                // Create compliance record automatically
                const newCompPayload = {
                    id: mappedV.id,
                    vehicle: `${mappedV.year} ${mappedV.make} ${mappedV.model}`,
                    vin: mappedV.vin,
                    client: 'Unassigned',
                    taxes: 'Pending Assessment',
                    logbook: 'Not Started',
                    plates: 'Pending Allocation',
                    esign: 'Pending',
                    documents: [],
                    logbookDetails: {
                        status: 'Dealer Stock',
                        registeredOwner: 'GariSphere Dealers Ltd'
                    },
                    branch: mappedV.branch
                };
                const newComp = await fetchApi('/api/compliance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newCompPayload)
                });
                setComplianceRecords(prev => [...prev, mapDbCompliance(newComp)]);

                showToast(`${mappedV.year} ${mappedV.make} ${mappedV.model} added to live inventory.`, 'success');
                return;
            } catch (err) {
                console.error("API addVehicle failed, falling back to local:", err);
            }
        }

        // Local fallback
        const localDbVehicle = {
            ...vehicle,
            notes: serializedNotes,
            acquisitionDetails: {
                ...vehicle.acquisitionDetails,
                photos: vehicle.photos || [],
                reconditioningCost: vehicle.reconditioningCost || '0',
                numberPlate: vehicle.numberPlate || ''
            }
        };
        delete (localDbVehicle as any).photos;
        delete (localDbVehicle as any).reconditioningCost;
        delete (localDbVehicle as any).numberPlate;
        delete (localDbVehicle as any).type;
        const newV: Vehicle = { ...mapDbVehicle(localDbVehicle), id: Date.now().toString() };
        
        const updated = [...vehicles, newV];
        setVehicles(updated);
        
        const dbVehiclesToSave = updated.map(v => {
            const copy = {
                ...v,
                notes: `[Type: ${v.type || 'Car'}] ${v.notes || ''}`,
                acquisitionDetails: {
                    ...v.acquisitionDetails,
                    photos: v.photos || [],
                    reconditioningCost: v.reconditioningCost || '0'
                }
            };
            delete (copy as any).photos;
            delete (copy as any).reconditioningCost;
            delete (copy as any).type;
            return copy;
        });
        save('dms_vehicles', dbVehiclesToSave);

        const newComp: ComplianceRecord = {
            id: newV.id, vehicle: `${newV.year} ${newV.make} ${newV.model}`,
            vin: newV.vin, client: 'Unassigned', taxes: 'Pending Assessment',
            logbook: 'Not Started', plates: 'Pending Allocation', esign: 'Pending', documents: [],
            logbookDetails: {
                status: 'Dealer Stock',
                registeredOwner: 'GariSphere Dealers Ltd'
            }
        };
        const updatedComp = [...complianceRecords, newComp];
        setComplianceRecords(updatedComp); save('dms_compliance', updatedComp);
        showToast(`${newV.year} ${newV.make} ${newV.model} added to local storage.`, 'success');
    };

    const editVehicle = async (id: string, updates: Partial<Vehicle>) => {
        const currentVehicle = vehicles.find(v => v.id === id);
        const mergedType = updates.type !== undefined ? updates.type : (currentVehicle?.type || 'Car');
        const mergedNotes = updates.notes !== undefined ? updates.notes : (currentVehicle?.notes || '');
        const serializedNotes = `[Type: ${mergedType}] ${mergedNotes}`;

        const mergedPhotos = updates.photos !== undefined ? updates.photos : (currentVehicle?.photos || []);
        const mergedReconditioningCost = updates.reconditioningCost !== undefined ? updates.reconditioningCost : (currentVehicle?.reconditioningCost || '0');

        if (isLive) {
            try {
                const mergedNumberPlate = updates.numberPlate !== undefined ? updates.numberPlate : (currentVehicle?.numberPlate || '');
                const apiPayload: any = {
                    ...updates,
                    notes: serializedNotes,
                    acquisition_details: {
                        ...(updates.acquisitionDetails || currentVehicle?.acquisitionDetails),
                        photos: mergedPhotos,
                        reconditioningCost: mergedReconditioningCost,
                        numberPlate: mergedNumberPlate
                    }
                };
                delete apiPayload.photos;
                delete apiPayload.reconditioningCost;
                delete apiPayload.numberPlate;
                delete apiPayload.type;
                delete apiPayload.acquisitionDetails;

                const updated = await fetchApi(`/api/vehicles/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(apiPayload)
                });
                const mappedV = mapDbVehicle(updated);
                setVehicles(prev => prev.map(v => v.id === id ? mappedV : v));
                showToast('Vehicle updated successfully on server.', 'success');
                return;
            } catch (err) {
                console.error("API editVehicle failed, falling back to local:", err);
            }
        }

        // Local fallback
        const updatedLocal = vehicles.map(v => {
            if (v.id === id) {
                return {
                    ...v,
                    ...updates,
                    type: mergedType,
                    notes: mergedNotes,
                    photos: mergedPhotos,
                    reconditioningCost: mergedReconditioningCost
                };
            }
            return v;
        });
        setVehicles(updatedLocal);
        
        const dbVehiclesToSave = updatedLocal.map(v => {
            const copy = {
                ...v,
                notes: `[Type: ${v.type || 'Car'}] ${v.notes || ''}`,
                acquisitionDetails: {
                    ...v.acquisitionDetails,
                    photos: v.photos || [],
                    reconditioningCost: v.reconditioningCost || '0'
                }
            };
            delete (copy as any).photos;
            delete (copy as any).reconditioningCost;
            delete (copy as any).type;
            return copy;
        });
        save('dms_vehicles', dbVehiclesToSave);
        showToast('Vehicle updated successfully.', 'success');
    };

    const deleteVehicle = async (id: string) => {
        if (isLive) {
            try {
                await fetchApi(`/api/vehicles/${id}`, { method: 'DELETE' });
                setVehicles(prev => prev.filter(v => v.id !== id));
                setComplianceRecords(prev => prev.filter(r => r.id !== id));
                showToast('Vehicle removed from live server.', 'warning');
                return;
            } catch (err) {
                console.error("API deleteVehicle failed, falling back to local:", err);
            }
        }

        // Local fallback
        const v = vehicles.find(v => v.id === id);
        const updated = vehicles.filter(v => v.id !== id);
        setVehicles(updated);
        
        const dbVehiclesToSave = updated.map(v => {
            const copy = { ...v, notes: `[Type: ${v.type || 'Car'}] ${v.notes || ''}` };
            delete (copy as any).type;
            return copy;
        });
        save('dms_vehicles', dbVehiclesToSave);

        const updatedComp = complianceRecords.filter(r => r.id !== id);
        setComplianceRecords(updatedComp); save('dms_compliance', updatedComp);
        showToast(`${v ? `${v.make} ${v.model}` : 'Vehicle'} removed from local storage.`, 'warning');
    };

    // ─── Lead / Client Operations ─────────────────────────────────────────────
    const addLead = async (lead: Omit<Lead, 'id' | 'lastContact'>) => {
        if (isLive) {
            try {
                const newL = await fetchApi('/api/leads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(lead)
                });
                setLeads(prev => [...prev, mapDbLead(newL)]);
                showToast(`Lead for ${lead.name} registered.`, 'info');
                return;
            } catch (err) {
                console.error("API addLead failed, falling back to local:", err);
            }
        }

        const uniqueId = `L-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
        const newL: Lead = { ...lead, id: uniqueId, lastContact: 'Just now' };
        const updated = [...leads, newL];
        setLeads(updated); save('dms_leads', updated);
        showToast(`Lead for ${newL.name} registered locally.`, 'info');
    };

    const updateLeadStatus = async (id: string, status: Lead['status']) => {
        if (isLive) {
            try {
                const updated = await fetchApi(`/api/leads/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status, lastContact: 'Just now' })
                });
                setLeads(prev => prev.map(l => l.id === id ? mapDbLead(updated) : l));
                showToast(`Lead priority updated to ${status}.`, 'info');
                return;
            } catch (err) {
                console.error("API updateLeadStatus failed, falling back to local:", err);
            }
        }

        const updatedLocal = leads.map(l => l.id === id ? { ...l, status, lastContact: 'Just now' } : l);
        setLeads(updatedLocal); save('dms_leads', updatedLocal);
        showToast(`Lead priority updated to ${status}.`, 'info');
    };

    const updateLeadNotes = async (id: string, notes: string) => {
        if (isLive) {
            try {
                const updated = await fetchApi(`/api/leads/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notes })
                });
                setLeads(prev => prev.map(l => l.id === id ? mapDbLead(updated) : l));
                return;
            } catch (err) {
                console.error("API updateLeadNotes failed, falling back to local:", err);
            }
        }

        const updatedLocal = leads.map(l => l.id === id ? { ...l, notes } : l);
        setLeads(updatedLocal); save('dms_leads', updatedLocal);
    };

    const convertLeadToClient = async (leadId: string) => {
        const lead = leads.find(l => l.id === leadId);
        if (!lead) return;
        const existing = clients.find(c => c.email === lead.email);
        if (existing) { showToast(`${lead.name} is already a client.`, 'warning'); return; }

        if (isLive) {
            try {
                const newClientPayload = {
                    name: lead.name,
                    email: lead.email,
                    phone: lead.phone,
                    purchases: 0,
                    tv: '$0',
                    kyc: 'Pending',
                    kycNotes: '[Address: ] [ID/Passport: ] [ClientType: Individual] [RegNo: ] [TIN: ]',
                    branch: lead.branch
                };
                const newC = await fetchApi('/api/clients', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newClientPayload)
                });
                const mappedC = mapDbClient(newC);
                setClients(prev => [...prev, mappedC]);

                await fetchApi(`/api/leads/${leadId}`, { method: 'DELETE' });
                setLeads(prev => prev.filter(l => l.id !== leadId));

                showToast(`${lead.name} converted to client ${mappedC.id}.`, 'success');
                return;
            } catch (err) {
                console.error("API convertLeadToClient failed, falling back to local:", err);
            }
        }

        const uniqueId = `C-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
        const newClient: Client = {
            id: uniqueId, name: lead.name,
            email: lead.email, phone: lead.phone, purchases: 0, tv: '$0', kyc: 'Pending',
            address: '', idPassport: '', kycNotes: '', clientType: 'Individual', regNo: '', tinNo: ''
        };
        const updatedClients = [...clients, newClient];
        setClients(updatedClients);
        
        const dbClientsToSave = updatedClients.map(c => {
            const copy = { ...c, kyc_notes: `[Address: ${c.address || ''}] [ID/Passport: ${c.idPassport || ''}] [ClientType: ${c.clientType || 'Individual'}] [RegNo: ${c.regNo || ''}] [TIN: ${c.tinNo || ''}] ${c.kycNotes || ''}` };
            delete (copy as any).address;
            delete (copy as any).idPassport;
            delete (copy as any).kycNotes;
            delete (copy as any).clientType;
            delete (copy as any).regNo;
            delete (copy as any).tinNo;
            return copy;
        });
        save('dms_clients', dbClientsToSave);
        const updatedLeads = leads.filter(l => l.id !== leadId);
        setLeads(updatedLeads); save('dms_leads', updatedLeads);
        showToast(`${lead.name} converted to client ${newClient.id} locally.`, 'success');
    };

    const addClient = async (client: Omit<Client, 'id'>) => {
        const serializedNotes = `[Address: ${client.address || ''}] [ID/Passport: ${client.idPassport || ''}] [ClientType: ${client.clientType || 'Individual'}] [RegNo: ${client.regNo || ''}] [TIN: ${client.tinNo || ''}] ${client.kycNotes || ''}`;

        if (isLive) {
            try {
                const apiPayload = { ...client, kycNotes: serializedNotes };
                delete (apiPayload as any).address;
                delete (apiPayload as any).idPassport;
                delete (apiPayload as any).clientType;
                delete (apiPayload as any).regNo;
                delete (apiPayload as any).tinNo;
                const newC = await fetchApi('/api/clients', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(apiPayload)
                });
                setClients(prev => [...prev, mapDbClient(newC)]);
                showToast(`Client ${client.name} added to database.`, 'success');
                return;
            } catch (err) {
                console.error("API addClient failed, falling back to local:", err);
            }
        }

        const uniqueId = `C-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
        const localDbClient = { ...client, kycNotes: serializedNotes };
        delete (localDbClient as any).address;
        delete (localDbClient as any).idPassport;
        delete (localDbClient as any).clientType;
        delete (localDbClient as any).regNo;
        delete (localDbClient as any).tinNo;
        const newC: Client = { ...mapDbClient(localDbClient), id: uniqueId };
        const updated = [...clients, newC];
        setClients(updated);

        const dbClientsToSave = updated.map(c => {
            const copy = { ...c, kyc_notes: `[Address: ${c.address || ''}] [ID/Passport: ${c.idPassport || ''}] [ClientType: ${c.clientType || 'Individual'}] [RegNo: ${c.regNo || ''}] [TIN: ${c.tinNo || ''}] ${c.kycNotes || ''}` };
            delete (copy as any).address;
            delete (copy as any).idPassport;
            delete (copy as any).kycNotes;
            delete (copy as any).clientType;
            delete (copy as any).regNo;
            delete (copy as any).tinNo;
            return copy;
        });
        save('dms_clients', dbClientsToSave);
        showToast(`Client ${newC.name} added to local storage.`, 'success');
    };

    const updateClient = async (id: string, updates: Partial<Client>) => {
        const currentClient = clients.find(c => c.id === id);
        const mergedAddress = updates.address !== undefined ? updates.address : (currentClient?.address || '');
        const mergedIdPassport = updates.idPassport !== undefined ? updates.idPassport : (currentClient?.idPassport || '');
        const mergedNotes = updates.kycNotes !== undefined ? updates.kycNotes : (currentClient?.kycNotes || '');
        const mergedClientType = updates.clientType !== undefined ? updates.clientType : (currentClient?.clientType || 'Individual');
        const mergedRegNo = updates.regNo !== undefined ? updates.regNo : (currentClient?.regNo || '');
        const mergedTinNo = updates.tinNo !== undefined ? updates.tinNo : (currentClient?.tinNo || '');
        const serializedNotes = `[Address: ${mergedAddress}] [ID/Passport: ${mergedIdPassport}] [ClientType: ${mergedClientType}] [RegNo: ${mergedRegNo}] [TIN: ${mergedTinNo}] ${mergedNotes}`;

        if (isLive) {
            try {
                const apiPayload = { ...updates, kycNotes: serializedNotes };
                delete (apiPayload as any).address;
                delete (apiPayload as any).idPassport;
                delete (apiPayload as any).clientType;
                delete (apiPayload as any).regNo;
                delete (apiPayload as any).tinNo;
                const updated = await fetchApi(`/api/clients/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(apiPayload)
                });
                setClients(prev => prev.map(c => c.id === id ? mapDbClient(updated) : c));
                showToast('Client record updated on server.', 'success');
                return;
            } catch (err) {
                console.error("API updateClient failed, falling back to local:", err);
            }
        }

        const updatedLocal = clients.map(c => {
            if (c.id === id) {
                return { ...c, ...updates, address: mergedAddress, idPassport: mergedIdPassport, kycNotes: mergedNotes, clientType: mergedClientType, regNo: mergedRegNo, tinNo: mergedTinNo };
            }
            return c;
        });
        setClients(updatedLocal);

        const dbClientsToSave = updatedLocal.map(c => {
            const copy = { ...c, kyc_notes: `[Address: ${c.address || ''}] [ID/Passport: ${c.idPassport || ''}] [ClientType: ${c.clientType || 'Individual'}] [RegNo: ${c.regNo || ''}] [TIN: ${c.tinNo || ''}] ${c.kycNotes || ''}` };
            delete (copy as any).address;
            delete (copy as any).idPassport;
            delete (copy as any).kycNotes;
            delete (copy as any).clientType;
            delete (copy as any).regNo;
            delete (copy as any).tinNo;
            return copy;
        });
        save('dms_clients', dbClientsToSave);
        showToast('Client record updated locally.', 'success');
    };

    // ─── Deal Operations ──────────────────────────────────────────────────────
    const closeDeal = async (deal: Omit<Deal, 'id' | 'date'>) => {
        if (isLive) {
            try {
                const newD = await fetchApi('/api/deals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(deal)
                });
                const mappedDeal = mapDbDeal(newD);
                setDeals(prev => [...prev, mappedDeal]);

                const vehicleInfo = vehicles.find(v => `${v.make} ${v.model}`.toLowerCase() === deal.vehicle.toLowerCase());
                if (vehicleInfo) {
                    await editVehicle(vehicleInfo.id, { status: 'Sold' });

                    const cr = complianceRecords.find(c => c.vin === vehicleInfo.vin);
                    if (cr) {
                        const parsedSaleVal = parseFloat((deal.salePrice ?? '0').replace(/[^0-9.-]+/g, '')) || 0;
                        await updateCompliance(cr.id, {
                            client: deal.client,
                            logbook: 'Pending Transfer',
                            logbookDetails: {
                                ...cr.logbookDetails,
                                status: 'Pending Transfer',
                                previousOwner: cr.logbookDetails?.registeredOwner || 'GariSphere Dealers Ltd',
                                newOwner: deal.client,
                                transferInitiatedDate: new Date().toISOString().split('T')[0],
                                vehicleNumber: cr.plates !== 'Pending Allocation' ? cr.plates : '',
                                amount: parsedSaleVal,
                                transferType: 'Normal',
                                paymentOption: 'Full',
                                amountPaid: parsedSaleVal,
                                balanceLeft: 0
                            }
                        });
                    }
                }

                const newInvoice: Omit<Invoice, 'id' | 'date'> = {
                    client: deal.client,
                    amount: deal.salePrice || deal.margin,
                    type: 'Vehicle Sale',
                    status: 'Pending Finance',
                    branch: deal.branch
                };
                await createInvoice(newInvoice);

                showToast(`Deal closed: ${mappedDeal.client} — ${mappedDeal.vehicle}. Invoice logged.`, 'success');
                return;
            } catch (err) {
                console.error("API closeDeal failed, falling back to local:", err);
            }
        }

        // Local fallback
        const uniqueId = `D-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
        const newD: Deal = { ...deal, id: uniqueId, date: 'Today', status: 'Closed' };
        const updatedDeals = [...deals, newD];
        setDeals(updatedDeals); save('dms_deals', updatedDeals);
        
        const vehicleInfoLocal = vehicles.find(v => `${v.make} ${v.model}`.toLowerCase() === deal.vehicle.toLowerCase());
        if (vehicleInfoLocal) {
            const updatedV = vehicles.map(v => v.id === vehicleInfoLocal.id ? { ...v, status: 'Sold' as const } : v);
            setVehicles(updatedV); save('dms_vehicles', updatedV);

            const updatedComp = complianceRecords.map(c => {
                if (c.vin === vehicleInfoLocal.vin) {
                    const parsedSaleVal = parseFloat((deal.salePrice ?? '0').replace(/[^0-9.-]+/g, '')) || 0;
                    return {
                        ...c,
                        client: deal.client,
                        logbook: 'Pending Transfer',
                        logbookDetails: {
                            ...c.logbookDetails,
                            status: 'Pending Transfer' as const,
                            previousOwner: c.logbookDetails?.registeredOwner || 'GariSphere Dealers Ltd',
                            newOwner: deal.client,
                            transferInitiatedDate: new Date().toISOString().split('T')[0],
                            vehicleNumber: c.plates !== 'Pending Allocation' ? c.plates : '',
                            amount: parsedSaleVal,
                            transferType: 'Normal' as const,
                            paymentOption: 'Full' as const,
                            amountPaid: parsedSaleVal,
                            balanceLeft: 0
                        }
                    };
                }
                return c;
            });
            setComplianceRecords(updatedComp); save('dms_compliance', updatedComp);
        }
        
        const newInvoice: Invoice = {
            id: `INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`, date: 'Today',
            client: deal.client, amount: deal.salePrice || deal.margin,
            type: 'Vehicle Sale', status: 'Pending Finance'
        };
        const updatedInv = [...invoices, newInvoice];
        setInvoices(updatedInv); save('dms_invoices', updatedInv);
        showToast(`Deal closed locally: ${newD.client} — ${newD.vehicle}. Invoice logged.`, 'success');
    };

    // ─── Trade-In and Financing Operations ────────────────────────────────────
    const appraiseTradeIn = async (dealId: string, tradeInDetails: NonNullable<Deal['tradeIn']>) => {
        if (isLive) {
            try {
                const updated = await fetchApi(`/api/deals/${dealId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tradeIn: tradeInDetails })
                });
                setDeals(prev => prev.map(d => d.id === dealId ? mapDbDeal(updated) : d));
                showToast('Trade-in appraisal added to deal.', 'success');
                return;
            } catch (err) {
                console.error("API appraiseTradeIn failed, falling back to local:", err);
            }
        }

        const updatedLocal = deals.map(d => d.id === dealId ? { ...d, tradeIn: tradeInDetails } : d);
        setDeals(updatedLocal); save('dms_deals', updatedLocal);
        showToast('Trade-in appraisal added locally.', 'success');
    };

    const updateDealFinancing = async (dealId: string, financingDetails: NonNullable<Deal['financing']>) => {
        if (isLive) {
            try {
                const updated = await fetchApi(`/api/deals/${dealId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ financing: financingDetails })
                });
                setDeals(prev => prev.map(d => d.id === dealId ? mapDbDeal(updated) : d));
                showToast('Deal financing terms updated.', 'success');
                return;
            } catch (err) {
                console.error("API updateDealFinancing failed, falling back to local:", err);
            }
        }

        const updatedLocal = deals.map(d => d.id === dealId ? { ...d, financing: financingDetails } : d);
        setDeals(updatedLocal); save('dms_deals', updatedLocal);
        showToast('Deal financing terms updated locally.', 'success');
    };

    // ─── Compliance Operations ────────────────────────────────────────────────
    const updateCompliance = async (id: string, updates: Partial<ComplianceRecord>) => {
        if (isLive) {
            try {
                const updated = await fetchApi(`/api/compliance/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
                setComplianceRecords(prev => prev.map(r => r.id === id ? mapDbCompliance(updated) : r));
                showToast('Compliance record updated.', 'success');
                return;
            } catch (err) {
                console.error("API updateCompliance failed, falling back to local:", err);
            }
        }

        const updatedLocal = complianceRecords.map(r => r.id === id ? { ...r, ...updates } : r);
        setComplianceRecords(updatedLocal); save('dms_compliance', updatedLocal);
        showToast('Compliance record updated locally.', 'success');
    };

    const addComplianceDocument = async (id: string, doc: { name: string; url?: string; type?: string; size?: number }) => {
        const record = complianceRecords.find(r => r.id === id);
        if (!record) return;
        const currentDocs = record.documents || [];
        const newDoc = {
            name: doc.name,
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            url: doc.url,
            type: doc.type,
            size: doc.size
        };
        const updatedDocs = [...currentDocs, newDoc];
        await updateCompliance(id, { documents: updatedDocs });
    };

    const removeComplianceDocument = async (id: string, docIndex: number) => {
        const record = complianceRecords.find(r => r.id === id);
        if (!record) return;
        const updatedDocs = (record.documents || []).filter((_, i) => i !== docIndex);
        await updateCompliance(id, { documents: updatedDocs });
    };

    // ─── Repair Order Operations ──────────────────────────────────────────────
    const addRepairOrder = async (ro: Omit<RepairOrder, 'ro'>) => {
        const uniqueRO = `RO-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
        const newRoPayload = { ...ro, ro: uniqueRO };

        if (isLive) {
            try {
                const newRo = await fetchApi('/api/repair-orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newRoPayload)
                });
                setRepairOrders(prev => [...prev, mapDbRepairOrder(newRo)]);

                const newInvoice: Omit<Invoice, 'id' | 'date'> = {
                    client: ro.client,
                    amount: ro.cost || '$850',
                    type: 'Service & Parts',
                    status: 'Pending Finance',
                    branch: ro.branch
                };
                await createInvoice(newInvoice);

                showToast(`e-RO ${uniqueRO} opened. Invoice logged.`, 'info');
                return;
            } catch (err) {
                console.error("API addRepairOrder failed, falling back to local:", err);
            }
        }

        const newRo: RepairOrder = { ...ro, ro: uniqueRO };
        const updated = [...repairOrders, newRo];
        setRepairOrders(updated); save('dms_repair_orders', updated);
        const newInvoice: Invoice = {
            id: `INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`, date: 'Today',
            client: ro.client, amount: ro.cost || '$850', type: 'Service & Parts', status: 'Pending Finance'
        };
        const updatedInv = [...invoices, newInvoice];
        setInvoices(updatedInv); save('dms_invoices', updatedInv);
        showToast(`e-RO ${newRo.ro} opened locally.`, 'info');
    };

    const updateRepairOrderStatus = async (roNum: string, status: RepairOrder['status']) => {
        if (isLive) {
            try {
                const updated = await fetchApi(`/api/repair-orders/${roNum}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });
                setRepairOrders(prev => prev.map(r => r.ro === roNum ? mapDbRepairOrder(updated) : r));
                showToast(`RO ${roNum} status → ${status}.`, 'info');
                return;
            } catch (err) {
                console.error("API updateRepairOrderStatus failed, falling back to local:", err);
            }
        }

        const updatedLocal = repairOrders.map(r => r.ro === roNum ? { ...r, status } : r);
        setRepairOrders(updatedLocal); save('dms_repair_orders', updatedLocal);
        showToast(`RO ${roNum} status → ${status} locally.`, 'info');
    };

    const updateRepairOrder = async (roNum: string, updates: Partial<RepairOrder>) => {
        if (isLive) {
            try {
                const updated = await fetchApi(`/api/repair-orders/${roNum}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
                setRepairOrders(prev => prev.map(r => r.ro === roNum ? mapDbRepairOrder(updated) : r));
                showToast(`Repair Order ${roNum} updated.`, 'success');
                return;
            } catch (err) {
                console.error("API updateRepairOrder failed, falling back to local:", err);
            }
        }

        const updatedLocal = repairOrders.map(r => r.ro === roNum ? { ...r, ...updates } : r);
        setRepairOrders(updatedLocal); save('dms_repair_orders', updatedLocal);
        showToast(`Repair Order ${roNum} updated locally.`, 'success');
    };

    // ─── Parts Operations ─────────────────────────────────────────────────────
    const updatePartStock = async (partId: string, quantityChange: number) => {
        const part = partsInventory.find(p => p.id === partId);
        if (!part) return;
        const newStock = part.stockQuantity + quantityChange;

        if (isLive) {
            try {
                const updated = await fetchApi(`/api/parts/${partId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ stockQuantity: newStock })
                });
                setPartsInventory(prev => prev.map(p => p.id === partId ? mapDbPartItem(updated) : p));
                return;
            } catch (err) {
                console.error("API updatePartStock failed, falling back to local:", err);
            }
        }

        const updatedLocal = partsInventory.map(p => p.id === partId ? { ...p, stockQuantity: newStock } : p);
        setPartsInventory(updatedLocal); save('dms_parts', updatedLocal);
    };

    const addPartToRO = async (roNum: string, partId: string, quantity: number) => {
        const part = partsInventory.find(p => p.id === partId);
        if (!part) { showToast('Part not found.', 'danger'); return; }
        if (part.stockQuantity < quantity) { showToast('Insufficient part stock.', 'danger'); return; }

        const ro = repairOrders.find(r => r.ro === roNum);
        if (!ro) { showToast('Repair order not found.', 'danger'); return; }

        const partsList = ro.partsList || [];
        const existingPart = partsList.find(p => p.partId === partId);
        
        let newPartsList;
        if (existingPart) {
            newPartsList = partsList.map(p => p.partId === partId ? { ...p, quantity: p.quantity + quantity } : p);
        } else {
            newPartsList = [...partsList, { partId, name: part.name, quantity, price: part.price }];
        }

        const currentCost = parseFloat(ro.cost?.replace(/[^0-9.]/g, '') || '0');
        const additionalCost = part.price * quantity;
        const newCost = `$${(currentCost + additionalCost).toLocaleString()}`;
        const partsString = newPartsList.map(p => `${p.name} (x${p.quantity})`).join(', ');

        const updatedRo = { partsList: newPartsList, parts: partsString, cost: newCost };
        await updateRepairOrder(roNum, updatedRo);
        await updatePartStock(partId, -quantity);

        // Update the invoice associated with this RO if it's pending
        const roInvoice = invoices.find(inv => inv.client === ro.client && inv.status === 'Pending Finance' && inv.type === 'Service & Parts');
        if (roInvoice) {
            const currentInvAmount = parseFloat(roInvoice.amount.replace(/[^0-9.]/g, '') || '0');
            const newInvAmount = `$${(currentInvAmount + additionalCost).toLocaleString()}`;
            await updateInvoiceStatus(roInvoice.id, roInvoice.status);
            // Patch invoice amount directly
            if (isLive) {
                try {
                    await fetchApi(`/api/invoices/${roInvoice.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ amount: newInvAmount })
                    });
                } catch {}
            }
            const updatedInvoices = invoices.map(inv => inv.id === roInvoice.id ? { ...inv, amount: newInvAmount } : inv);
            setInvoices(updatedInvoices); save('dms_invoices', updatedInvoices);
        }

        // Post Journal Entry for Parts Sale & COGS
        const entries: Omit<LedgerEntry, 'id' | 'date'>[] = [
            { accountId: '1200', accountName: 'Accounts Receivable', type: 'Asset', amount: additionalCost, entryType: 'Debit', description: `Parts Billed to ${roNum}`, branch: ro.branch },
            { accountId: '4200', accountName: 'Parts Revenue', type: 'Revenue', amount: additionalCost, entryType: 'Credit', description: `Parts Billed to ${roNum}`, branch: ro.branch },
            { accountId: '5100', accountName: 'Cost of Parts Sold', type: 'Expense', amount: part.cost * quantity, entryType: 'Debit', description: `Parts COGS ${roNum}`, branch: ro.branch },
            { accountId: '1310', accountName: 'Parts Inventory', type: 'Asset', amount: part.cost * quantity, entryType: 'Credit', description: `Parts Dispensed ${roNum}`, branch: ro.branch }
        ];
        await addJournalEntry(entries);

        showToast(`Added ${quantity}x ${part.name} to RO ${roNum}. Billed $${additionalCost}.`, 'success');
    };

    // ─── General Ledger Operations ────────────────────────────────────────────
    const addJournalEntry = async (entries: Omit<LedgerEntry, 'id' | 'date'>[]) => {
        const totalDebits = entries.filter(e => e.entryType === 'Debit').reduce((sum, e) => sum + e.amount, 0);
        const totalCredits = entries.filter(e => e.entryType === 'Credit').reduce((sum, e) => sum + e.amount, 0);
        
        if (Math.abs(totalDebits - totalCredits) > 0.01) {
            showToast('Journal entries must balance (Debits = Credits).', 'danger');
            return;
        }

        if (isLive) {
            try {
                const inserted = await fetchApi('/api/ledger', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(entries)
                });
                const mappedEntries = inserted.map(mapDbLedgerEntry);
                setLedgerEntries(prev => [...prev, ...mappedEntries]);
                return;
            } catch (err) {
                console.error("API addJournalEntry failed, falling back to local:", err);
            }
        }

        const date = new Date().toISOString();
        const newEntries = entries.map((e, index) => ({
            ...e,
            id: `GL-${Date.now()}-${index}`,
            date
        }));

        const updated = [...ledgerEntries, ...newEntries];
        setLedgerEntries(updated); save('dms_ledger', updated);
    };

    // ─── Extended Finance Operations ──────────────────────────────────────────
    const recordExpense = async (category: string, amount: number, description: string, branch?: Branch) => {
        const activeBranch = branch || (selectedBranch !== 'All' ? selectedBranch : user?.branch) || 'Kampala Main';
        const entries: Omit<LedgerEntry, 'id' | 'date'>[] = [
            { accountId: '5000', accountName: 'Operating Expense', type: 'Expense', amount, entryType: 'Debit', description: `[${category}] ${description}`, branch: activeBranch },
            { accountId: '1000', accountName: 'Cash / Bank', type: 'Asset', amount, entryType: 'Credit', description: `[${category}] ${description}`, branch: activeBranch }
        ];
        await addJournalEntry(entries);
        showToast(`Recorded Expense: ${category} - $${amount}`, 'success');
    };

    const recordDeposit = async (client: string, amount: number, method: string, notes: string, branch?: Branch) => {
        const activeBranch = branch || (selectedBranch !== 'All' ? selectedBranch : user?.branch) || 'Kampala Main';
        const entries: Omit<LedgerEntry, 'id' | 'date'>[] = [
            { accountId: '1000', accountName: 'Cash / Bank', type: 'Asset', amount, entryType: 'Debit', description: `Deposit from ${client} via ${method}`, branch: activeBranch },
            { accountId: '2100', accountName: 'Customer Deposits', type: 'Liability', amount, entryType: 'Credit', description: `Deposit from ${client} via ${method}`, branch: activeBranch }
        ];
        await addJournalEntry(entries);
        showToast(`Received Deposit: $${amount} from ${client}`, 'success');
    };

    const payCommission = async (agent: string, amount: number, notes: string, branch?: Branch) => {
        const activeBranch = branch || (selectedBranch !== 'All' ? selectedBranch : user?.branch) || 'Kampala Main';
        const entries: Omit<LedgerEntry, 'id' | 'date'>[] = [
            { accountId: '5200', accountName: 'Commission Expense', type: 'Expense', amount, entryType: 'Debit', description: `Commission to ${agent}. ${notes}`, branch: activeBranch },
            { accountId: '1000', accountName: 'Cash / Bank', type: 'Asset', amount, entryType: 'Credit', description: `Commission payout to ${agent}`, branch: activeBranch }
        ];
        await addJournalEntry(entries);
        showToast(`Paid Commission: $${amount} to ${agent}`, 'success');
    };

    const recordURATax = async (vehicleId: string, taxType: string, amount: number, notes: string, branch?: Branch) => {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (!vehicle) { showToast('Vehicle not found', 'danger'); return; }
        const activeBranch = branch || vehicle.branch || 'Kampala Main';

        const entries: Omit<LedgerEntry, 'id' | 'date'>[] = [
            { accountId: '5300', accountName: 'URA Tax Expense', type: 'Expense', amount, entryType: 'Debit', description: `URA ${taxType} for ${vehicle.vin} - ${notes}`, branch: activeBranch },
            { accountId: '1000', accountName: 'Cash / Bank', type: 'Asset', amount, entryType: 'Credit', description: `URA ${taxType} payment`, branch: activeBranch }
        ];
        await addJournalEntry(entries);

        const cr = complianceRecords.find(c => c.vin === vehicle.vin);
        if (cr) {
            await updateCompliance(cr.id, { taxes: 'Cleared' });
        }
        
        const currentCost = parseFloat(vehicle.cost?.replace(/[^0-9.]/g, '') || '0');
        const newCost = `$${(currentCost + amount).toLocaleString()}`;
        await editVehicle(vehicle.id, { cost: newCost });

        showToast(`Recorded URA ${taxType} for ${vehicle.make} ${vehicle.model}: $${amount}`, 'success');
    };

    const recordLogbookTransfer = async (vin: string, fee: number, reference: string, notes: string, branch?: Branch) => {
        const activeBranch = branch || (selectedBranch !== 'All' ? selectedBranch : user?.branch) || 'Kampala Main';
        const entries: Omit<LedgerEntry, 'id' | 'date'>[] = [
            { accountId: '5400', accountName: 'Logbook & Transfer Expense', type: 'Expense', amount: fee, entryType: 'Debit', description: `Logbook transfer fee for VIN ${vin}. Ref: ${reference}. ${notes}`, branch: activeBranch },
            { accountId: '1000', accountName: 'Cash / Bank', type: 'Asset', amount: fee, entryType: 'Credit', description: `Logbook transfer payment for VIN ${vin}`, branch: activeBranch }
        ];
        await addJournalEntry(entries);

        const record = complianceRecords.find(c => c.vin === vin);
        if (record) {
            await updateCompliance(record.id, {
                logbookDetails: {
                    ...record.logbookDetails,
                    feePaid: fee,
                    transferReference: reference,
                    status: record.logbookDetails?.status === 'Dealer Stock' ? 'Pending Transfer' : record.logbookDetails?.status || 'Pending Transfer'
                }
            });
        }
        showToast(`Recorded logbook transfer fee: $${fee} for VIN ${vin}`, 'success');
    };

    // ─── Invoice Operations ───────────────────────────────────────────────────
    const createInvoice = async (invoice: Omit<Invoice, 'id' | 'date'>) => {
        if (isLive) {
            try {
                const newInv = await fetchApi('/api/invoices', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(invoice)
                });
                setInvoices(prev => [...prev, mapDbInvoice(newInv)]);
                showToast(`Invoice created on server.`, 'success');
                return;
            } catch (err) {
                console.error("API createInvoice failed, falling back to local:", err);
            }
        }

        const uniqueId = `INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
        const newInv: Invoice = { ...invoice, id: uniqueId, date: 'Today' };
        const updated = [...invoices, newInv];
        setInvoices(updated); save('dms_invoices', updated);
        showToast(`Invoice ${newInv.id} created locally.`, 'success');
    };

    const updateInvoiceStatus = async (id: string, status: Invoice['status'], paymentMethod?: Invoice['paymentMethod'], paymentOption?: Invoice['paymentOption']) => {
        if (isLive) {
            try {
                const updated = await fetchApi(`/api/invoices/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        status, 
                        payment_method: paymentMethod, 
                        payment_option: paymentOption 
                    })
                });
                setInvoices(prev => prev.map(inv => inv.id === id ? mapDbInvoice(updated) : inv));
                showToast(`Invoice ${id} marked as ${status}.`, status === 'Paid' ? 'success' : 'warning');
                return;
            } catch (err) {
                console.error("API updateInvoiceStatus failed, falling back to local:", err);
            }
        }

        const updatedLocal = invoices.map(inv =>
            inv.id === id ? { 
                ...inv, 
                status, 
                paidDate: status === 'Paid' ? 'Today' : inv.paidDate,
                paymentMethod: status === 'Paid' ? (paymentMethod || 'Cash') : inv.paymentMethod,
                paymentOption: status === 'Paid' ? (paymentOption || 'Full') : inv.paymentOption
            } : inv
        );
        setInvoices(updatedLocal); save('dms_invoices', updatedLocal);
        showToast(`Invoice ${id} marked as ${status} locally.`, status === 'Paid' ? 'success' : 'warning');
    };

    const syncInvoiceWithEfris = async (invoiceId: string, clientTin?: string, whtApplicable: boolean = false) => {
        const inv = invoices.find(i => i.id === invoiceId);
        if (!inv) { showToast('Invoice not found', 'danger'); return; }

        const cleanTin = clientTin ? clientTin.replace(/\s+/g, '') : '';
        if (cleanTin && !/^\d{10}$/.test(cleanTin)) {
            showToast('Invalid Client TIN. Must be exactly 10 digits.', 'danger');
            return;
        }

        // Calculate VAT/WHT
        const rawAmount = parseFloat(inv.amount.replace(/[^0-9.-]+/g, '')) || 0;
        const vatUsd = parseFloat((rawAmount * 0.18).toFixed(2));
        const whtUsd = whtApplicable ? parseFloat((rawAmount * 0.06).toFixed(2)) : 0;

        const updateInvoiceFields = (updates: Partial<Invoice>) => {
            setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, ...updates } : i));
            const stored = localStorage.getItem('dms_invoices');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored) as Invoice[];
                    const next = parsed.map(i => i.id === invoiceId ? { ...i, ...updates } : i);
                    localStorage.setItem('dms_invoices', JSON.stringify(next));
                } catch {}
            }
        };

        const storeBusiness = localStorage.getItem('dms_business_config');
        let dealerTin = '1000293810';
        if (storeBusiness) {
            try {
                const parsed = JSON.parse(storeBusiness);
                if (parsed.tin) dealerTin = parsed.tin;
                if (parsed.uraEnabled === false) {
                    showToast('URA EFRIS Integration is currently disabled in Settings.', 'warning');
                    return;
                }
            } catch {}
        }

        // Support simulated offline toggle in localStorage
        const simulateOffline = localStorage.getItem('simulate_ura_offline') === 'true';

        if (isLive) {
            try {
                const res = await fetch('/api/ura/submit-invoice', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        invoiceId,
                        clientTin: cleanTin || undefined,
                        vatApplicable: true,
                        whtApplicable,
                        dealerTin,
                        simulateOffline,
                        amount: rawAmount
                    })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    updateInvoiceFields({
                        efrisStatus: 'Synced',
                        efrisFsdn: data.fsdn,
                        efrisFiscalSign: data.fiscalSign,
                        efrisQrCode: data.qrCodeUrl,
                        clientTin: cleanTin || undefined,
                        vatAmount: vatUsd,
                        whtAmount: whtUsd,
                        efrisSyncedAt: data.timestamp
                    });
                    showToast(`Invoice ${invoiceId} fiscalised with URA EFRIS successfully.`, 'success');
                    return;
                } else {
                    throw new Error(data.error || 'Sync rejected');
                }
            } catch (err: any) {
                console.error('API EFRIS Sync failed:', err);
                const status = err.message?.includes('Timeout') || simulateOffline ? 'Offline Queue' : 'Failed';
                updateInvoiceFields({
                    efrisStatus: status,
                    clientTin: cleanTin || undefined,
                    vatAmount: vatUsd,
                    whtAmount: whtUsd
                });
                if (status === 'Offline Queue') {
                    showToast(`URA EFRIS Offline. Invoice queued for sync.`, 'warning');
                } else {
                    showToast(`EFRIS Sync failed: ${err.message || 'Verification error'}`, 'danger');
                }
                return;
            }
        }

        // Local storage / offline fallback mode
        if (simulateOffline) {
            updateInvoiceFields({
                efrisStatus: 'Offline Queue',
                clientTin: cleanTin || undefined,
                vatAmount: vatUsd,
                whtAmount: whtUsd
            });
            showToast(`URA EFRIS Offline (Simulated). Invoice queued.`, 'warning');
        } else {
            const uniqueId = Math.random().toString(36).substring(2, 9).toUpperCase();
            const fsdn = `FDN${dealerTin}-${uniqueId}`;
            const fiscalSign = Math.random().toString(36).substring(2, 12).toUpperCase();
            updateInvoiceFields({
                efrisStatus: 'Synced',
                efrisFsdn: fsdn,
                efrisFiscalSign: fiscalSign,
                efrisQrCode: `https://efris.ura.go.ug/verify?fsdn=${fsdn}&sig=${fiscalSign}`,
                clientTin: cleanTin || undefined,
                vatAmount: vatUsd,
                whtAmount: whtUsd,
                efrisSyncedAt: new Date().toISOString()
            });
            showToast(`Invoice ${invoiceId} fiscalised locally (Demo Mode).`, 'success');
        }
    };

    // ─── Shipment Operations ──────────────────────────────────────────────────
    const createShipment = async (shipment: Omit<Shipment, 'id' | 'orderId'>) => {
        const uniqueOrd = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
        const newShipPayload = { ...shipment, orderId: uniqueOrd };

        if (isLive) {
            try {
                const newS = await fetchApi('/api/shipments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newShipPayload)
                });
                setShipments(prev => [...prev, mapDbShipment(newS)]);
                showToast(`Transit Order ${uniqueOrd} created.`, 'success');
                return;
            } catch (err) {
                console.error("API createShipment failed, falling back to local:", err);
            }
        }

        const newS: Shipment = { ...shipment, id: Date.now().toString(), orderId: uniqueOrd };
        const updated = [...shipments, newS];
        setShipments(updated); save('dms_shipments', updated);
        showToast(`Transit Order ${newS.orderId} created locally.`, 'success');
    };

    const updateShipmentStatus = async (id: string, status: Shipment['status']) => {
        if (isLive) {
            try {
                const updated = await fetchApi(`/api/shipments/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });
                const mappedS = mapDbShipment(updated);
                setShipments(prev => prev.map(s => s.id === id ? mappedS : s));
                
                if (status === 'Delivered') {
                    const vehicleName = mappedS.vehicle.replace(/^\d{4}\s/, '');
                    const matchV = vehicles.find(v => `${v.make} ${v.model}`.toLowerCase().includes(vehicleName.split(' ')[0].toLowerCase()));
                    if (matchV && matchV.status === 'In Transit') {
                        await editVehicle(matchV.id, { status: 'In Stock' });
                    }
                }
                showToast(`Shipment status updated to "${status}".`, 'info');
                return;
            } catch (err) {
                console.error("API updateShipmentStatus failed, falling back to local:", err);
            }
        }

        const updatedLocal = shipments.map(s => s.id === id ? { ...s, status } : s);
        setShipments(updatedLocal); save('dms_shipments', updatedLocal);
        if (status === 'Delivered') {
            const ship = shipments.find(s => s.id === id);
            if (ship) {
                const vehicleName = ship.vehicle.replace(/^\d{4}\s/, '');
                const matchV = vehicles.find(v => `${v.make} ${v.model}`.toLowerCase().includes(vehicleName.split(' ')[0].toLowerCase()));
                if (matchV && matchV.status === 'In Transit') {
                    const updV = vehicles.map(v => v.id === matchV.id ? { ...v, status: 'In Stock' as const } : v);
                    setVehicles(updV); save('dms_vehicles', updV);
                }
            }
        }
        showToast(`Shipment status updated to "${status}" locally.`, 'info');
    };

    // ─── Appointment Operations ──────────────────────────────────────────────
    const addAppointment = async (apt: Omit<Appointment, 'id' | 'status'> & { status?: AppStatus }) => {
        const fullApt = { ...apt, status: apt.status || 'Scheduled' };
        if (isLive) {
            try {
                const res = await fetchApi('/api/appointments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(fullApt)
                });
                setAppointments(prev => [...prev, mapDbAppointment(res)]);
                showToast(`Appointment for ${apt.clientName} booked.`, 'success');
                return;
            } catch (err) {
                console.error("API addAppointment failed, falling back to local:", err);
            }
        }

        const newApt: Appointment = { ...fullApt, id: `APT-${Date.now().toString().slice(-6)}` };
        const updated = [...appointments, newApt];
        setAppointments(updated);
        save('dms_appointments', updated);
        showToast(`Appointment for ${newApt.clientName} booked locally.`, 'success');
    };

    const editAppointment = async (id: string, updates: Partial<Appointment>) => {
        if (isLive) {
            try {
                const res = await fetchApi(`/api/appointments/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
                setAppointments(prev => prev.map(a => a.id === id ? mapDbAppointment(res) : a));
                showToast('Appointment updated successfully.', 'success');
                return;
            } catch (err) {
                console.error("API editAppointment failed, falling back to local:", err);
            }
        }

        const updatedLocal = appointments.map(a => a.id === id ? { ...a, ...updates } : a);
        setAppointments(updatedLocal);
        save('dms_appointments', updatedLocal);
        showToast('Appointment updated locally.', 'success');
    };

    const updateAppointmentStatus = async (id: string, status: AppStatus) => {
        await editAppointment(id, { status });
    };

    const deleteAppointment = async (id: string) => {
        if (isLive) {
            try {
                await fetchApi(`/api/appointments/${id}`, { method: 'DELETE' });
                setAppointments(prev => prev.filter(a => a.id !== id));
                showToast('Appointment cancelled and deleted.', 'warning');
                return;
            } catch (err) {
                console.error("API deleteAppointment failed, falling back to local:", err);
            }
        }

        const updated = appointments.filter(a => a.id !== id);
        setAppointments(updated);
        save('dms_appointments', updated);
        showToast('Appointment cancelled locally.', 'warning');
    };

    // ─── Notices / Bulletins Operations ──────────────────────────────────────
    const addNotice = async (notice: Omit<TeamNotice, 'id' | 'timestamp'>) => {
        if (isLive) {
            try {
                const res = await fetchApi('/api/notices', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(notice)
                });
                setNotices(prev => [mapDbNotice(res), ...prev]);
                showToast('Notice posted to bulletin.', 'success');
                return;
            } catch (err) {
                console.error("API addNotice failed, falling back to local:", err);
            }
        }

        const newNotice: TeamNotice = {
            ...notice,
            id: `notice-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ', Today'
        };
        const updated = [newNotice, ...notices];
        setNotices(updated);
        save('dms_team_notices', updated);
        showToast('Notice posted locally.', 'success');
    };

    const deleteNotice = async (id: string) => {
        if (isLive) {
            try {
                await fetchApi(`/api/notices/${id}`, { method: 'DELETE' });
                setNotices(prev => prev.filter(n => n.id !== id));
                showToast('Notice removed.', 'info');
                return;
            } catch (err) {
                console.error("API deleteNotice failed, falling back to local:", err);
            }
        }

        const updated = notices.filter(n => n.id !== id);
        setNotices(updated);
        save('dms_team_notices', updated);
        showToast('Notice removed locally.', 'info');
    };

    // ─── Supplier Operations ──────────────────────────────────────────────────
    const addSupplier = async (supplier: Omit<Supplier, 'id' | 'outstandingBalance'> & { outstandingBalance?: number }) => {
        const fullSupplier = { ...supplier, outstandingBalance: supplier.outstandingBalance || 0 };
        if (isLive) {
            try {
                const res = await fetchApi('/api/suppliers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(fullSupplier)
                });
                setSuppliers(prev => [...prev, mapDbSupplier(res)]);
                showToast(`Supplier ${supplier.name} added.`, 'success');
                return;
            } catch (err) {
                console.error("API addSupplier failed, falling back to local:", err);
            }
        }

        const newSupplier: Supplier = { ...fullSupplier, id: `SUP-${Date.now().toString().slice(-3)}`, outstandingBalance: fullSupplier.outstandingBalance };
        const updated = [...suppliers, newSupplier];
        setSuppliers(updated);
        save('dms_suppliers', updated);
        showToast(`Supplier ${newSupplier.name} added locally.`, 'success');
    };

    const editSupplier = async (id: string, updates: Partial<Supplier>) => {
        if (isLive) {
            try {
                const res = await fetchApi(`/api/suppliers/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
                setSuppliers(prev => prev.map(s => s.id === id ? mapDbSupplier(res) : s));
                showToast('Supplier updated successfully.', 'success');
                return;
            } catch (err) {
                console.error("API editSupplier failed, falling back to local:", err);
            }
        }

        const updatedLocal = suppliers.map(s => s.id === id ? { ...s, ...updates } : s);
        setSuppliers(updatedLocal);
        save('dms_suppliers', updatedLocal);
        showToast('Supplier updated locally.', 'success');
    };

    const deleteSupplier = async (id: string) => {
        if (isLive) {
            try {
                await fetchApi(`/api/suppliers/${id}`, { method: 'DELETE' });
                setSuppliers(prev => prev.filter(s => s.id !== id));
                showToast('Supplier record deleted.', 'warning');
                return;
            } catch (err) {
                console.error("API deleteSupplier failed, falling back to local:", err);
            }
        }

        const updated = suppliers.filter(s => s.id !== id);
        setSuppliers(updated);
        save('dms_suppliers', updated);
        showToast('Supplier record deleted locally.', 'warning');
    };

    const addSupplierTransaction = async (tx: Omit<SupplierTransaction, 'id'>) => {
        if (isLive) {
            try {
                const res = await fetchApi('/api/suppliers/transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(tx)
                });
                setSupplierTransactions(prev => [mapDbSupplierTransaction(res), ...prev]);
                
                // Refresh suppliers balance from db
                const bootstrap = await fetchApi('/api/bootstrap');
                setSuppliers((bootstrap.suppliers || []).map(mapDbSupplier));

                showToast('Supplier transaction recorded.', 'success');
                return;
            } catch (err) {
                console.error("API addSupplierTransaction failed, falling back to local:", err);
            }
        }

        const newTx: SupplierTransaction = { ...tx, id: `TX-${Date.now().toString().slice(-3)}` };
        const updatedTx = [newTx, ...supplierTransactions];
        setSupplierTransactions(updatedTx);
        save('dms_supplier_transactions', updatedTx);

        // Update local supplier balance
        const updatedSuppliers = suppliers.map(s => {
            if (s.id === tx.supplierId) {
                return { ...s, outstandingBalance: Math.max(0, s.outstandingBalance + tx.amount) };
            }
            return s;
        });
        setSuppliers(updatedSuppliers);
        save('dms_suppliers', updatedSuppliers);

        showToast('Supplier transaction recorded locally.', 'success');
    };

    const deleteSupplierTransaction = async (id: string) => {
        const tx = supplierTransactions.find(t => t.id === id);
        if (isLive) {
            try {
                await fetchApi(`/api/suppliers/transactions/${id}`, { method: 'DELETE' });
            } catch (err) {
                // ignore
            }
        }
        const updated = supplierTransactions.filter(t => t.id !== id);
        setSupplierTransactions(updated);
        save('dms_supplier_transactions', updated);

        if (tx) {
            // Reverse balance update
            const updatedSuppliers = suppliers.map(s => {
                if (s.id === tx.supplierId) {
                    return { ...s, outstandingBalance: Math.max(0, s.outstandingBalance - tx.amount) };
                }
                return s;
            });
            setSuppliers(updatedSuppliers);
            save('dms_suppliers', updatedSuppliers);
        }
    };

    const recordSupplierPayment = async (supplierId: string, amount: number, reference: string) => {
        await addSupplierTransaction({
            supplierId,
            date: new Date().toISOString().split('T')[0],
            type: 'Payment',
            reference: reference || 'Manual Payment Record',
            amount: -Math.abs(amount), // Negative for payment
            status: 'Settled'
        });
    };

    // ─── Parts Purchase Orders Operations ─────────────────────────────────────
    const createPartsPurchaseOrder = async (po: Omit<PartsPurchaseOrder, 'id' | 'createdAt' | 'totalCost'>, items: PartsPurchaseOrderItem[]) => {
        const totalCostVal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitCost)), 0);
        if (isLive) {
            try {
                const res = await fetchApi('/api/parts/purchase-orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...po, items })
                });
                setPartsPurchaseOrders(prev => [mapDbPartsPurchaseOrder(res), ...prev]);
                showToast(`Purchase Order ${po.poNumber} submitted.`, 'success');
                return;
            } catch (err) {
                console.error("API createPartsPurchaseOrder failed, falling back to local:", err);
            }
        }

        const newPO: PartsPurchaseOrder = {
            ...po,
            id: `PO-${Date.now().toString().slice(-3)}`,
            totalCost: totalCostVal,
            createdAt: new Date().toISOString(),
            items
        };
        const updated = [newPO, ...partsPurchaseOrders];
        setPartsPurchaseOrders(updated);
        save('dms_parts_purchase_orders', updated);
        showToast(`Purchase Order ${po.poNumber} submitted locally.`, 'success');
    };

    const updatePartsPurchaseOrderStatus = async (id: string, status: PartsPurchaseOrder['status']) => {
        if (isLive) {
            try {
                const res = await fetchApi(`/api/parts/purchase-orders/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });
                setPartsPurchaseOrders(prev => prev.map(po => po.id === id ? mapDbPartsPurchaseOrder(res) : po));
                
                // Refresh parts inventory and suppliers list from db
                const bootstrap = await fetchApi('/api/bootstrap');
                setPartsInventory((bootstrap.parts || []).map(mapDbPartItem));
                setSuppliers((bootstrap.suppliers || []).map(mapDbSupplier));
                setSupplierTransactions((bootstrap.supplierTransactions || []).map(mapDbSupplierTransaction));

                showToast(`PO status updated to ${status}.`, 'success');
                return;
            } catch (err) {
                console.error("API updatePartsPurchaseOrderStatus failed, falling back to local:", err);
            }
        }

        // Local updates
        const po = partsPurchaseOrders.find(p => p.id === id);
        if (po) {
            const prevStatus = po.status;
            const updatedPO: PartsPurchaseOrder = { ...po, status };
            const updatedList = partsPurchaseOrders.map(p => p.id === id ? updatedPO : p);
            setPartsPurchaseOrders(updatedList);
            save('dms_parts_purchase_orders', updatedList);

            if (prevStatus === 'Ordered' && status === 'Received') {
                // Increment stock locally
                const updatedParts = partsInventory.map(part => {
                    const poItem = (po.items || []).find(item => item.partNumber === part.partNumber);
                    if (poItem) {
                        return { ...part, stockQuantity: part.stockQuantity + poItem.quantity };
                    }
                    return part;
                });
                // Handle new parts not in inventory
                const poItems = po.items || [];
                const newParts: PartItem[] = [];
                poItems.forEach(item => {
                    if (!partsInventory.some(part => part.partNumber === item.partNumber)) {
                        newParts.push({
                            id: `part-${Date.now().toString().slice(-3)}-${item.partNumber}`,
                            partNumber: item.partNumber,
                            name: item.name,
                            description: `Auto-created from PO ${po.poNumber}`,
                            cost: Number(item.unitCost),
                            price: Number(item.unitCost) * 1.3,
                            stockQuantity: Number(item.quantity),
                            category: 'Other'
                        });
                    }
                });
                const finalParts = [...updatedParts, ...newParts];
                setPartsInventory(finalParts);
                save('dms_parts', finalParts);

                // Update supplier balance locally if supplier exists
                if (po.supplierId) {
                    const updatedSuppliers = suppliers.map(s => {
                        if (s.id === po.supplierId) {
                            return { ...s, outstandingBalance: s.outstandingBalance + po.totalCost };
                        }
                        return s;
                    });
                    setSuppliers(updatedSuppliers);
                    save('dms_suppliers', updatedSuppliers);

                    // Add restock supplier transaction locally
                    const todayStr = new Date().toISOString().split('T')[0];
                    const newTx: SupplierTransaction = {
                        id: `TX-${Date.now().toString().slice(-3)}`,
                        supplierId: po.supplierId,
                        date: todayStr,
                        type: 'Parts Restock',
                        reference: `Parts Restock PO: ${po.poNumber}`,
                        amount: po.totalCost,
                        status: 'Outstanding'
                    };
                    const updatedTx = [newTx, ...supplierTransactions];
                    setSupplierTransactions(updatedTx);
                    save('dms_supplier_transactions', updatedTx);
                }
            }

            showToast(`PO status updated to ${status} locally.`, 'success');
        }
    };

    const deletePartsPurchaseOrder = async (id: string) => {
        if (isLive) {
            try {
                await fetchApi(`/api/parts/purchase-orders/${id}`, { method: 'DELETE' });
                setPartsPurchaseOrders(prev => prev.filter(po => po.id !== id));
                showToast('Purchase Order cancelled and removed.', 'warning');
                return;
            } catch (err) {
                console.error("API deletePartsPurchaseOrder failed, falling back to local:", err);
            }
        }

        const updated = partsPurchaseOrders.filter(po => po.id !== id);
        setPartsPurchaseOrders(updated);
        save('dms_parts_purchase_orders', updated);
        showToast('Purchase Order cancelled locally.', 'warning');
    };

    const startWorkShift = async () => {
        if (!user) return;
        const newShiftPayload = {
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            branch: user.branch,
            startTime: new Date().toISOString(),
            status: 'Active' as const
        };

        if (isLive) {
            try {
                const res = await fetchApi('/api/shifts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newShiftPayload)
                });
                const mapped = mapDbShift(res);
                setWorkShifts(prev => [mapped, ...prev]);
                setActiveShift(mapped);
                try { localStorage.setItem('dms_active_shift', JSON.stringify(mapped)); } catch {}
                showToast("Shift started successfully.", "success");
                return;
            } catch (err) {
                console.error("API startWorkShift failed, falling back to local:", err);
            }
        }

        // Local Fallback
        const mockShift: WorkShift = {
            id: 'ws-' + Math.random().toString(36).substring(2, 9),
            ...newShiftPayload
        };
        const updatedShifts = [mockShift, ...workShifts];
        setWorkShifts(updatedShifts);
        save('dms_work_shifts', updatedShifts);
        setActiveShift(mockShift);
        try { localStorage.setItem('dms_active_shift', JSON.stringify(mockShift)); } catch {}
        showToast("Shift started in offline mode.", "success");
    };

    const endWorkShift = async () => {
        if (!activeShift) return;
        const endedTime = new Date().toISOString();

        if (isLive) {
            try {
                const res = await fetchApi(`/api/shifts/${activeShift.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        endTime: endedTime,
                        status: 'Ended'
                    })
                });
                const mapped = mapDbShift(res);
                setWorkShifts(prev => prev.map(s => s.id === activeShift.id ? mapped : s));
                setActiveShift(null);
                try { localStorage.removeItem('dms_active_shift'); } catch {}
                showToast("Shift ended successfully.", "warning");
                return;
            } catch (err) {
                console.error("API endWorkShift failed, falling back to local:", err);
            }
        }

        // Local Fallback
        const updatedShift: WorkShift = {
            ...activeShift,
            endTime: endedTime,
            status: 'Ended'
        };
        const updatedShifts = workShifts.map(s => s.id === activeShift.id ? updatedShift : s);
        setWorkShifts(updatedShifts);
        save('dms_work_shifts', updatedShifts);
        setActiveShift(null);
        try { localStorage.removeItem('dms_active_shift'); } catch {}
        showToast("Shift ended in offline mode.", "warning");
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <DataContext.Provider value={{
            isLive,
            vehicles, leads, clients, deals, complianceRecords, repairOrders, invoices, shipments, partsInventory, ledgerEntries, toasts,
            selectedBranch, setSelectedBranch,
            addVehicle, editVehicle, deleteVehicle,
            addLead, updateLeadStatus, updateLeadNotes, convertLeadToClient, addClient, updateClient,
            closeDeal,
            appraiseTradeIn, updateDealFinancing,
            updateCompliance, addComplianceDocument, removeComplianceDocument,
            addRepairOrder, updateRepairOrderStatus, updateRepairOrder,
            updatePartStock, addPartToRO,
            createInvoice, updateInvoiceStatus, syncInvoiceWithEfris,
            createShipment, updateShipmentStatus,
            addJournalEntry, recordExpense, recordDeposit, payCommission, recordURATax, recordLogbookTransfer,
            showToast, removeToast, resetAllData, exportToCSV,
            workShifts, activeShift, startWorkShift, endWorkShift,
            appointments, notices,
            addAppointment, editAppointment, updateAppointmentStatus, deleteAppointment,
            addNotice, deleteNotice,
            suppliers, supplierTransactions, partsPurchaseOrders,
            addSupplier, editSupplier, deleteSupplier,
            addSupplierTransaction, deleteSupplierTransaction, recordSupplierPayment,
            createPartsPurchaseOrder, updatePartsPurchaseOrderStatus, deletePartsPurchaseOrder
        }}>
            {children}

            <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', zIndex: 99999, pointerEvents: 'none' }}>
                {toasts.map(toast => (
                    <div key={toast.id} style={{
                        padding: '0.9rem 1.25rem', minWidth: '290px', maxWidth: '400px',
                        background: 'rgba(15, 23, 42, 0.97)', backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderLeft: `4px solid ${toast.type === 'success' ? 'var(--success)' : toast.type === 'danger' ? 'var(--danger)' : toast.type === 'warning' ? 'var(--warning)' : 'var(--secondary-accent)'}`,
                        borderRadius: 'var(--radius-sm)', boxShadow: '0 12px 30px -5px rgba(0,0,0,0.4)',
                        pointerEvents: 'auto', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', gap: '1rem', animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                    }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{toast.message}</span>
                        <button onClick={() => removeToast(toast.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', padding: '0 2px' }}>✕</button>
                    </div>
                ))}
            </div>
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within a DataProvider');
    return context;
}
