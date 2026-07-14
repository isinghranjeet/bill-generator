// Generate unique invoice number
export const generateInvoiceNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `INV-${year}${month}${day}-${random}`;
};

// Generate product ID (if needed)
export const generateProductId = (): string => {
  const prefix = 'PROD';
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
};

// Types
import type { InvoiceData, InvoiceItem } from "@/types/invoice";



interface ItemTotalsInput {
  rate: number;

  quantity: number;
  discount: number;
  sgstRate: number;
  cgstRate: number;
  igstRate: number;
  [key: string]: unknown;
}

interface ItemTotalsResult {
  amount: number;
  taxableValue: number;
  sgstAmount: number;
  cgstAmount: number;
  igstAmount: number;
  total: number;
}

type ItemTotals = ItemTotalsInput & ItemTotalsResult;

// Calculate item totals including GST
export const calculateItemTotals = (item: ItemTotalsInput): ItemTotals => {
  const amount = item.rate * item.quantity;
  const taxableValue = amount - item.discount;
  const sgstAmount = taxableValue * (item.sgstRate / 100);
  const cgstAmount = taxableValue * (item.cgstRate / 100);
  const igstAmount = taxableValue * (item.igstRate / 100);
  const total = taxableValue + sgstAmount + cgstAmount + igstAmount;

  return {
    ...item,
    amount: parseFloat(amount.toFixed(2)),
    taxableValue: parseFloat(taxableValue.toFixed(2)),
    sgstAmount: parseFloat(sgstAmount.toFixed(2)),
    cgstAmount: parseFloat(cgstAmount.toFixed(2)),
    igstAmount: parseFloat(igstAmount.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  };
};

// Calculate invoice summary
interface InvoiceSummary {
  amount: number;
  discount: number;
  taxableValue: number;
  sgst: number;
  cgst: number;
  igst: number;
  total: number;
}

type SummaryInputItem = {
  amount: number;
  discount: number;
  taxableValue: number;
  sgstAmount: number;
  cgstAmount: number;
  igstAmount: number;
  total: number;
};

export const calculateInvoiceSummary = (items: SummaryInputItem[]): InvoiceSummary => {
  const summary = items.reduce(
    (acc, item) => ({
      amount: acc.amount + item.amount,
      discount: acc.discount + item.discount,
      taxableValue: acc.taxableValue + item.taxableValue,
      sgst: acc.sgst + item.sgstAmount,
      cgst: acc.cgst + item.cgstAmount,
      igst: acc.igst + item.igstAmount,
      total: acc.total + item.total,
    }),
    {
      amount: 0,
      discount: 0,
      taxableValue: 0,
      sgst: 0,
      cgst: 0,
      igst: 0,
      total: 0,
    }
  );

  return {
    ...summary,
    amount: parseFloat(summary.amount.toFixed(2)),
    discount: parseFloat(summary.discount.toFixed(2)),
    taxableValue: parseFloat(summary.taxableValue.toFixed(2)),
    sgst: parseFloat(summary.sgst.toFixed(2)),
    cgst: parseFloat(summary.cgst.toFixed(2)),
    igst: parseFloat(summary.igst.toFixed(2)),
    total: parseFloat(summary.total.toFixed(2)),
  };
};

// ==========================
// Invoice-level discount helpers
// ==========================

import type { InvoiceDiscount } from "@/types/invoice";


export type InvoiceDiscountComputation = {
  subtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
};

export const clampNumber = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

export const computeInvoiceDiscount = (
  items: InvoiceItem[],
  discount: InvoiceData["discount"] | undefined
): InvoiceDiscountComputation => {

  const subtotal = parseFloat(
    items.reduce((acc, it) => acc + (it.taxableValue ?? 0), 0).toFixed(2)
  );

  if (!discount || !Number.isFinite(discount.value)) {
    return { subtotal, discountAmount: 0, discountedSubtotal: subtotal };
  }

  let discountAmount = 0;

  if (discount.type === "percentage") {
    const pct = clampNumber(discount.value, 0, 100);
    discountAmount = subtotal * (pct / 100);
  } else {
    // fixed
    discountAmount = clampNumber(discount.value, 0, subtotal);
  }

  discountAmount = clampNumber(discountAmount, 0, subtotal);

  const discountedSubtotal = parseFloat((subtotal - discountAmount).toFixed(2));
  return { subtotal, discountAmount: parseFloat(discountAmount.toFixed(2)), discountedSubtotal };
};

export type DiscountedItemResult = {
  items: InvoiceItem[];
  discountAmount: number;
  subtotal: number;
  discountedSubtotal: number;
};

/**
 * Applies invoice-level discount BEFORE GST, matching requirement:
 * Subtotal - Discount => discounted taxable base, then GST computed normally.
 *
 * Implementation approach: scale each item's taxableValue proportionally,
 * then recompute sgst/cgst/igst amounts using each item's gst rates.
 */
export const applyInvoiceDiscountToItems = (
  items: InvoiceItem[],
  discount: InvoiceData["discount"] | undefined
): DiscountedItemResult => {
  const { subtotal, discountAmount, discountedSubtotal } = computeInvoiceDiscount(
    items,
    discount
  );

  if (subtotal <= 0) {
    return {
      items: items.map((it) => ({
        ...it,
        taxableValue: 0,
        sgstAmount: 0,
        cgstAmount: 0,
        igstAmount: 0,
        total: 0,
        amount: 0,
      })),
      discountAmount,
      subtotal,
      discountedSubtotal,
    };
  }

  const scale = discountedSubtotal / subtotal;

  const newItems = items.map((it) => {
    const taxableValue = parseFloat(((it.taxableValue ?? 0) * scale).toFixed(2));

    const newSgstAmount = parseFloat((taxableValue * (it.sgstRate / 100)).toFixed(2));
    const newCgstAmount = parseFloat((taxableValue * (it.cgstRate / 100)).toFixed(2));
    const newIgstAmount = parseFloat((taxableValue * (it.igstRate / 100)).toFixed(2));

    const total = parseFloat(
      (taxableValue + newSgstAmount + newCgstAmount + newIgstAmount).toFixed(2)
    );

    return {
      ...it,
      taxableValue,
      sgstAmount: newSgstAmount,
      cgstAmount: newCgstAmount,
      igstAmount: newIgstAmount,
      total,
      amount: taxableValue,
    };
  });

  return {
    items: newItems,
    discountAmount,
    subtotal,
    discountedSubtotal,
  };
};



// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Generate serial number for items
export const generateSerialNumber = (): string => {
  return Math.random().toString(36).substring(2, 9).toUpperCase();
};