# 3. ACCOUNTING_RECONCILIATION.md
## GariSphere DMS — Accounting, Costing & General Ledger Reconciliation

**Audit Date:** October 17, 2026  
**Audited Commit:** `b3700b0`  
**Accounting Scope:** Cost of Goods Sold (COGS), Revenue Recognition, Inventory Assets, Supplier Liabilities, and Sales Returns  

---

### 1. Mandatory Baseline Financial Reconciliations

#### Specification:
- **Product:** Oil Filter (`AUDIT-OF-001`)
- **Purchased:** 20 units @ UGX 20,000 / unit (Total Purchase Outlay: UGX 400,000)
- **Supplier Credit:** Net 30 terms
- **Sold at Counter:** 3 units @ UGX 30,000 / unit (no discount/tax)

#### Reconciled Financial Balances:

| Metric | Formulated Calculation | Reconciled Value | Source Record in System | Reconciliation Status |
|---|---|---|---|:---:|
| **Units Inflow** | Goods Received from PO | **20 units** | `parts_purchase_orders` | **VERIFIED** |
| **Units Outflow** | Counter POS Sales | **3 units** | `parts_sales` & `parts_sale_items` | **VERIFIED** |
| **Ending Stock** | 20 in - 3 out | **17 units** | `parts_inventory` | **VERIFIED** |
| **Sales Revenue** | 3 * UGX 30,000 | **UGX 90,000** | `parts_sales.total` | **VERIFIED** |
| **Cost of Goods Sold (COGS)** | 3 * UGX 20,000 | **UGX 60,000** | `parts_sale_items.unit_cost * qty` | **VERIFIED** |
| **Gross Profit** | 90,000 - 60,000 | **UGX 30,000** | Profit & Margin Analytics | **VERIFIED** |
| **Gross Margin %** | 30,000 / 90,000 | **33.33%** | Margin Analytics | **VERIFIED** |
| **Ending Inventory Asset** | 17 * UGX 20,000 | **UGX 340,000** | Inventory Valuation | **VERIFIED** |
| **Supplier Liability (AP)** | 20 * UGX 20,000 | **UGX 400,000** | `suppliers.outstanding_balance` | **VERIFIED** |

---

### 2. Multi-Tier Costing Behavior
When parts are purchased at fluctuating wholesale prices (e.g., Batch 1 @ UGX 20,000; Batch 2 @ UGX 24,000):
- **Catalog Unit Cost:** Represents current replacement purchase cost.
- **Transaction Line Cost:** Each `parts_sale_items` record captures the exact historical `unit_cost` at the moment of sale, ensuring gross margin reports reflect historical margins rather than distorted current prices.

---

### 3. Payment Method Accounting & Cash Drawer Reconciliation
- **Cash Payments:** Reconciled at end-of-shift via `work_shifts` session audits.
- **Card & Mobile Money:** Stored with method indicators and transaction reference numbers in sales history.
- **Customer Credit:** Billed against customer account balances in `clients`.
- **Sales Returns:** Handled via `SellReturn` ledger with status approval (`Approved`), preventing silent deletion of original sales records and logging refund outflows.
