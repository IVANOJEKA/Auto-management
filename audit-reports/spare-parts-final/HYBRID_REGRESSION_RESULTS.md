# 5. HYBRID_REGRESSION_RESULTS.md
## GariSphere DMS — Hybrid Operations & Regression Test Matrix

**Audit Date:** October 17, 2026  
**Audited Commit:** `b3700b0`  
**Regression Scope:** Vehicle Dealership, Automotive Workshop, Point-of-Sale, and Multi-Branch Operations  

---

### 1. Hybrid Workflow Verification Results

| Operation | Workflow Description | Cross-Module Interactions | Observed Behavior | Status |
|---|---|---|---|:---:|
| **1. Walk-in Counter Sale** | Customer buys 2 brake pads at POS | `/sales?tab=pos` -> `parts_inventory` | Decrements stock, logs sales receipt, updates P&L | **PASS** |
| **2. Workshop Parts Consumption** | Mechanic allocates oil filter to `RO-202` | `/service` -> `parts_inventory` | Decrements stock, adds cost to Repair Order bill | **PASS** |
| **3. Dealership Vehicle Closing** | Sales agent closes 2024 BMW deal | `/sales` -> `vehicles` -> `deals` | Vehicle status -> 'Sold', deal created, invoice issued | **PASS** |
| **4. Competing Stock Allocation** | Counter cashier & mechanic allocate last item | POS cart vs. RO allocation | First committed transaction succeeds; second blocked | **PASS** |
| **5. Multi-Branch Operations** | Stock viewed in 'Kampala' vs. 'Jinja' | `selectedBranch` filter | Orders and records accurately scoped by branch | **PASS** |
| **6. Sales Return Processing** | Customer returns defective spark plug | `SellReturn` ledger | Stock quarantined or returned, refund logged | **PASS** |

---

### 2. Regression Impact Assessment on Core Dealership Modules
- **Vehicles Module (`/inventory?tab=vehicles`):** Fully operational. Preserves all vehicle details, VINs, pricing, and status filters.
- **Deals Desk (`/sales`):** Preserves F&I package attachments, trade-in calculator, financing terms, and sales agreement printing.
- **CRM & Leads (`/crm`):** Unaffected. Lead scoring, client KYC, and follow-ups maintain data integrity.
- **Logistics (`/logistics`):** Unaffected. Inbound vehicle shipments, vessel tracking, and customs entries remain functional.
- **Compliance (`/compliance`):** Preserves tax assessments, logbook processing, and number plate tracking.
- **Finance (`/finance`):** General ledger, URA EFRIS compliance, and invoice auditing function without regressions.
