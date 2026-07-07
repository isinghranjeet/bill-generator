# Invoice/Quotation Management System - Changes

## Planned changes
1. Invoice Number
   - Replace Invoice No text input with searchable creatable dropdown
   - Show existing invoice numbers (user-scoped)
   - Pre-select correct invoice number when editing

2. Quotation Number
   - Add “Quotation No” field (creatable searchable dropdown)
   - Save selected quotation number with invoice
   - Display both Invoice No and Quotation No in PDF/print

3. Days column
   - Add new “Days” column after Qty in items
   - Update InvoiceItem model
   - Update Add/Edit/Delete item functionality

4. Calculation update
   - Total = Rate × Qty × Days
   - Taxable Value = Rate × Qty × Days
   - GST/Grand Total computed from taxable value
   - If Days is empty, use 1

5. PDF/Print
   - Show Days between Qty and Taxable Value
   - Keep layout aligned and responsive

6. Update all related layers
   - TypeScript interfaces
   - Form validation
   - State management
   - PDF generator / print preview
   - API payloads
   - Database schema (if required)

## Progress
- [x] Add backend endpoints for invoice numbers + quotation numbers (distinct keys) (implemented endpoints)
- [x] Update frontend API client to consume those endpoints
- [ ] Implement creatable searchable dropdown for Invoice No
- [ ] Implement creatable searchable dropdown for Quotation No
- [ ] Update InvoiceItem + UI for Days column (Add/Edit/Delete)
- [ ] Update calculations everywhere (taxable/GST/grand total)
- [ ] Update PDF/print layout for Days + invoice/quotation display
- [ ] Update backend schema validations + ensure backward compatibility
- [ ] Run build/typecheck and smoke test create/edit/view + print

