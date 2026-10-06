import { describe, it, expect } from "vitest";
import { isQuotationDocument } from "@/utils/invoiceTypes";
import { getInvoicePaymentState } from "@/utils/invoicePayments";
import { deduplicateReportInvoices } from "@/utils/reportInvoices";

describe("isQuotationDocument", () => {
  it("classifies converted invoices as invoices when an invoice number exists", () => {
    expect(
      isQuotationDocument({
        invoiceNo: "INV-104",
        quotationNo: "QT-104",
        invoiceTitle: "Quotation",
      })
    ).toBe(false);
  });

  it("classifies a numbered quotation without an invoice number as a quotation", () => {
    expect(
      isQuotationDocument({ invoiceNo: "", quotationNo: "QT-105", invoiceTitle: "TAX INVOICE" })
    ).toBe(true);
  });

  it("recognizes an explicitly titled quotation", () => {
    expect(isQuotationDocument({ invoiceTitle: "Pro forma quotation" })).toBe(true);
  });

  it("does not classify an invoice without a quotation number as a quotation", () => {
    expect(isQuotationDocument({ invoiceNo: "INV-106", invoiceTitle: "TAX INVOICE" })).toBe(false);
  });
});

describe("getInvoicePaymentState", () => {
  const invoice = {
    company: {} as never,
    consignee: {} as never,
    buyer: {} as never,
    details: { dueDate: "2026-10-01" } as never,
    items: [],
    remarks: "",
    totalAmount: 100,
    totalTax: 0,
    totalAmountInWords: "",
  };

  it("reports an unpaid invoice past its due date as overdue", () => {
    expect(
      getInvoicePaymentState(
        { ...invoice, paymentStatus: "unpaid", amountPaid: 0 },
        new Date(2026, 9, 6)
      )
    ).toBe("overdue");
  });

  it("reports a partial payment before the due date as partial", () => {
    expect(
      getInvoicePaymentState(
        { ...invoice, paymentStatus: "partial", amountPaid: 40, details: { dueDate: "2026-10-20" } as never },
        new Date(2026, 9, 6)
      )
    ).toBe("partial");
  });

  it("reports a fully paid invoice as paid even after its due date", () => {
    expect(
      getInvoicePaymentState({ ...invoice, paymentStatus: "paid", amountPaid: 100 }, new Date(2026, 9, 6))
    ).toBe("paid");
  });

  it("keeps legacy invoices without payment fields marked as paid", () => {
    expect(getInvoicePaymentState(invoice, new Date(2026, 9, 6))).toBe("paid");
  });
});

describe("deduplicateReportInvoices", () => {
  const baseInvoice = {
    company: {} as never,
    consignee: {} as never,
    buyer: {} as never,
    details: {} as never,
    items: [],
    remarks: "",
    totalAmount: 100,
    totalTax: 0,
    totalAmountInWords: "",
  };

  it("keeps distinct invoices that share a quotation number", () => {
    const invoices = [
      { ...baseInvoice, details: { invoiceNo: "INV-1", quotationNo: "QT-1" } as never },
      { ...baseInvoice, details: { invoiceNo: "INV-2", quotationNo: "QT-1" } as never },
    ];

    expect(deduplicateReportInvoices(invoices)).toHaveLength(2);
  });

  it("keeps the converted invoice instead of its old quotation copy", () => {
    const quotation = {
      ...baseInvoice,
      details: { invoiceNo: "", quotationNo: "QT-2", invoiceTitle: "QUOTATION" } as never,
    };
    const invoice = {
      ...baseInvoice,
      details: { invoiceNo: "INV-2", quotationNo: "QT-2", invoiceTitle: "TAX INVOICE" } as never,
    };

    expect(deduplicateReportInvoices([quotation, invoice])).toEqual([invoice]);
  });
});
