# THERMAL_PRINTER_READINESS.md
## GariSphere DMS — Thermal Label Printer Calibration & Readiness Assessment

**Audit Date:** October 17, 2026  
**Auditor Designation:** Hardware & System Integration Engineer  
**Component Evaluated:** Barcode Generation (`jsbarcode`), CSS Print Layouts, Thermal Formats & Scanner Ingestion  
**Repository Files Inspected:**  
- `src/app/inventory/page.tsx` (Lines 15–39, 874–888)  
- `src/app/parts/page.tsx` (Lines 14–60, 340–355)  
- `src/app/sales/page.tsx` (POS Barcode search input)  

---

### 1. Label Dimension & CSS Verification Matrix

The platform implements thermal label layout presets in both `inventory/page.tsx` and `parts/page.tsx`:

| Preset Identifier | Label Dimensions | Physical Use Case | Configured Box Width (px) | Configured Box Height (px) | Barcode Height (px) | CSS Page Margins | Layout Verification Status |
|---|---|---|:---:|:---:|:---:|:---:|:---:|
| **`58x40`** | **58 × 40 mm** | Standard Thermal Shelf Label (Most Popular) | 220px | 120px | 50px | `@page { margin: 4mm; }` | **PASS (Browser Engine)** |
| **`57x32`** | **57 × 32 mm** | Compact Receipt-Width Thermal Label | 216px | 96px | 42px | `@page { margin: 4mm; }` | **PASS (Browser Engine)** |
| **`100x50`**| **100 × 50 mm** | Large Carton / Shipping Bin Sticker | 378px | 189px | 65px | `@page { margin: 4mm; }` | **PASS (Browser Engine)** |
| **`38x25`** | **38 × 25 mm** | Mini Part Sticker (Small Components/Fittings) | 144px | 94px | 38px | `@page { margin: 4mm; }` | **PASS (Browser Engine)** |
| **`a4`**    | **A4 Sheet**    | Office Multi-Label Grid (24 stickers/sheet) | 190px | 120px | 50px | Standard Letter/A4 | **PASS (Browser Engine)** |

---

### 2. Barcode & Print Layout Code Inspection

#### A. Barcode Rendering (`BarcodeSVG` Component)
```tsx
JsBarcode(svgRef.current, value, {
    format: 'CODE128',
    width: 2,
    height,
    displayValue: false,
    margin: 0,
});
```
- **Symbology:** Industry-standard **Code128** alphanumeric encoding.
- **Value Mapping:** Uses `part.barcode` if defined; otherwise automatically falls back to `part.partNumber` (SKU).
- **Text Truncation Guard:** Part names rendered with `overflow: hidden; white-space: nowrap; text-overflow: ellipsis` to prevent multi-line overflow spilling out of physical thermal label boundaries.

#### B. Printable Document Assembly (`executePrintLabels`)
```html
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; padding: 8mm; font-family: sans-serif; }
    .sheet { display: flex; flex-wrap: wrap; gap: 4mm; }
    .label-box { border: 1px solid #ddd; padding: 6px; border-radius: 4px; text-align: center; }
    @media print { @page { margin: 4mm; } }
</style>
```

---

### 3. POS Scanner Ingestion Workflow
- When a physical handheld barcode scanner (USB or Bluetooth HID mode) scans a printed sticker, it inputs the decoded alphanumeric string followed by an `Enter` keystroke into the POS search field.
- In `src/app/sales/page.tsx`, the search query immediately matches against:
  1. `item.partNumber` (SKU)
  2. `item.barcode`
  3. `item.name`
- Exact match auto-populates product details and presents the item for one-click addition to cart.

---

### 4. Physical Thermal Printer Calibration Checklist (On-Site Deployment)

Before operational go-live on the shop counter, on-site personnel must complete this checklist with the physical thermal printer (e.g., Xprinter XP-365B, Zebra ZD220, Rongta RP420):

| Step | Action Required | Expected Result | Verified By Store Staff |
|---|---|---|:---:|
| **Step 1** | Install manufacturer ESC/POS or EPL/ZPL label printer driver on the counter PC. | Printer appears in Windows Printers & Scanners. | [ ] |
| **Step 2** | Open Windows Printing Preferences -> Page Setup. Set paper size to match roll (e.g. `58mm * 40mm` or `100mm * 50mm`). | Physical printer page geometry configured. | [ ] |
| **Step 3** | Set print density/darkness to medium-high (10–12) to ensure high-contrast barcode bars. | Barcode lines are crisp without bleeding. | [ ] |
| **Step 4** | In Chrome/Edge print dialog, set Margins to "None" or "Minimum", and disable "Headers and footers". | Label fills sticker boundary perfectly without clipping. | [ ] |
| **Step 5** | Print a sample batch of 3 labels from `/inventory?tab=print_labels`. | Print stops precisely on the gap notch between stickers. | [ ] |
| **Step 6** | Scan the printed sticker with the handheld USB scanner into the POS terminal search input. | Product is identified within < 0.5s. | [ ] |

---

### 5. Task Verdict & Remaining Operational Risk

- **Browser & Software Implementation:** **PASS** (Layouts, Code128 generation, dimensions, and CSS scaling are verified).
- **Physical Hardware Execution:** **NOT RUN (BLOCKED by absence of physical hardware in virtual dev environment)**.
- **Remaining Risk:** Misaligned margins in local browser print dialog if user fails to uncheck "Headers and Footers" or selects mismatched roll dimensions in printer driver settings.
- **Responsible Role:** IT Systems Administrator / Hardware Deployment Tech.
