# Debugging Report: Invoice Count Drop (5 → 2) in Report PDF

## 1. Where the Invoice Count Changes from 5 to 2

The invoice count **does NOT change** in JavaScript/React state. The full count of 5 invoices correctly:
1. Flows from `selectedIds` (Set of 5)
2. Into `generateReport()` which receives all 5 IDs
3. Into `filteredReportInvoices` (all 5 found from local cache)
4. Into `htmlContent` (all 5 invoices rendered as HTML)
5. Into the print popup window

**The count drops from 5 visible invoices to 2 at the PRINT / PDF rendering stage** — specifically when `window.print()` is invoked on the new popup window, the CSS `@media print` rules cause 3 of the 5 invoices to be invisible/clipped.

## 2. Which File and Line Causes the Issue

**File**: `src/pages/AdminPortal.tsx`
**Component**: `ReportPrintView` (around line ~2250)
**CSS block** within the `ReportPrintView` component's `<style>` tag:

```
<style>{`
  @media print {
    .report-invoice-page {
      position: absolute;    // <--- LINE CAUSING THE BUG
      left: 0;               // <--- ADDITIONAL FIXED POSITIONING
      top: 0;                // <--- ADDITIONAL FIXED POSITIONING
      width: 100%;
    }
    ...
  }
`}</style>
```

## 3. Why Only 2 Invoices Reach the PDF

The root cause is the CSS declaration `position: absolute` on `.report-invoice-page` elements inside the `@media print` block.

**Technical explanation**:

- The `ReportPrintView` renders each invoice in a `<div className="report-invoice-page">` with an inline style `pageBreakAfter: "always"` (except the last one).
- `page-break-after: always` works correctly ONLY on elements in the **normal document flow** (i.e., block-level elements that participate in normal flow).
- When `position: absolute` is applied, the element is **removed from the normal flow** entirely. All `.report-invoice-page` divs are positioned at `left: 0; top: 0` — they all stack on top of each other at the same location on the first page.
- Browsers (particularly Chromium-based browsers like Chrome and Edge) **ignore `page-break-after`** on absolutely positioned elements because they are no longer part of the block formatting context that page breaks operate on.
- The browser prints what it can fit of the stacked elements. With each invoice being roughly 2/5 of a page in height, the first page fits about 2 invoices worth of content before the overflow is clipped. The remaining 3 invoices are rendered but invisible — stacked behind or clipped beyond the page boundary.

**Evidence**:
- If you open the print preview, you'll see only the first page with partial content, instead of 5+ separate pages.
- The `position: absolute` was likely intended to prevent margin/page-edge issues but had the unintended side effect of disabling page breaks.

## 4. The Minimal Fix

**One-line CSS change** in `src/pages/AdminPortal.tsx` inside the `ReportPrintView` component:

**Before**:
```css
@media print {
  .report-invoice-page {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
  ...
}
```

**After**:
```css
@media print {
  .report-invoice-page {
    page-break-inside: avoid;
    width: 100%;
  }
  ...
}
```

**What this fix does**:
- Removes `position: absolute` (which was the root cause — removes from normal flow and disables page breaks)
- Removes the redundant `left: 0; top: 0;` (only meaningful with `position: absolute`)
- Adds `page-break-inside: avoid` to ensure each invoice renders as a complete unit (no splitting across pages)
- Keeps `width: 100%` for proper fill behavior

The existing inline `pageBreakAfter: "always"` on each `.report-invoice-page` div can now work correctly because the elements are back in normal flow. The `@page { margin: 0; size: A4; }` already handles the page margins independently.

**No other code changes required.** The data pipeline (selection → state → generateReport → ReportPrintView rendering → print) is correct and passes all 5 invoices faithfully.
