# Invoice Date Fix - Completed

## Summary

The invoice date bug had **TWO root causes** — one in the backend and one in the frontend.

## ✅ Fix 1: Backend Zod Schema Stripping `details.date`

**File:** `backend/server/src/schemas/invoiceSchemas.js`

**Root Cause:** The Zod schema for `details` only validated 3 fields (`invoiceTitle`, `invoiceNo`, `quotationNo`). Zod v3's `z.object()` by default **strips unknown fields**. So `details.date`, `details.dueDate`, `details.modeOfPayment`, `details.deliveryNote`, `details.supplierRef`, `details.otherReferences`, `details.buyerOrderNo`, `details.buyerOrderDate`, `details.despatchDocNo`, `details.deliveryNoteDate`, `details.despatchThrough`, `details.destination`, `details.termsOfDelivery`, `details.ewayBillNo` — ALL of these were **removed** during validation.

**The payload stored in MongoDB only had `{ invoiceTitle, invoiceNo, quotationNo }` — no `date`!**

**Fix:** Added `.passthrough()` to the `details` Zod object so unknown fields are preserved:
```js
details: z.object({
    invoiceTitle: z.string().optional().default("TAX INVOICE"),
    invoiceNo: z.string().optional().default(""),
    quotationNo: z.string().optional().default(""),
}).passthrough(),  // ← PRESERVES details.date + all other fields
```

## ✅ Fix 2: Frontend `getInvoiceDate()` Using `createdAt`

**File:** `src/pages/AdminPortal.tsx`

**Root Cause:** Even if `details.date` was stored correctly, the `getInvoiceDate()` function prioritized `createdAt` (server timestamp) over `details.date` (user-selected invoice date).

**Fix:** Changed priority order from `createdAt → savedAt → details.date` to `details.date → invoiceDate → date → createdAt`:
```tsx
const getInvoiceDate = (invoice: SavedInvoice): Date => {
  const invoiceDateValue =
    invoice.details?.date ??
    (invoice as { invoiceDate?: ... }).invoiceDate ??
    (invoice as { date?: ... }).date ??
    (invoice as { createdAt?: ... }).createdAt ??
    null;
  return parseLocalDate(invoiceDateValue);
};
```

## ✅ Fix 3: Frontend `upsertInvoice` Null Discount Sanitization

**File:** `src/lib/invoiceApi.ts`

**Root Cause:** When editing an invoice, the backend returns `discount: null` for invoices without discounts. The frontend payload includes `discount: null`, but the Zod schema's `.optional()` rejects `null` — it only allows the field to be absent.

**Fix:** Added sanitization to remove `discount` if it's `null` or `undefined` before sending:
```tsx
const sanitized = { ...payload };
if (sanitized.discount === null || sanitized.discount === undefined) {
  delete sanitized.discount;
}
```

## Files Modified

| File | Change |
|------|--------|
| `backend/server/src/schemas/invoiceSchemas.js` | Added `.passthrough()` to `details` Zod schema |
| `src/pages/AdminPortal.tsx` | Updated `getInvoiceDate()` to use `details.date` first |
| `src/lib/invoiceApi.ts` | Added `discount` null sanitization in `upsertInvoice()` |
