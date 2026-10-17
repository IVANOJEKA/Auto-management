# BACKUP_COVERAGE_MATRIX.md
## GariSphere DMS — Database Schema & Infrastructure Recovery Matrix

**Audit Date:** October 17, 2026  
**Auditor Designation:** Lead System Architect & Database Reliability Specialist  
**Comparison Baseline:** `supabase/schema.sql`, `supabase/update_schema.sql`, API Routes vs. Database Backup Scope  

---

### 1. Application Database Table Coverage

A standard `pg_dump` targeting the public PostgreSQL schema captures all table structures and rows across the entire database. The table below categorizes every application table, highlighting those previously omitted from the synthetic 19-table manifest:

| Table Name | Business Module | Schema Source | Captured in `pg_dump`? | Status / Notes |
|---|---|---|:---:|---|
| **`tenants`** | Platform / Core | `schema.sql` | **YES** | Multi-tenant directories, subdomains, module config |
| **`user_profiles`** | Auth / RBAC | `schema.sql` | **YES** | User roles, branch assignments, tenant mapping |
| **`vehicles`** | Dealership | `schema.sql` | **YES** | Vehicle inventory, VINs, pricing, acquisition |
| **`deals`** | Dealership | `schema.sql` | **YES** | Closed and pending vehicle financing deals |
| **`leads`** | CRM | `schema.sql` | **YES** | Prospective buyers and lead pipeline |
| **`clients`** | CRM / Core | `schema.sql` | **YES** | Customer master records, KYC status |
| **`compliance_records`** | Compliance | `schema.sql` | **YES** | URA tax declarations, plate allocations |
| **`repair_orders`** | Workshop | `schema.sql` | **YES** | Workshop job cards, bay & technician assignments |
| **`invoices`** | Finance / EFRIS | `schema.sql` | **YES** | Billing, accounts receivable, EFRIS status |
| **`shipments`** | Logistics | `schema.sql` | **YES** | Vehicle freight tracking, vessel ETAs |
| **`parts_inventory`** | Spare Parts | `schema.sql` | **YES** | Spare parts catalog, stock quantities, unit cost |
| **`parts_sales`** | Spare Parts POS | `schema.sql` | **YES** | Counter POS sales headers |
| **`parts_sale_items`** | Spare Parts POS | `schema.sql` | **YES** | POS line items and historical cost tracking |
| **`parts_purchase_orders`**| Spare Parts PO | `update_schema.sql`| **YES** | Restock orders to parts suppliers |
| **`parts_purchase_order_items`**| Spare Parts PO | `update_schema.sql`| **YES** | Detailed items on purchase orders |
| **`suppliers`** | Workshop / Parts| `update_schema.sql`| **YES** | Supplier directory and credit terms |
| **`supplier_transactions`**| Finance | `update_schema.sql`| **YES** | AP restock invoices and payments |
| **`ledger_entries`** | Accounting | `schema.sql` | **YES** | General ledger double-entry journal records |
| **`work_shifts`** | POS Operations | `update_schema.sql`| **YES** | Cashier drawer shift sessions |
| **`appointments`** | Service / Sales | `update_schema.sql`| **YES** | *Previously omitted from manifest; captured by pg_dump* |
| **`notices`** | Operations | `update_schema.sql`| **YES** | *Previously omitted from manifest; captured by pg_dump* |
| **`website_reviews`** | Marketing | `update_schema.sql`| **YES** | *Previously omitted from manifest; captured by pg_dump* |
| **`website_visitors`** | Analytics | `update_schema.sql`| **YES** | *Previously omitted from manifest; captured by pg_dump* |
| **`contact_inquiries`** | Marketing / CRM | `update_schema.sql`| **YES** | *Previously omitted from manifest; captured by pg_dump* |

---

## 2. Infrastructure & Managed Service Recovery Matrix

Relational database dumps alone do not restore 100% of the GariSphere operational environment. The table below delineates the required recovery mechanism for each tier:

| Infrastructure Tier | Resources Included | Recovery Mechanism | Responsible System |
|---|---|---|---|
| **Public Relational Data** | 24 application tables listed above | `pg_dump` / Supabase PITR | PostgreSQL Database Engine |
| **Relational Schema & DDL** | Tables, Foreign Keys, Indexes, RLS Policies | `supabase/schema.sql` + `update_schema.sql` | Database Migrations / `pg_dump` |
| **PostgreSQL Extensions** | `pgcrypto`, `uuid-ossp` | DDL script (`CREATE EXTENSION IF NOT EXISTS`) | PostgreSQL Engine |
| **Authentication & Credentials** | `auth.users`, hashed passwords, MFA tokens | Supabase Auth Backup / CLI dump (`--schema auth`) | Supabase Auth Service |
| **Uploaded Storage Objects** | Vehicle inspection photos, KYC IDs, Tax PDFs | S3 Bucket Replication (`aws s3 sync`) | Supabase Storage (AWS S3) |
| **Environment Configuration** | API keys, Stripe/MoMo keys, Supabase URLs | Secret Manager / `.env.local` secure vault | Deployment Platform (Vercel/Hosting) |

---

## 3. Summary of Coverage

- **Database Relational Data:** **100% Covered** by `pg_dump` when connected with appropriate credentials.
- **Previously Omitted Tables (4):** **Reconciled.** Full PostgreSQL dump automatically includes all 24 public tables.
- **External Managed Layers (Auth & Storage):** **Documented.** Requires dedicated S3 synchronization and Supabase Auth CLI export.
