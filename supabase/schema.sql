-- ============================================================
-- AutoSphere DMS — Supabase Database Schema
-- Run this entire script in the Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── TENANTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default tenant
INSERT INTO tenants (id, name, subdomain) VALUES
    ('00000000-0000-0000-0000-000000000000', 'GariSphere Group', 'garisphere')
ON CONFLICT (id) DO NOTHING;

-- ─── VEHICLES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
    vin TEXT NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    color TEXT,
    mileage INTEGER DEFAULT 0,
    cost TEXT,
    price TEXT,
    status TEXT DEFAULT 'In Stock' CHECK (status IN ('In Stock','In Transit','Reserved','Sold')),
    notes TEXT,
    branch TEXT,
    source TEXT DEFAULT 'Shipped' CHECK (source IN ('Shipped','Local Acquisition','Swap Trade-in')),
    acquisition_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── LEADS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    interest TEXT,
    status TEXT DEFAULT 'Hot' CHECK (status IN ('Hot','Follow-up','Cold')),
    last_contact TEXT,
    notes TEXT,
    branch TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CLIENTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    purchases INTEGER DEFAULT 0,
    tv TEXT DEFAULT '$0',
    kyc TEXT DEFAULT 'Pending' CHECK (kyc IN ('Verified','Pending')),
    kyc_notes TEXT,
    branch TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DEALS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
    date TEXT,
    client TEXT NOT NULL,
    vehicle TEXT NOT NULL,
    sale_price TEXT,
    margin TEXT,
    commission TEXT,
    agent TEXT,
    status TEXT DEFAULT 'Closed' CHECK (status IN ('Closed','Pending Finance')),
    fi_products TEXT,
    notes TEXT,
    trade_in JSONB,
    financing JSONB,
    branch TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COMPLIANCE RECORDS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
    vehicle TEXT NOT NULL,
    vin TEXT,
    client TEXT,
    taxes TEXT DEFAULT 'Pending Assessment',
    logbook TEXT DEFAULT 'Not Started',
    plates TEXT DEFAULT 'Pending Allocation',
    esign TEXT DEFAULT 'Pending' CHECK (esign IN ('Signed','Pending')),
    documents JSONB DEFAULT '[]',
    logbook_details JSONB,
    branch TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── REPAIR ORDERS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS repair_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
    ro TEXT UNIQUE NOT NULL,
    vehicle TEXT NOT NULL,
    client TEXT NOT NULL,
    issue TEXT NOT NULL,
    technician TEXT,
    status TEXT DEFAULT 'In Bay' CHECK (status IN ('In Bay','Awaiting Parts','Completed')),
    due TEXT,
    labor_hours NUMERIC,
    parts TEXT,
    cost TEXT,
    parts_list JSONB DEFAULT '[]',
    branch TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INVOICES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
    date TEXT,
    client TEXT NOT NULL,
    amount TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'Pending Finance' CHECK (status IN ('Paid','Pending Finance','Overdue')),
    paid_date TEXT,
    branch TEXT,
    efris_status TEXT DEFAULT 'Not Synced' CHECK (efris_status IN ('Not Synced', 'Synced', 'Offline Queue', 'Failed')),
    efris_fsdn TEXT,
    efris_fiscal_sign TEXT,
    efris_qr_code TEXT,
    client_tin TEXT,
    vat_amount NUMERIC DEFAULT 0,
    wht_amount NUMERIC DEFAULT 0,
    efris_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SHIPMENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
    order_id TEXT UNIQUE NOT NULL,
    vehicle TEXT NOT NULL,
    "from" TEXT,
    eta TEXT,
    status TEXT DEFAULT 'Awaiting Vessel' CHECK (status IN ('Awaiting Vessel','At Sea','Port Clearance','Delivered')),
    cost TEXT,
    vessel TEXT,
    customs_entry TEXT,
    branch TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PARTS INVENTORY ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parts_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
    part_number TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    cost NUMERIC DEFAULT 0,
    price NUMERIC DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    category TEXT CHECK (category IN ('Engine','Electrical','Suspension','Body','Consumable','Other')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── LEDGER ENTRIES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
    date TIMESTAMPTZ DEFAULT NOW(),
    account_id TEXT NOT NULL,
    account_name TEXT NOT NULL,
    type TEXT CHECK (type IN ('Asset','Liability','Equity','Revenue','Expense')),
    amount NUMERIC NOT NULL,
    entry_type TEXT CHECK (entry_type IN ('Debit','Credit')),
    description TEXT,
    reference_id TEXT,
    branch TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── USERS (extended profile linked to Supabase Auth) ────────
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
    name TEXT NOT NULL,
    role TEXT DEFAULT 'Sales' CHECK (role IN ('Admin','Sales','Finance','Service','Logistics')),
    branch TEXT DEFAULT 'Kampala Main',
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ROW LEVEL SECURITY (RLS) ────────────────────────────────
-- Enable RLS on all tables
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies: Authenticated users can read/write their own branch data
-- Admins and Finance can see all branches

CREATE OR REPLACE FUNCTION get_user_branch() RETURNS TEXT AS $$
    SELECT branch FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_role() RETURNS TEXT AS $$
    SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_tenant() RETURNS UUID AS $$
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Vehicles
CREATE POLICY "vehicles_select" ON vehicles FOR SELECT USING (
    tenant_id = get_user_tenant() AND (get_user_role() IN ('Admin','Finance') OR branch = get_user_branch())
);
CREATE POLICY "vehicles_insert" ON vehicles FOR INSERT WITH CHECK (
    tenant_id = get_user_tenant()
);
CREATE POLICY "vehicles_update" ON vehicles FOR UPDATE USING (
    tenant_id = get_user_tenant() AND (get_user_role() IN ('Admin','Finance') OR branch = get_user_branch())
);
CREATE POLICY "vehicles_delete" ON vehicles FOR DELETE USING (
    tenant_id = get_user_tenant() AND get_user_role() = 'Admin'
);

-- Leads
CREATE POLICY "leads_all" ON leads FOR ALL USING (
    tenant_id = get_user_tenant() AND (get_user_role() IN ('Admin','Finance') OR branch = get_user_branch())
);

-- Clients
CREATE POLICY "clients_all" ON clients FOR ALL USING (
    tenant_id = get_user_tenant() AND (get_user_role() IN ('Admin','Finance') OR branch = get_user_branch())
);

-- Deals
CREATE POLICY "deals_all" ON deals FOR ALL USING (
    tenant_id = get_user_tenant() AND (get_user_role() IN ('Admin','Finance') OR branch = get_user_branch())
);

-- Compliance
CREATE POLICY "compliance_all" ON compliance_records FOR ALL USING (
    tenant_id = get_user_tenant() AND (get_user_role() IN ('Admin','Finance') OR branch = get_user_branch())
);

-- Repair Orders
CREATE POLICY "ro_all" ON repair_orders FOR ALL USING (
    tenant_id = get_user_tenant() AND (get_user_role() IN ('Admin','Finance','Service') OR branch = get_user_branch())
);

-- Invoices
CREATE POLICY "invoices_all" ON invoices FOR ALL USING (
    tenant_id = get_user_tenant() AND (get_user_role() IN ('Admin','Finance') OR branch = get_user_branch())
);

-- Shipments
CREATE POLICY "shipments_all" ON shipments FOR ALL USING (
    tenant_id = get_user_tenant() AND (get_user_role() IN ('Admin','Finance','Logistics') OR branch = get_user_branch())
);

-- Parts
CREATE POLICY "parts_all" ON parts_inventory FOR ALL USING (
    tenant_id = get_user_tenant()
);

-- Ledger (Finance + Admin only)
CREATE POLICY "ledger_all" ON ledger_entries FOR ALL USING (
    tenant_id = get_user_tenant() AND get_user_role() IN ('Admin','Finance')
);

-- User Profiles
CREATE POLICY "profiles_own" ON user_profiles FOR ALL USING (id = auth.uid());

-- ─── SEED DEFAULT DATA ───────────────────────────────────────
-- Insert default demo vehicles (no auth needed via service role)
INSERT INTO vehicles (id, vin, make, model, year, color, mileage, cost, price, status, branch, source) VALUES
    ('00000000-0000-0000-0000-000000000001','WBA5S7C56','BMW','X5 M Competition',2024,'Marina Bay Blue',1200,'$98,000','$114,000','In Stock','Kampala Main','Shipped'),
    ('00000000-0000-0000-0000-000000000002','WP0AA2996','Porsche','911 Carrera S',2023,'Guards Red',800,'$120,000','$135,000','In Transit','Kampala Main','Shipped'),
    ('00000000-0000-0000-0000-000000000003','WDC463276','Mercedes','G63 AMG',2022,'Obsidian Black',5400,'$160,000','$185,000','Reserved','Jinja Showroom','Shipped'),
    ('00000000-0000-0000-0000-000000000004','JTJHY7AX6','Lexus','LX 600',2024,'Eminent White',0,'$105,000','$120,000','In Stock','Kampala Main','Shipped'),
    ('00000000-0000-0000-0000-000000000005','SALCA2EX6','Land Rover','Range Rover SV',2023,'Belgravia Green',2100,'$185,000','$210,000','Sold','Entebbe Hub','Shipped')
ON CONFLICT (id) DO NOTHING;

INSERT INTO deals (id, date, client, vehicle, sale_price, margin, commission, agent, status, branch) VALUES
    ('00000000-0000-0000-0001-000000000001','Today','Daniel R.','Porsche 911 Carrera S','$138,500','$18,500','$1,850','Alex T.','Closed','Kampala Main'),
    ('00000000-0000-0000-0001-000000000002','Yesterday','James O.','Toyota Land Cruiser LC300','$123,200','$9,200','$920','Sarah M.','Pending Finance','Jinja Showroom'),
    ('00000000-0000-0000-0001-000000000003','Oct 14','Dr. Evans','Range Rover SV','$209,000','$24,000','$2,400','Alex T.','Closed','Kampala Main')
ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (id, name, email, phone, purchases, tv, kyc, branch) VALUES
    ('00000000-0000-0000-0002-000000000001','Daniel R.','dan@example.com','+254 700 123 456',3,'$420,000','Verified','Kampala Main'),
    ('00000000-0000-0000-0002-000000000002','Alice W.','alice.w@example.com','+254 711 654 321',1,'$85,000','Pending','Jinja Showroom'),
    ('00000000-0000-0000-0002-000000000003','Dr. Evans','evans@hospital.org','+254 722 000 111',2,'$210,000','Verified','Entebbe Hub')
ON CONFLICT (id) DO NOTHING;

INSERT INTO invoices (id, date, client, amount, type, status, branch) VALUES
    ('00000000-0000-0000-0003-000000000001','Today','Dr. Evans','$210,000','Vehicle Sale','Paid','Kampala Main'),
    ('00000000-0000-0000-0003-000000000002','Yesterday','James O.','$114,000','Vehicle Sale','Pending Finance','Jinja Showroom'),
    ('00000000-0000-0000-0003-000000000003','Oct 12','Sarah M.','$1,200','Service & Parts','Paid','Jinja Showroom'),
    ('00000000-0000-0000-0003-000000000004','Oct 10','Global Freight','$4,200','Logistics Cost (Out)','Overdue','Entebbe Hub')
ON CONFLICT (id) DO NOTHING;

INSERT INTO shipments (id, order_id, vehicle, "from", eta, status, cost, vessel, branch) VALUES
    ('00000000-0000-0000-0004-000000000001','ORD-8910','2024 Toyota Land Cruiser LC300','Yokohama, JP','2026-06-15','At Sea','$4,200','Hoegh Target','Entebbe Hub'),
    ('00000000-0000-0000-0004-000000000002','ORD-8912','2023 Mercedes Benz S580','Bremerhaven, DE','2026-06-03','Port Clearance','$3,800','Glovis Symphony','Entebbe Hub'),
    ('00000000-0000-0000-0004-000000000003','ORD-8915','2024 Lexus RX 350','Nagoya, JP','2026-07-02','Awaiting Vessel','$3,950','TBD','Entebbe Hub')
ON CONFLICT (id) DO NOTHING;

-- ─── WORK SHIFTS ─────────────────────────────────────────────
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

-- ─── DATABASE INDEXES FOR PERFORMANCE OPTIMIZATION ───────────
-- Composite indexes on (tenant_id, branch) for standard queries & RLS policies
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_branch ON vehicles(tenant_id, branch);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_branch ON leads(tenant_id, branch);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_branch ON clients(tenant_id, branch);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_branch ON deals(tenant_id, branch);
CREATE INDEX IF NOT EXISTS idx_compliance_records_tenant_branch ON compliance_records(tenant_id, branch);
CREATE INDEX IF NOT EXISTS idx_repair_orders_tenant_branch ON repair_orders(tenant_id, branch);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_branch ON invoices(tenant_id, branch);
CREATE INDEX IF NOT EXISTS idx_shipments_tenant_branch ON shipments(tenant_id, branch);
CREATE INDEX IF NOT EXISTS idx_parts_inventory_tenant ON parts_inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tenant_branch ON ledger_entries(tenant_id, branch);
CREATE INDEX IF NOT EXISTS idx_work_shifts_tenant_branch ON work_shifts(tenant_id, branch);

-- Dedicated indexes for query sorting/ordering
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_records_created_at ON compliance_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repair_orders_created_at ON repair_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON shipments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parts_inventory_name ON parts_inventory(name ASC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON ledger_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_work_shifts_start_time ON work_shifts(start_time DESC);

-- ─── APPOINTMENTS ───────────────────────────────────────────
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

-- ─── BULLETINS / NOTICES ──────────────────────────────────────
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

-- ─── SUPPLIERS ─────────────────────────────────────────────────────────────
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

-- ─── SUPPLIER TRANSACTIONS ──────────────────────────────────────────────────
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

-- ─── PARTS PURCHASE ORDERS ──────────────────────────────────────────────────
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

-- ─── PARTS PURCHASE ORDER ITEMS ─────────────────────────────────────────────
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


