# BACKUP_COVERAGE_GAPS.md
## GariSphere DMS — Database Object Coverage & Gap Analysis

**Analysis Date:** October 17, 2026  
**Auditor Designation:** Lead System Architect & Database Reliability Specialist  
**Comparison Baseline:** `supabase/schema.sql` (570 lines), `supabase/update_schema.sql` (209 lines), Next.js API Routes vs. Backup Scope  

---

### 1. Database Object Discrepancy Matrix

The backup script `scripts/backup-database.js` defines an arbitrary 19-table manifest. An audit of the complete database architecture identifies multiple required tables and objects that are omitted or require specialized backup workflows.

| Database Object / Table | Present in SQL Schemas? | Tracked in Backup Manifest? | Criticality | Operational Impact if Omitted |
|---|:---:|:---:|:---:|---|
| **`tenants`** | YES | YES | CRITICAL | Multi-tenant tenant directory, subdomains, branding |
| **`user_profiles`** | YES | YES | CRITICAL | RBAC permissions, branch assignments, tenant mapping |
| **`vehicles`** | YES | YES | CRITICAL | Dealership vehicle stock, acquisition details, VINs |
| **`deals`** | YES | YES | CRITICAL | Closed and pending vehicle finance deals |
| **`leads`** | YES | YES | HIGH | CRM prospective customer pipeline |
| **`clients`** | YES | YES | CRITICAL | Customer master records, KYC status, balances |
| **`compliance_records`** | YES | YES | HIGH | URA tax declarations, plate allocation documents |
| **`repair_orders`** | YES | YES | CRITICAL | Workshop job cards, technician labor allocations |
| **`invoices`** | YES | YES | CRITICAL | Billing, accounts receivable, EFRIS integration |
| **`shipments`** | YES | YES | HIGH | Inbound vehicle logistics and customs tracking |
| **`parts_inventory`** | YES | YES | CRITICAL | Spare parts catalog, unit costs, selling prices, stock |
| **`parts_sales`** | YES | YES | CRITICAL | Counter POS sales transaction headers |
| **`parts_sale_items`** | YES | YES | CRITICAL | Detailed line items of all POS sales |
| **`parts_purchase_orders`** | YES | YES | CRITICAL | Restock purchase orders to parts suppliers |
| **`parts_purchase_order_items`** | YES | YES | CRITICAL | Detailed purchase order line items |
| **`suppliers`** | YES | YES | CRITICAL | Supplier directory and credit terms |
| **`supplier_transactions`** | YES | YES | CRITICAL | Accounts Payable ledger and restock invoices |
| **`ledger_entries`** | YES | YES | CRITICAL | Double-entry general ledger journal entries |
| **`work_shifts`** | YES | YES | HIGH | Cashier shift sessions and cash drawer totals |
| **`appointments`** | **YES** | **MISSING** | MEDIUM | Customer service appointments & test drives |
| **`notices`** | **YES** | **MISSING** | LOW | Internal staff bulletins & operational notices |
| **`website_reviews`** | **YES** | **MISSING** | LOW | Public dealership customer reviews |
| **`website_visitors`** | **YES** | **MISSING** | LOW | Visitor analytics logs |
| **`contact_inquiries`** | **YES** | **MISSING** | MEDIUM | Web contact inquiries and lead capture |
| **`auth.users`** | Supabase Internal | **MISSING** | CRITICAL | Supabase authentication credentials and JWT identities |
| **Storage Objects** | Supabase Storage | **MISSING** | HIGH | Uploaded vehicle inspection photos & compliance PDFs |

---

## 2. Supabase-Managed Service Internals & Boundaries

A standard PostgreSQL dump of the `public` schema covers application relational data, but misses key platform layers:

1. **Supabase Auth Schema (`auth.users`, `auth.identities`):**  
   - Passwords, email verifications, and MFA secrets are stored inside the protected `auth` schema.
   - Standard application database roles do not have permission to dump `auth.users` directly via `pg_dump` unless connected with a privileged superuser connection string.
   - **Recovery Requirement:** User accounts must either be migrated using the Supabase CLI (`supabase db dump --data-only --schema auth`) or re-provisioned via the Admin API.

2. **Supabase Storage Buckets (`storage.objects`):**  
   - Files uploaded to vehicle inspections, KYC IDs, and URA tax documents reside in Supabase Storage S3 buckets.
   - A database SQL dump only captures metadata pointers in `storage.objects`, not the physical files.
   - **Recovery Requirement:** S3 bucket synchronization script is required to backup physical uploaded documents.

---

## 3. Host Environment Deficiencies

1. **Absence of PostgreSQL Utilities:**  
   The execution environment does not have `pg_dump` or `psql` in the host PATH. The script `scripts/backup-database.js` will throw a runtime error `pg_dump: command not found` whenever `SUPABASE_DB_URL` is populated.
2. **Missing Node.js PostgreSQL Driver:**  
   The repository does not have the `pg` package installed (`npm list pg` returns empty). Therefore, pure Node.js streaming backups via the connection string cannot be executed without external tools.

---

## 4. Gap Analysis Summary

1. **4 application tables are completely omitted** from the backup script's manifest (`appointments`, `notices`, `website_reviews`, `contact_inquiries`).
2. **Auth & Storage layers** are unmanaged by the local script.
3. **CLI tooling** (`pg_dump`) is absent on the host runtime.
