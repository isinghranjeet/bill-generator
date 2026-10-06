import type { InvoiceData } from "@/types/invoice";
import { isQuotationDocument } from "@/utils/invoiceTypes";

export function deduplicateReportInvoices(invoices: InvoiceData[]): InvoiceData[] {
  const groups = new Map<string, InvoiceData[]>();
  const withoutQuotationNumber: InvoiceData[] = [];

  for (const invoice of invoices) {
    const quotationNo = invoice.details.quotationNo?.trim();
    if (!quotationNo) {
      withoutQuotationNumber.push(invoice);
      continue;
    }

    const group = groups.get(quotationNo) ?? [];
    group.push(invoice);
    groups.set(quotationNo, group);
  }

  const result = [...withoutQuotationNumber];
  for (const group of groups.values()) {
    const invoiceDocuments = group.filter(
      (invoice) => invoice.details.invoiceNo?.trim() && !isQuotationDocument(invoice.details)
    );
    result.push(...(invoiceDocuments.length > 0 ? invoiceDocuments : group));
  }

  return result;
}