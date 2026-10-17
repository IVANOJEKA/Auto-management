# SPARE_PARTS_BASELINE.md
## GariSphere DMS — Baseline Architecture & Operations Inventory

**Date of Audit:** October 17, 2026  
**Auditor:** Lead System Architect & QA Auditor  
**Repository Branch:** `main`  
**Latest Git Commit Baseline:** `5a2a329` (feat: expose Suppliers directory in sidebar)

---

### 1. Application Architecture

- **Framework:** Next.js 16.1.6 (App Router with Turbopack)
- **Runtime:** Node.js / React 19.2.3
- **Database Engine:** PostgreSQL via Supabase (`@supabase/supabase-js` v2.106.2)
- **Backend Architecture:** Next.js Route Handlers (`src/app/api/*`) utilizing `supabaseAdmin` service role client with server-side authentication (`verifyUserSession`) and tenant isolation (`tenant_id`).
- **Data Synchronization Pattern:** Hybrid Real-Time & Offline Resilient:
  - Authoritative Remote Database: Supabase PostgreSQL (`parts_inventory`, `parts_sales`, `parts_sale_items`, `parts_purchase_orders`, `parts_purchase_order_items`, `suppliers`, `supplier_transactions`).
  - Local State / Optimistic Fallback: Browser `localStorage` caching with automatic write-through and network sync.
- **Authentication & Roles:** JWT session tokens via `src/lib/auth-server.ts`. Roles: `Admin`, `Sales`, `Finance`, `Logistics`, `Service`.
- **Tenant & Branch Resolution:** Subdomain-based tenant isolation via `getTenantSlug` and `tenant_id` database columns, with branch-level filtering (`selectedBranch`).

---

### 2. Relevant Source Files & Modules

| Module / Component | Path | Responsibility |
|---|---|---|
| **Products & Inventory Page** | `src/app/inventory/page.tsx` | Product catalog, bulk product entry, barcode/label printing, dynamic categories & brands. |
| **Sales Desk & POS Terminal** | `src/app/sales/page.tsx` | Fast-checkout POS counter, stock enforcement, sales history, quotations, returns, discounts. |
| **Parts & Purchase Orders** | `src/app/parts/page.tsx` | Purchase order tracking, PO receiving into stock, barcode label generation. |
| **Suppliers & Vendors** | `src/app/suppliers/page.tsx` | Supplier directory, credit terms, and transaction ledger. |
| **Data Context** | `src/context/DataContext.tsx` | Central state management, optimistic updates, offline caching, and business logic methods. |
| **Authentication & Permissions** | `src/context/PermissionsContext.tsx`, `src/lib/auth-server.ts` | Role-based module access and server-side token validation. |
| **Navigation Sidebar** | `src/components/Sidebar.tsx` | Nav groups: MAIN, SELL & CUSTOMERS, PRODUCTS & INVENTORY, WORKSHOP & OPERATIONS, FINANCE, REPORTING, ADMIN. |

---

### 3. API Endpoints for Spare Parts

| Endpoint | Methods | Description |
|---|---|---|
| `/api/parts` | GET, POST | Retrieve inventory catalog, add single/bulk parts with tenant scoping. |
| `/api/parts/[id]` | GET, PATCH, DELETE | Retrieve single part, update stock/price/details, delete part with tenant isolation. |
| `/api/parts/sales` | GET, POST | Fetch parts sales receipts, execute POS sale with backend stock validation and deduction. |
| `/api/parts/purchase-orders` | GET, POST | List POs, create PO with line items and cost totals. |
| `/api/parts/purchase-orders/[id]` | PATCH, DELETE | Update status (Ordered -> Received), auto-increment stock, update supplier balance. |
| `/api/suppliers` | GET, POST | Supplier directory management and credit terms. |
| `/api/suppliers/[id]` | PATCH, DELETE | Update and delete supplier profiles. |
| `/api/tenants` | GET, POST | Tenant workspace metadata, business type, and enabled modules. |

---

### 4. Database Tables & Schema

- `parts_inventory`: `id`, `tenant_id`, `part_number`, `name`, `description`, `cost`, `price`, `stock_quantity`, `category`, `brand`, `created_at`, `updated_at`.
- `parts_sales`: `id`, `tenant_id`, `sale_number`, `date`, `customer_id`, `customer_name`, `subtotal`, `discount`, `total`, `payment_method`, `notes`, `branch`, `created_by`.
- `parts_sale_items`: `id`, `sale_id`, `part_id`, `part_number`, `name`, `quantity`, `unit_price`, `unit_cost`, `line_total`.
- `parts_purchase_orders`: `id`, `tenant_id`, `po_number`, `supplier_id`, `status`, `total_cost`, `branch`, `notes`, `created_at`, `updated_at`.
- `parts_purchase_order_items`: `id`, `po_id`, `part_number`, `name`, `quantity`, `unit_cost`.
- `suppliers`: `id`, `tenant_id`, `name`, `contact_person`, `phone`, `email`, `address`, `country`, `type`, `rating`, `outstanding_balance`, `credit_terms`, `notes`.
- `supplier_transactions`: `id`, `tenant_id`, `supplier_id`, `date`, `type`, `reference`, `amount`, `status`.

---

### 5. Identified Baseline Gaps & Remediated Defects

1. **DEF-01 (Fixed):** `/api/parts/[id]` was missing a `DELETE` handler, causing live-mode product deletions to fail at the database level. Added complete `DELETE` handler with tenant verification.
2. **DEF-02 (Fixed):** `/api/parts/sales` accepted unverified tenant IDs via query parameters without `verifyUserSession` and did not enforce backend-level stock availability before committing sales. Hardened with full server session authentication, authoritative stock validation, and atomic database inventory decrementing.
3. **DEF-03 (Fixed):** The `/suppliers` page existed in the route tree but lacked a link in `Sidebar.tsx`. Exposed `Suppliers & Vendors` under `WORKSHOP & OPERATIONS`.
