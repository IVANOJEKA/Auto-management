# INITIAL APPLICATION INVENTORY
**GariSphere DMS — UI/UX Audit**
**Date:** 2026-10-17 | **Auditor:** Antigravity AI | **Commit:** `34073e3`

---

## 1. Technology Stack

| Layer | Detail |
|---|---|
| Framework | Next.js 16.1.6 (App Router, `src/app/`) |
| Language | TypeScript 5.x, React 19 |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage) |
| Styling | Custom CSS via `globals.css` (46 KB, 1,650 lines) |
| CSS Variables | Full custom-property design system in `:root` |
| Responsive | Mobile-first via CSS media queries (`768px`, `1024px`, `1100px`) |
| Auth | Supabase Auth + custom `AuthContext`, MFA (TOTP) |
| State | React Context: Auth, Data, Currency, Business, Permissions, Theme, Branch |
| PWA | Service Worker via `PWAProvider`, `manifest.json` |
| Charts | Custom `Charts.tsx` (line, donut, bar) |
| Fonts | `Outfit` (heading, 300–800) + `Inter` (body, 400–600) via Google Fonts |
| Icons | SVG inline icons via `SidebarIcons.tsx` |
| Node.js | v24.14.1 |

---

## 2. Route Inventory

### Platform Console (isolated route group)

| Route | File | Notes |
|---|---|---|
| `/platform` | `(platform)/platform/page.tsx` | Platform admin dashboard |
| `/platform/analytics` | `(platform)/platform/analytics/page.tsx` | Platform-level analytics |
| `/platform/login` | `(platform)/platform/login/page.tsx` | Platform login (isolated) |
| `/platform/tenants` | `(platform)/platform/tenants/page.tsx` | Tenant management |

### Tenant Application

| Route | File | Business Function |
|---|---|---|
| `/login` | `app/login/page.tsx` | Authentication, MFA, forgot password |
| `/` (root) | `app/page.tsx` | Marketing / home / command centre |
| `/app` | `app/app/page.tsx` | App redirect |
| `/dashboard` | `app/dashboard/page.tsx` | Operations dashboard (KPIs, charts) |
| `/inventory` | `app/inventory/page.tsx` | Vehicle inventory + products (3,408 lines) |
| `/sales` | `app/sales/page.tsx` | Sales deals, POS, quotations, returns (2,198 lines) |
| `/crm` | `app/crm/page.tsx` | Customer relationship management |
| `/finance` | `app/finance/page.tsx` | Invoices, ledger, financial reporting |
| `/service` | `app/service/page.tsx` | Workshop / repair orders |
| `/parts` | `app/parts/page.tsx` | Spare parts POS + inventory (1,349 lines) |
| `/logistics` | `app/logistics/page.tsx` | Import shipment tracking |
| `/compliance` | `app/compliance/page.tsx` | Tax, logbooks, compliance documents |
| `/reports` | `app/reports/page.tsx` | Business analytics and reporting |
| `/quotes` | `app/quotes/page.tsx` | Quotation & proforma generator |
| `/suppliers` | `app/suppliers/page.tsx` | Supplier directory & relationships |
| `/appointments` | `app/appointments/page.tsx` | Service appointment booking |
| `/portal` | `app/portal/page.tsx` | Customer self-service portal |
| `/notifications` | `app/notifications/page.tsx` | System notifications |
| `/users` | `app/users/page.tsx` | Staff user management |
| `/settings` | `app/settings/page.tsx` | Business settings, branding, preferences |
| `/admin/audit-trail` | `admin/audit-trail/page.tsx` | Admin audit log viewer |

**Total pages:** 25 (`page.tsx` files)

---

## 3. Component Inventory

| Component | Lines | Purpose |
|---|---|---|
| `Sidebar.tsx` | 1,057 | Desktop navigation, branch selector, shift tracking, MFA settings |
| `MobileTopBar.tsx` | 295 | Mobile top header with notifications, branch switcher, back nav |
| `MobileBottomNav.tsx` | 111 | Mobile bottom tab bar (Home, Sales, Vehicles, Customers, More) |
| `MobileMoreDrawer.tsx` | ~200 | Full-screen drawer for secondary mobile navigation |
| `MobileDashboard.tsx` | — | Mobile-optimised dashboard shell |
| `PlatformNav.tsx` | — | Platform console navigation (isolated) |
| `Charts.tsx` | — | Line, donut, bar chart components |
| `PWAInstallBanner.tsx` | — | PWA install prompt |
| `SidebarIcons.tsx` | — | SVG icon library for sidebar |
| `ShiftGuard.tsx` | — | Shift validation wrapper |
| `PWAProvider.tsx` | — | PWA service worker context |

---

## 4. Context / Data Layer

| Context | Responsibility |
|---|---|
| `AuthContext` | Supabase Auth, user session, MFA, role |
| `DataContext` | All business data (vehicles, deals, invoices, ROs, parts, etc.), branch selection |
| `CurrencyContext` | Multi-currency formatting |
| `BusinessContext` | Business settings (name, logo, F&I packages) |
| `PermissionsContext` | Role-based module access control |
| `ThemeContext` | Light/dark theme, auto-time-based |
| `BranchContext` | Branch list management |

---

## 5. User Roles

- **Admin** — Full platform access, all branches
- **Finance** — Finance, reports, invoices
- **Sales** — Deals, CRM, vehicles
- **Mechanic / Technician** — Workshop, service, parts
- **Cashier** — POS only
- **Manager** — All operational modules

---

## 6. Mobile Strategy

- **Desktop (> 768px):** Sidebar navigation + main content area
- **Mobile (≤ 768px):** `MobileTopBar` + `MobileBottomNav` + `MobileMoreDrawer` replace sidebar
- Mobile-specific dashboard: `MobileDashboard` component
- Mobile card lists: `.gs-mobile-card-list` replaces desktop tables
- iOS safe-area insets handled via `env(safe-area-inset-*)` CSS

---

## 7. Theming

- **Dark mode (default):** Navy/midnight palette (`#060b19` base)
- **Light mode:** Auto-enabled 6 am–7 pm, or user-manual via localStorage
- Theme applied via `data-theme="light"` on `<html>`
- Light mode override: extensive `[data-theme="light"]` CSS selector cascade

---

*See VISUAL_DESIGN_AUDIT.md for design system findings.*
