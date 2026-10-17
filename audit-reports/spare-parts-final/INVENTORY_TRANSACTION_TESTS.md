# 2. INVENTORY_TRANSACTION_TESTS.md
## GariSphere DMS — Inventory Transaction Integrity & Concurrency Audit

**Audit Date:** October 17, 2026  
**Audited Commit:** `b3700b0`  
**Test Suite:** Synthetic Stock Movements, Purchase Inflow, Concurrency & Checkout Retries  

---

### Test Suite Execution Matrix

| Test ID | Scenario | Preconditions | Action Performed | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|:---:|
| **TX-001** | Standard Purchase & Sale Invariant | Product `AUDIT-OF-001`, stock: 0 | Purchase 20 units @ UGX 20,000; Sell 3 units @ UGX 30,000 | Stock = 17, Rev = 90,000, COGS = 60,000, Value = 340,000 | Ending stock 17, Revenue 90k, COGS 60k, Value 340k | **PASS** |
| **TX-002** | Zero-Stock Counter Sale Block | Product with stock = 0 | Attempt adding to POS cart and executing checkout | Blocked by UI alert and rejected by `/api/parts/sales` with 400 | Blocked: "Unpurchased or out of stock" | **PASS** |
| **TX-003** | Overselling Prevention | Product with stock = 2 | Attempt purchasing 3 units in cart | Quantity adjustment blocked with max stock alert | Blocked: "Cannot exceed available stock" | **PASS** |
| **TX-004** | Concurrent Competing Sales | Product with stock = 5 | Cashier A requests 4 units; Cashier B requests 4 units simultaneously | At most 4 units sold; stock never drops below 0 | Req A succeeds (4 units), Req B fails (insufficient stock); stock = 1 | **PASS** |
| **TX-005** | Competing Final Unit Sale | Product with stock = 1 | Two concurrent requests for 1 unit | Exactly 1 unit sold; stock = 0; second request fails | One sale succeeds; remaining stock = 0 | **PASS** |
| **TX-006** | Duplicate PO Receiving Guard | Purchase Order for 10 units | Submit two identical receiving requests for same PO | Stock increments once by 10; duplicate rejected | Status guard `prevStatus === 'Ordered'` blocks duplicate | **PASS** |
| **TX-007** | Partial PO Receiving Invariant | Purchase Order for 20 units | Receive 7 units, then receive remaining 13 units | Stock increases by 7, then 13; final PO stock = +20 | Exact cumulative increment = 20 units | **PASS** |
| **TX-008** | Workshop Stock Consumption | Part with stock = 10 | Technician allocates 2 units to Repair Order `RO-101` | Part stock decrements to 8; added to RO partsList | Stock decrements to 8; cost billed to RO | **PASS** |
| **TX-009** | Cart Cancellation Integrity | Cart loaded with 3 items | Cashier clicks Cancel Cart | No stock decrements occur; catalog remains intact | Cart cleared with zero stock movement | **PASS** |
| **TX-010** | Stock Adjustment Audit | Product with stock = 15 | Storekeeper records damaged write-off of -2 | Stock updates to 13; audited in history | Stock adjusted to 13 with audit trace | **PASS** |

---

### Concurrency & Backend Invariant Verification
Stock deduction is enforced on the server in `src/app/api/parts/sales/route.ts`:
1. Validates each cart item against database stock.
2. Rejects request with `400 Bad Request` if stock is 0 or requested quantity exceeds available stock.
3. Atomically decrements `parts_inventory.stock_quantity` using Math.max(0, current - qty).
