# SPARE_PARTS_ACCOUNTING_RECONCILIATION.md
## GariSphere DMS — Accounting, Costing & Financial Reconciliation Audit

**Audit Date:** October 17, 2026  
**Auditor:** Accounting Systems Auditor  
**Scope:** Inventory Costing, POS Sales Revenue, COGS, Supplier Balances, and Gross Profit Reconciliation  

---

### 1. Mandatory Baseline Financial Test (Phase 11 Reconciled)

#### Scenario Specification:
- **Product:** Oil Filter
- **SKU:** `OF-001`
- **Initial Stock:** 0 units
- **Purchased:** 20 units @ UGX 20,000 / unit (Total Purchase Outlay: UGX 400,000)
- **Supplier Payment Terms:** Net 30 (Credit)
- **Sold at Counter:** 3 units @ UGX 30,000 / unit without discounts or taxes

#### Reconciled Ledger Balances:

| Metric | Formulated Calculation | Reconciled Value | Ledger / Record Reference | Status |
|---|---|---|---|:---:|
| **Units Received** | Goods Inflow via Purchase Order | **20 units** | `parts_purchase_orders` (`PO-OF001`) | **VERIFIED** |
| **Units Sold** | POS Counter Checkout | **3 units** | `parts_sales` & `parts_sale_items` | **VERIFIED** |
| **Ending Inventory Count** | 20 received - 3 sold | **17 units** | `parts_inventory.stock_quantity` | **VERIFIED** |
| **Gross Sales Revenue** | 3 units * UGX 30,000 | **UGX 90,000** | `parts_sales.total` | **VERIFIED** |
| **Cost of Goods Sold (COGS)** | 3 units * UGX 20,000 unit cost | **UGX 60,000** | Line Cost Analysis (`unit_cost * qty`) | **VERIFIED** |
| **Gross Margin / Profit** | Revenue (90,000) - COGS (60,000) | **UGX 30,000** | Financial Analytics Report | **VERIFIED** |
| **Gross Profit Margin %** | 30,000 / 90,000 | **33.33%** | Margin Indicator | **VERIFIED** |
| **Ending Inventory Valuation** | 17 units * UGX 20,000 | **UGX 340,000** | Inventory Stock Report | **VERIFIED** |
| **Accounts Payable (Supplier)**| 20 units * UGX 20,000 cost | **UGX 400,000** | `suppliers.outstanding_balance` | **VERIFIED** |

---

### 2. Multi-Cost Batch Purchase & Costing Behavior

When purchasing parts at differing price tiers (e.g., 10 units @ UGX 20,000 followed by 10 units @ UGX 24,000):
- **Catalog Cost Field:** Reflects current replacement purchase cost (UGX 24,000).
- **Sale Line Cost Tracking:** Each `parts_sale_items` record captures the specific `unit_cost` at time of sale, preventing historical margin distortion when supplier wholesale prices fluctuate.

---

### 3. Payment Method Reconciliations

1. **Cash POS Checkout:**
   - Immediately logged under cash drawers for end-of-shift reconciliation (`activeShift` and `shifts` table).
2. **Mobile Money (MTN / Airtel):**
   - Tracked with external telecom transaction IDs in sale notes.
3. **Customer Credit / Account:**
   - Billed against client account records under `clients` ledger.
4. **Returns & Refunds:**
   - Preserves original sales invoice.
   - Generates distinct `RET-` return transaction in `SellReturn` ledger with status approval workflow (`Pending` -> `Approved`), crediting customer account or logging cash outflow without erasing the original audit trace.
