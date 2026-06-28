# TODO - Invoice print pagination fix

- [ ] Inspect and wrap invoice JSX blocks with dedicated print classes (header, items/table, footer).
- [ ] Add print CSS in `src/index.css`: single consolidated `@media print`, `@page` A4 rules, `thead { display: table-header-group; }`.
- [ ] Remove conflicting global `table/tr break-inside: avoid` rules that can force early pagination.
- [ ] Enforce unbreakable groups for header/footer using `break-inside: avoid` and avoid splitting.
- [ ] Ensure item table header repeats and only table continues to next page.
- [ ] Quick manual test: Chrome Print → Save as PDF.

