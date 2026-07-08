## TODO

### Quotation support for Create Invoice
- [x] Implement documentType selection UI on AdminPortal “New Invoice” button (Invoice / Quotation) to navigate to `/create?type=invoice|quotation`.
- [x] Update CreateInvoice page to read `type` from search params and initialize document heading/title and number field mode.
- [x] Ensure quotation mode generates `quotationNo` if missing and sets `invoiceTitle` appropriately.
- [x] Ensure PDF/Print uses the updated UI title for quotations.
- [ ] Run frontend typecheck/build and do a quick manual verification for both invoice and quotation flows.

