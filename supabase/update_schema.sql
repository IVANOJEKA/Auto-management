-- ============================================================
-- AutoSphere DMS — Database Schema Updates
-- Run this script in the Supabase SQL Editor to add missing
-- tables and columns required for Platform Admin, EFRIS Invoicing,
-- Suppliers, Appointments, Work Shifts, Notices, and Analytics.
-- ============================================================

-- ─── 1. TENANTS TABLE EXTENSIONS ─────────────────────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS modules JSONB DEFAULT '["dashboard", "inventory", "logistics", "crm", "sales", "appointments", "quotes", "suppliers", "compliance", "service", "parts", "notifications", "finance", "reports"]';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing JSONB DEFAULT '{"billing_plan": "starter", "billing_status": "active", "billing_cycle": "monthly", "billing_amount": "$49", "next_bill_date": "2026-07-19", "invoices": []}';

-- ─── 2. INVOICES TABLE EXTENSIONS (EFRIS Invoicing) ──────────────
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS efris_status TEXT DEFAULT 'Not Synced' CHECK (efris_status IN ('Not Synced', 'Synced', 'Offline Queue', 'Failed'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS efris_fsdn TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS efris_fiscal_sign TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS efris_qr_code TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_tin TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_amount NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS wht_amount NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS efris_synced_at TIMESTAMPTZ;

-- ─── 3. WORK SHIFTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    branch TEXT NOT NULL,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Ended')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE work_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shifts_all" ON work_shifts FOR ALL USING (
    get_user_role() IN ('Admin','Finance') OR branch = get_user_branch()
);

CREATE INDEX IF NOT EXISTS idx_work_shifts_tenant_branch ON work_shifts(tenant_id, branch);
CREATE INDEX IF NOT EXISTS idx_work_shifts_start_time ON work_shifts(start_time DESC);

-- ─── 4. APPOINTMENTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
    type TEXT NOT NULL CHECK (type IN ('Test Drive', 'Service Booking', 'Delivery', 'Viewing')),
    client_name TEXT NOT NULL,
    client_phone TEXT,
    vehicle_label TEXT,
    date TEXT NOT NULL, -- YYYY-MM-DD
    time TEXT NOT NULL, -- HH:MM
    agent TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Confirmed', 'Completed', 'Cancelled')),
    branch TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_all" ON appointments FOR ALL USING (
    tenant_id = get_user_tenant() AND (get_user_role() IN ('Admin','Finance') OR branch = get_user_branch())
);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_branch ON appointments(tenant_id, branch);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(date DESC, time ASC);

-- ─── 5. BULLETINS / NOTICES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
    text TEXT NOT NULL,
    priority TEXT DEFAULT 'Info' CHECK (priority IN ('Info', 'Warning', 'Urgent')),
    author TEXT NOT NULL,
    branch TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notices_all" ON notices FOR ALL USING (
    tenant_id = get_user_tenant()
);

CREATE INDEX IF NOT EXISTS idx_notices_tenant ON notices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notices_created_at ON notices(created_at DESC);

-- ─── 6. SUPPLIERS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    country TEXT,
    type TEXT DEFAULT 'Overseas' CHECK (type IN ('Local', 'Overseas')),
    rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    outstanding_balance NUMERIC DEFAULT 0,
    credit_terms TEXT DEFAULT 'Net 30',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_all" ON suppliers FOR ALL USING (
    tenant_id = get_user_tenant()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);

-- ─── 7. SUPPLIER TRANSACTIONS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Vehicle Purchase', 'Parts Restock', 'Payment')),
    reference TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'Outstanding' CHECK (status IN ('Settled', 'Outstanding')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE supplier_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_transactions_all" ON supplier_transactions FOR ALL USING (
    tenant_id = get_user_tenant()
);

CREATE INDEX IF NOT EXISTS idx_supplier_transactions_tenant ON supplier_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_supplier ON supplier_transactions(supplier_id);

-- ─── 8. PARTS PURCHASE ORDERS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS parts_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
    po_number TEXT NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'Ordered' CHECK (status IN ('Ordered', 'Received', 'Cancelled')),
    total_cost NUMERIC DEFAULT 0,
    branch TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE parts_purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parts_purchase_orders_all" ON parts_purchase_orders FOR ALL USING (
    tenant_id = get_user_tenant()
);

CREATE INDEX IF NOT EXISTS idx_parts_purchase_orders_tenant_branch ON parts_purchase_orders(tenant_id, branch);

-- ─── 9. PARTS PURCHASE ORDER ITEMS ──────────────────────────────
CREATE TABLE IF NOT EXISTS parts_purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID REFERENCES parts_purchase_orders(id) ON DELETE CASCADE,
    part_number TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC NOT NULL
);

ALTER TABLE parts_purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parts_purchase_order_items_all" ON parts_purchase_order_items FOR ALL USING (
    po_id IN (SELECT id FROM parts_purchase_orders WHERE tenant_id = get_user_tenant())
);

-- ─── 10. WEBSITE ANALYTICS & REVIEW TABLES ─────────────────────
CREATE TABLE IF NOT EXISTS website_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comments TEXT NOT NULL,
    status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS website_visitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    location TEXT,
    device_type TEXT,
    duration TEXT,
    path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    source TEXT DEFAULT 'landing_page',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
