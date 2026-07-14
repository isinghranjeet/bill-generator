# PROGRESS.md

## Current status
Invoice-level discount calculations are implemented, but the requested UI/UX, rendering changes, persistence, and GST improvements are still pending.

## What is done
- `src/utils/calculations.ts`
  - Added `computeInvoiceDiscount(...)` (clamps: % to 0–100, fixed to 0–subtotal)
  - Added `applyInvoiceDiscountToItems(...)` applying discount BEFORE GST and recomputing GST amounts.

## What is pending
- Discount modal/button in Create/Edit header + persistence
- Render discount in both invoice paths (`ProfessionalInvoice` + `InvoiceSummary`)
- Ensure printed/PDF output includes discount and does NOT include transient UI
- GST quick suggestion chips on GST input focus
- GST integer ± controls (±1 only) with validation (GST non-negative)

## Commands
- `npm run lint` ✅
- `npm run build` ✅

