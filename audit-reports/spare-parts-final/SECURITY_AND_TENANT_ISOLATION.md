# 4. SECURITY_AND_TENANT_ISOLATION.md
## GariSphere DMS — Security, Authorization & Multi-Tenant Isolation Audit

**Audit Date:** October 17, 2026  
**Audited Commit:** `b3700b0`  
**Security Scope:** Route Session Verification, Cross-Tenant Isolation, RBAC & Parameter Tampering  

---

### 1. Multi-Tenant Authorization Matrix

| Endpoint | Method | Authentication Guard | Tenant Isolation Enforcement | Verdict |
|---|---|---|---|:---:|
| `/api/parts` | GET | `verifyUserSession(req)` | Filtered by `.eq('tenant_id', user.tenantId)` | **SECURE** |
| `/api/parts` | POST | `verifyUserSession(req)` | Server sets `tenant_id: user.tenantId` | **SECURE** |
| `/api/parts/[id]` | GET | `verifyUserSession(req)` | Filtered by `.eq('tenant_id', user.tenantId)` | **SECURE** |
| `/api/parts/[id]` | PATCH | `verifyUserSession(req)` | Filtered by `.eq('tenant_id', user.tenantId)` | **SECURE** |
| `/api/parts/[id]` | DELETE | `verifyUserSession(req)` | Filtered by `.eq('tenant_id', user.tenantId)` | **SECURE** |
| `/api/parts/sales` | GET | `verifyUserSession(req)` | Filtered by `.eq('tenant_id', user.tenantId)` | **SECURE** |
| `/api/parts/sales` | POST | `verifyUserSession(req)` | Server sets `tenant_id: user.tenantId` | **SECURE** |
| `/api/parts/purchase-orders` | GET, POST | `verifyUserSession(req)` | Filtered/Injected by `user.tenantId` | **SECURE** |
| `/api/parts/purchase-orders/[id]` | PATCH, DELETE | `verifyUserSession(req)` | Filtered by `user.tenantId` | **SECURE** |
| `/api/suppliers` | GET, POST | `verifyUserSession(req)` | Filtered/Injected by `user.tenantId` | **SECURE** |
| `/api/suppliers/[id]` | PATCH, DELETE | `verifyUserSession(req)` | Filtered by `user.tenantId` | **SECURE** |

---

### 2. Penetration & Isolation Tests

| Test ID | Threat Vector | Attack Scenario | Observed System Response | Status |
|---|---|---|---|:---:|
| **SEC-001** | Unauthenticated Access | Request `/api/parts` without Authorization header | Rejected with HTTP 401 Unauthorized | **PASS** |
| **SEC-002** | Invalid Token Access | Request `/api/parts/sales` with forged Bearer token | Rejected with HTTP 401 Unauthorized | **PASS** |
| **SEC-003** | Cross-Tenant Part Read | Tenant A queries product ID owned by Tenant B | Returns HTTP 404 / empty set (tenant filtered) | **PASS** |
| **SEC-004** | Cross-Tenant Part Deletion | Tenant A sends DELETE for Tenant B's product ID | Database query scoped to Tenant A; zero rows affected | **PASS** |
| **SEC-005** | Parameter Injection | Client injects malicious `tenant_id` in POST body | Server overwrites field with `user.tenantId` from JWT | **PASS** |
| **SEC-006** | Cross-Tenant Sales Query | Client appends `?tenant_id=other` to `/api/parts/sales` | Query parameter ignored; query scoped to `user.tenantId` | **PASS** |
| **SEC-007** | Privilege Escalation | Sales user attempts to alter supplier credit settings | Restricted by role check in permission guards | **PASS** |

---

### 3. Row-Level Security (RLS) & Credential Protection
- `supabaseAdmin` service role key is strictly confined to server-side Next.js route handlers (`src/lib/supabase-server.ts`) and is never leaked to client bundles or browser localStorage.
- PostgreSQL tables employ Row Level Security (`ALTER TABLE parts_inventory ENABLE ROW LEVEL SECURITY`).
