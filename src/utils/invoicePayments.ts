import type { InvoiceData } from "@/types/invoice";

export type InvoicePaymentState = "unpaid" | "partial" | "paid" | "overdue";

export function getInvoicePaymentState(
  invoice: InvoiceData,
  today = new Date()
): InvoicePaymentState {
  const totalAmount = Math.max(invoice.totalAmount || 0, 0);
  const amountPaid = Math.min(Math.max(invoice.amountPaid || 0, 0), totalAmount);

  const isLegacyPaid = invoice.paymentStatus === undefined && invoice.amountPaid === undefined;
  if (invoice.paymentStatus === "paid" || isLegacyPaid || (totalAmount > 0 && amountPaid >= totalAmount)) {
    return "paid";
  }

  const dueDateValue = invoice.details.dueDate;
  if (dueDateValue) {
    const match = typeof dueDateValue === "string"
      ? dueDateValue.match(/^(\d{4})-(\d{2})-(\d{2})/)
      : null;
    const dueDate = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : dueDateValue instanceof Date
        ? new Date(dueDateValue)
        : new Date(dueDateValue);
    const comparisonDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (!Number.isNaN(dueDate.getTime())) {
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate < comparisonDate) return "overdue";
    }
  }

  if (invoice.paymentStatus === "partial" || amountPaid > 0) return "partial";
  return "unpaid";
}