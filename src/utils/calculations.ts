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

// Calculate item totals including GST
export const calculateItemTotals = (item: any) => {
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
    total: parseFloat(total.toFixed(2))
  };
};

// Calculate invoice summary
export const calculateInvoiceSummary = (items: any[]) => {
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