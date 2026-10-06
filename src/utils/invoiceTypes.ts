type InvoiceDocumentDetails = {
  invoiceNo?: string | null;
  quotationNo?: string | null;
  invoiceTitle?: string | null;
};

export function isQuotationDocument(details: InvoiceDocumentDetails): boolean {
  if (details.invoiceNo?.trim()) return false;

  const title = details.invoiceTitle?.toLowerCase() ?? "";
  return title.includes("quotation") || Boolean(details.quotationNo?.trim());
}