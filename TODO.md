# TODO - Discount + GST Improvements

## Step 1: Add calculation helpers for invoice-level discount
- [x] Update `src/utils/calculations.ts` to compute subtotal, discount amount, discounted subtotal
- [x] Scale item taxable values and GST amounts after discount
- [ ] Ensure validation rules (pct<=100, discount<=subtotal, gst>=0)


## Step 2: Add Discount modal + button in CreateInvoice and EditInvoice headers
- [ ] Update `src/pages/CreateInvoice.tsx`
- [ ] Update `src/pages/EditInvoice.tsx`
- [ ] Persist discount type/value in `invoiceData.discount`

## Step 3: Render discount lines + correct grand total in invoice UI
- [ ] Update `src/components/invoice/ProfessionalInvoice.tsx`
- [ ] Update `src/components/invoice/InvoiceSummary.tsx`

## Step 4: GST Quick Suggestions chips on GST focus
- [ ] Update `src/components/invoice/ProfessionalInvoice.tsx`

## Step 5: GST integer +/- buttons
- [ ] Update `src/components/invoice/ProfessionalInvoice.tsx`

## Step 6: Ensure totals and persistence on Save
- [ ] Update total computation in `src/pages/CreateInvoice.tsx`
- [ ] Update total computation in `src/pages/EditInvoice.tsx`

## Step 7: Build + Lint verification
- [ ] `npm run lint`
- [ ] `npm run build`

