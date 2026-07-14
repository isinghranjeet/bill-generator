// components/ProfessionalInvoice.tsx

import React, { useMemo, useCallback, useState } from 'react';
import { Company, Party, InvoiceDetails, InvoiceItem } from "@/types/invoice";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Percent, IndianRupee, X } from "lucide-react";

interface ProfessionalInvoiceProps {
  company: Company;
  consignee: Party;
  buyer: Party;
  details: InvoiceDetails;
  items: InvoiceItem[];
  remarks: string;
  editable: boolean;
  onCompanyChange?: (company: Company) => void;
  onConsigneeChange?: (consignee: Party) => void;
  onBuyerChange?: (buyer: Party) => void;
  onDetailsChange?: (details: InvoiceDetails) => void;
  onItemsChange?: (items: InvoiceItem[]) => void;
  onRemarksChange?: (remarks: string) => void;
}

type DocumentType = 'invoice' | 'quotation';
type DiscountType = 'percentage' | 'fixed';

/**
 * NOTE ON PERSISTENCE / TYPES
 * ---------------------------
 * The discount is persisted on the same `details` object (InvoiceDetails)
 * that already carries invoiceNo / quotationNo / date etc., via
 * `onDetailsChange`, so it flows through whatever save/load logic already
 * exists for `details` (draft autosave, DB write, "Edit Invoice" reload).
 *
 * `InvoiceDetails` itself (in @/types/invoice) is not defined in this file,
 * so two optional fields are read/written here via a local extended type
 * instead of editing that file blindly. For full type-safety (no `as`
 * casts) add this to InvoiceDetails:
 *
 *   discountType?: 'percentage' | 'fixed';
 *   discountValue?: number;
 */
interface InvoiceDetailsWithDiscount extends InvoiceDetails {
  discountType?: DiscountType;
  discountValue?: number;
}

const GST_SUGGESTIONS = [0, 5, 12, 18, 28];

// Fixed HSN code used for every line item on this invoice/quotation.
const FIXED_HSN = "9973";

// Fixed prefix for every invoice number. Only the part AFTER this prefix
// is ever shown/edited in the input box.
const INVOICE_NUMBER_PREFIX = "202605";

// Generates a plain, human-readable quotation number (no "QTNO-" or any
// other letter prefix — just digits).
// Format: YYYYMMDDHHmm
function generateQuotationNumber(): string {
  return format(new Date(), 'yyyyMMddHHmm');
}

export const ProfessionalInvoice = React.memo(({
  company,
  consignee,
  buyer,
  details,
  items,
  remarks,
  editable,
  onCompanyChange,
  onConsigneeChange,
  onBuyerChange,
  onDetailsChange,
  onItemsChange,
  onRemarksChange,
}: ProfessionalInvoiceProps) => {
  const detailsWithDiscount = details as InvoiceDetailsWithDiscount;

  // documentType is DERIVED, not stored separately and not synced via a
  // toggled override. This avoids render-order bugs and stale state.
  const documentType: DocumentType = useMemo(() => {
    // Primary source of truth: CreateInvoice sets invoiceTitle to either
    // "QUOTATION" or "TAX INVOICE".
    const title = (details.invoiceTitle || "").toLowerCase();
    if (title.includes("quotation")) return "quotation";
    if (title.includes("invoice")) return "invoice";

    // Fallback heuristic (older saved data): prefer quotation when invoice
    // number isn't present.
    if (details.quotationNo && !details.invoiceNo) return "quotation";

    return "invoice";
  }, [details.invoiceTitle, details.quotationNo, details.invoiceNo]);

  // Memoize totals calculation for performance (unchanged — this is the
  // pre-discount, per-item rollup used by the items table itself).
  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => ({
        taxableValue: acc.taxableValue + item.taxableValue,
        gstAmount: acc.gstAmount + (item.sgstAmount + item.cgstAmount + item.igstAmount),
        total: acc.total + item.total,
      }),
      {
        taxableValue: 0,
        gstAmount: 0,
        total: 0,
      }
    );
  }, [items]);

  // ---------------------------------------------------------------------
  // DISCOUNT
  // ---------------------------------------------------------------------
  const discountType: DiscountType = detailsWithDiscount.discountType || 'percentage';
  const discountValue: number = detailsWithDiscount.discountValue || 0;

  const subtotal = totals.taxableValue;

  // Discount amount, always clamped so it can never exceed the subtotal
  // and a percentage can never exceed 100%.
  const discountAmount = useMemo(() => {
    if (!discountValue) return 0;
    if (discountType === 'percentage') {
      const pct = Math.min(Math.max(discountValue, 0), 100);
      return parseFloat((subtotal * (pct / 100)).toFixed(2));
    }
    const amt = Math.min(Math.max(discountValue, 0), subtotal);
    return parseFloat(amt.toFixed(2));
  }, [discountType, discountValue, subtotal]);

  const discountedTaxableValue = Math.max(parseFloat((subtotal - discountAmount).toFixed(2)), 0);

  // GST is applied on the discounted amount. Since each line item can have
  // its own GST%, the discount is spread proportionally using the blended
  // (weighted-average) GST rate across all items, then GST is recomputed
  // on the discounted taxable value. If your business logic requires GST
  // to always be computed strictly per-item regardless of a global
  // discount, adjust `gstAfterDiscount` below.
  const blendedGstRate = subtotal > 0 ? totals.gstAmount / subtotal : 0;
  const gstAfterDiscount = parseFloat((discountedTaxableValue * blendedGstRate).toFixed(2));
  const grandTotalAfterDiscount = parseFloat((discountedTaxableValue + gstAfterDiscount).toFixed(2));

  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [draftDiscountType, setDraftDiscountType] = useState<DiscountType>(discountType);
  const [draftDiscountValue, setDraftDiscountValue] = useState<string>(
    discountValue ? String(discountValue) : ''
  );
  const [discountError, setDiscountError] = useState<string | null>(null);

  const openDiscountModal = useCallback(() => {
    setDraftDiscountType(discountType);
    setDraftDiscountValue(discountValue ? String(discountValue) : '');
    setDiscountError(null);
    setDiscountModalOpen(true);
  }, [discountType, discountValue]);

  const closeDiscountModal = useCallback(() => {
    setDiscountModalOpen(false);
    setDiscountError(null);
  }, []);

  const handleSaveDiscount = useCallback(() => {
    const numeric = parseFloat(draftDiscountValue);

    if (draftDiscountValue.trim() === '' || isNaN(numeric) || numeric < 0) {
      setDiscountError('Enter a valid discount value (0 or more).');
      return;
    }

    if (draftDiscountType === 'percentage' && numeric > 100) {
      setDiscountError('Percentage discount cannot exceed 100%.');
      return;
    }

    if (draftDiscountType === 'fixed' && numeric > subtotal) {
      setDiscountError(`Fixed discount cannot exceed the subtotal (₹${subtotal.toFixed(2)}).`);
      return;
    }

    if (!onDetailsChange) return;

    onDetailsChange({
      ...details,
      discountType: draftDiscountType,
      discountValue: numeric,
    } as InvoiceDetails);

    setDiscountError(null);
    setDiscountModalOpen(false);
  }, [draftDiscountType, draftDiscountValue, subtotal, details, onDetailsChange]);

  const handleRemoveDiscount = useCallback(() => {
    if (!onDetailsChange) return;
    onDetailsChange({
      ...details,
      discountType: 'percentage',
      discountValue: 0,
    } as InvoiceDetails);
    setDraftDiscountType('percentage');
    setDraftDiscountValue('');
    setDiscountError(null);
    setDiscountModalOpen(false);
  }, [details, onDetailsChange]);

  // ---------------------------------------------------------------------
  // ITEMS
  // ---------------------------------------------------------------------

  const handleAddItem = useCallback(() => {
    if (!onItemsChange) return;

    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      srNo: items.length + 1,
      description: "",
      hsn: FIXED_HSN,
      quantity: 1,
      days: 1,
      unit: "Pcs",
      rate: 0,
      amount: 0,
      taxableValue: 0,
      gstPercent: undefined,
      discount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      cgstRate: 0,
      cgstAmount: 0,
      igstRate: 0,
      igstAmount: 0,
      total: 0,
    };

    onItemsChange([...items, newItem]);
  }, [items, onItemsChange]);

  const handleDeleteItem = useCallback(
    (id: string) => {
      if (!onItemsChange) return;

      const newItems = items
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, srNo: index + 1 }));

      onItemsChange(newItems);
    },
    [items, onItemsChange]
  );

  const updateItem = useCallback(
    (index: number, field: keyof InvoiceItem, value: unknown) => {
      if (!onItemsChange) return;

      const newItems = [...items];
      const item = { ...newItems[index], [field]: value } as InvoiceItem;

      // HSN is always fixed — never allow it to be changed away from this.
      item.hsn = FIXED_HSN;

      // GST must never be negative and is always a whole number.
      if (typeof item.gstPercent === 'number') {
        item.gstPercent = Math.max(0, Math.round(item.gstPercent));
      }

      // Ensure days has a default value of 1
      const days = item.days || 1;
      const quantity = item.quantity || 0;
      const rate = item.rate || 0;

      // Calculate amount = Rate × Qty × Days
      const amount = rate * quantity * days;
      const taxableValue = amount;

      item.amount = parseFloat(amount.toFixed(2));
      item.taxableValue = parseFloat(taxableValue.toFixed(2));

      // Calculate GST
      const gstRate = typeof item.gstPercent === "number" ? item.gstPercent : undefined;

      if (gstRate === undefined) {
        item.sgstRate = 0;
        item.cgstRate = 0;
        item.sgstAmount = 0;
        item.cgstAmount = 0;
        item.igstRate = 0;
        item.igstAmount = 0;
        item.total = parseFloat(taxableValue.toFixed(2));
      } else {
        item.sgstRate = gstRate / 2;
        item.cgstRate = gstRate / 2;
        item.sgstAmount = parseFloat((taxableValue * (item.sgstRate / 100)).toFixed(2));
        item.cgstAmount = parseFloat((taxableValue * (item.cgstRate / 100)).toFixed(2));
        item.igstRate = 0;
        item.igstAmount = 0;
        item.total = parseFloat((taxableValue + item.sgstAmount + item.cgstAmount).toFixed(2));
      }

      newItems[index] = item;
      onItemsChange(newItems);
    },
    [items, onItemsChange]
  );

  // Integer +/- stepper for GST. Always moves by exactly 1, never 0.1, and
  // is clamped so it can never go negative.
  const handleGstStep = useCallback(
    (index: number, delta: number) => {
      const current = typeof items[index].gstPercent === 'number' ? (items[index].gstPercent as number) : 0;
      const next = Math.max(0, Math.round(current) + delta);
      updateItem(index, 'gstPercent', next);
    },
    [items, updateItem]
  );

  // Tracks which item row currently has its GST quick-suggestion chips open.
  const [gstChipsOpenIndex, setGstChipsOpenIndex] = useState<number | null>(null);

  // ---------------------------------------------------------------------
  // INVOICE / QUOTATION NUMBER
  // ---------------------------------------------------------------------

  const invoiceNumberSuffix = useMemo(() => {
    const raw = details.invoiceNo || "";
    return raw.startsWith(INVOICE_NUMBER_PREFIX)
      ? raw.slice(INVOICE_NUMBER_PREFIX.length)
      : raw;
  }, [details.invoiceNo]);

  const handleInvoiceNumberSuffixChange = useCallback(
    (suffix: string) => {
      if (!onDetailsChange) return;
      // Keep only digits in the editable part so the number stays clean.
      const cleanSuffix = suffix.replace(/[^0-9]/g, "");
      onDetailsChange({ ...details, invoiceNo: INVOICE_NUMBER_PREFIX + cleanSuffix });
    },
    [details, onDetailsChange]
  );

  const handleQuotationNumberChange = useCallback(
    (value: string) => {
      if (onDetailsChange) {
        onDetailsChange({ ...details, quotationNo: value });
      }
    },
    [details, onDetailsChange]
  );

  // Safety net: if invoice number is missing/empty, seed it with just the
  // fixed prefix. If quotation number is missing, generate one. Guarded so
  // it can never loop and never clobber an existing value.
  React.useEffect(() => {
    if (!onDetailsChange) return;

    if (documentType === 'invoice' && !details.invoiceNo) {
      onDetailsChange({ ...details, invoiceNo: INVOICE_NUMBER_PREFIX });
      return;
    }

    if (documentType === 'quotation' && !details.quotationNo) {
      onDetailsChange({ ...details, quotationNo: generateQuotationNumber() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentType, details.invoiceNo, details.quotationNo]);

  // Render item row
  const renderItemRow = useCallback(
    (item: InvoiceItem, index: number) => (
      <tr key={item.id} className="print:break-inside-avoid print:page-break-inside-avoid">
        <td className="border border-gray-300 p-1 text-center print:text-[8px] print:leading-tight">{item.srNo}</td>

        <td className="border border-gray-300 p-1 print:text-[8px] print:leading-tight">
          {editable ? (
            <div className="print:hidden">
              <Input
                value={item.description}
                onChange={(e) => updateItem(index, 'description', e.target.value)}
                className="h-5 text-xs w-full"
                placeholder="Item description"
              />
            </div>
          ) : null}
          <span className={editable ? "hidden print:block" : "text-xs"}>
            {item.description || "-"}
          </span>
        </td>

        {/* HSN is fixed at 9973 — read-only, no input box */}
        <td className="border border-gray-300 p-1 text-center print:text-[8px] print:leading-tight">
          <span className="block text-center text-xs font-medium">{FIXED_HSN}</span>
        </td>

        <td className="border border-gray-300 p-1 print:text-[8px] print:leading-tight">
          {editable ? (
            <div className="print:hidden">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={item.rate}
                onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                className="h-5 text-xs text-right w-full"
                placeholder="0.00"
              />
            </div>
          ) : null}
          <span className={editable ? "hidden print:block text-right font-medium" : "block text-right text-xs font-medium"}>
            {item.rate.toFixed(2)}
          </span>
        </td>

        <td className="border border-gray-300 p-1 print:text-[8px] print:leading-tight">
          {editable ? (
            <div className="print:hidden">
              <Input
                type="number"
                min="1"
                step="1"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                className="h-5 text-xs text-center w-full"
                placeholder="1"
              />
            </div>
          ) : null}
          <span className={editable ? "hidden print:block text-center font-medium" : "block text-center text-xs font-medium"}>
            {item.quantity}
          </span>
        </td>

        <td className="border border-gray-300 p-1 print:text-[8px] print:leading-tight">
          {editable ? (
            <div className="print:hidden">
              <Input
                type="number"
                min="1"
                step="1"
                value={item.days || 1}
                onChange={(e) => updateItem(index, 'days', parseFloat(e.target.value) || 1)}
                className="h-5 text-xs text-center w-full"
                placeholder="1"
              />
            </div>
          ) : null}
          <span className={editable ? "hidden print:block text-center font-medium" : "block text-center text-xs font-medium"}>
            {item.days || 1}
          </span>
        </td>

        <td className="border border-gray-300 p-1 text-right print:text-[8px] print:leading-tight">
          <span className="text-xs font-semibold print:text-[8px]">{item.taxableValue.toFixed(2)}</span>
        </td>

        {/* GST cell: integer +/- steppers + quick-suggestion chips on focus */}
        <td className="border border-gray-300 p-1 print:text-[8px] print:leading-tight">
          {editable ? (
            <div className="relative print:hidden">
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => handleGstStep(index, -1)}
                  className="h-5 w-5 shrink-0 flex items-center justify-center rounded border border-gray-300 text-xs leading-none text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                  aria-label="Decrease GST by 1"
                  disabled={!item.gstPercent}
                >
                  −
                </button>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={typeof item.gstPercent === 'number' ? item.gstPercent : ''}
                  onFocus={() => setGstChipsOpenIndex(index)}
                  onBlur={() =>
                    setTimeout(
                      () => setGstChipsOpenIndex((cur) => (cur === index ? null : cur)),
                      150
                    )
                  }
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      updateItem(index, 'gstPercent', undefined);
                      return;
                    }
                    const parsed = Math.round(parseFloat(raw));
                    const next = isNaN(parsed) ? undefined : Math.max(0, parsed);
                    updateItem(index, 'gstPercent', next);
                  }}
                  className="h-5 text-xs text-center w-full"
                  placeholder="18"
                />
                <button
                  type="button"
                  onClick={() => handleGstStep(index, 1)}
                  className="h-5 w-5 shrink-0 flex items-center justify-center rounded border border-gray-300 text-xs leading-none text-gray-600 hover:bg-gray-100"
                  aria-label="Increase GST by 1"
                >
                  +
                </button>
              </div>

              {gstChipsOpenIndex === index && (
                <div className="absolute z-20 top-full left-0 mt-1 flex gap-1 bg-white border border-gray-200 rounded shadow-md p-1 whitespace-nowrap">
                  {GST_SUGGESTIONS.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        updateItem(index, 'gstPercent', pct);
                        setGstChipsOpenIndex(null);
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
          <span className={editable ? "hidden print:block text-center font-medium" : "block text-center text-xs font-medium"}>
            {typeof item.gstPercent === 'number' ? `${item.gstPercent}%` : '-'}
          </span>
        </td>

        <td className="border border-gray-300 p-1 text-right print:text-[8px] print:leading-tight">
          <span className="text-xs font-bold text-blue-700 print:text-[8px]">{item.total.toFixed(2)}</span>
        </td>

        {editable && (
          <td className="border border-gray-300 p-1 text-center print:hidden">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteItem(item.id)}
              className="h-5 w-5 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              title="Delete item"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </td>
        )}
      </tr>
    ),
    [editable, updateItem, handleDeleteItem, handleGstStep, gstChipsOpenIndex]
  );

  return (
    <div className="bg-white p-6 print:p-0 w-[210mm] print:w-full min-h-[297mm] print:min-h-auto mx-auto font-sans print:border-0 print:shadow-none print:overflow-visible">
      {/* ===== ACTION BAR (Discount button lives here — pair this with your
          existing "Print PDF" button in the parent toolbar; this component
          only owns the button + popup, not page-level PDF/print actions) ===== */}
      {editable && (
        <div className="flex justify-end mb-3 print:hidden relative">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openDiscountModal}
            className="h-8 text-xs"
          >
            <Percent className="h-3.5 w-3.5 mr-1.5" />
            Discount
            {discountAmount > 0 && (
              <span className="ml-1.5 rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px] font-semibold">
                {discountType === 'percentage' ? `${discountValue}%` : `₹${discountAmount.toFixed(0)}`}
              </span>
            )}
          </Button>

          {discountModalOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40 bg-black/20"
                onClick={closeDiscountModal}
              />
              {/* Popup */}
              <div className="absolute right-0 top-10 z-50 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-800">Apply Discount</h3>
                  <button
                    type="button"
                    onClick={closeDiscountModal}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setDraftDiscountType('percentage')}
                    className={`flex items-center justify-center gap-1 h-8 rounded border text-xs font-medium ${
                      draftDiscountType === 'percentage'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Percent className="h-3.5 w-3.5" />
                    Percentage
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftDiscountType('fixed')}
                    className={`flex items-center justify-center gap-1 h-8 rounded border text-xs font-medium ${
                      draftDiscountType === 'fixed'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <IndianRupee className="h-3.5 w-3.5" />
                    Fixed Amount
                  </button>
                </div>

                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  {draftDiscountType === 'percentage' ? 'Discount %' : 'Discount Amount (₹)'}
                </label>
                <Input
                  type="number"
                  min="0"
                  max={draftDiscountType === 'percentage' ? 100 : subtotal}
                  step={draftDiscountType === 'percentage' ? 1 : 0.01}
                  value={draftDiscountValue}
                  onChange={(e) => {
                    setDraftDiscountValue(e.target.value);
                    setDiscountError(null);
                  }}
                  placeholder={draftDiscountType === 'percentage' ? 'e.g. 10' : 'e.g. 500'}
                  className="h-8 text-xs mb-1"
                />

                {discountError && (
                  <p className="text-[11px] text-red-600 mb-2">{discountError}</p>
                )}

                <div className="text-[11px] text-gray-500 mb-3 space-y-0.5 border-t border-dashed border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount</span>
                    <span>
                      −₹
                      {(() => {
                        const n = parseFloat(draftDiscountValue);
                        if (isNaN(n) || n <= 0) return '0.00';
                        if (draftDiscountType === 'percentage') {
                          return (subtotal * (Math.min(n, 100) / 100)).toFixed(2);
                        }
                        return Math.min(n, subtotal).toFixed(2);
                      })()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={handleSaveDiscount}
                  >
                    Save
                  </Button>
                  {discountAmount > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                      onClick={handleRemoveDiscount}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== HEADER SECTION (must stay on first page) ===== */}
      <div className="print:header-block print:break-inside-avoid">
        <div className="border-b-2 border-black pb-4 mb-4 print:pb-2">
          <div className="flex justify-between items-start print:flex-nowrap">
            <div className="flex-1 print:flex-1">
              <div className="flex items-start gap-3 mb-2 print:gap-2">
                {company.logo && (
                  <div className="print:max-h-[50px] print:flex-shrink-0">
                    <img
                      src={company.logo}
                      alt={`${company.name} Logo`}
                      className="h-16 w-auto object-contain print:max-h-[50px] print:h-auto"
                    />
                  </div>
                )}

                <div className="flex-1 print:break-inside-avoid">
                  <div className="print:break-inside-avoid">
                    <h1 className="text-3xl font-black text-blue-900 tracking-wider mb-1 print:text-xl print:mb-0">
                      {company.name || "RENT MY EVENT"}
                    </h1>
                    <div className="text-sm font-medium text-blue-600 uppercase tracking-widest mb-2 print:text-[10px] print:mb-1">
                      Style Your Moment
                    </div>
                  </div>

                  <div className="text-xs text-gray-600 space-y-0.5 print:text-[7px] print:space-y-0">
                    <p className="font-medium print:font-normal">{company.address}</p>
                    <div className="grid grid-cols-2 gap-1 print:grid-cols-2">
                      <p>
                        <span className="font-semibold print:font-medium">GSTIN:</span> {company.gstin}
                      </p>
                      <p>
                        <span className="font-semibold print:font-medium">State:</span> {company.state} ({company.stateCode})
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-1 print:grid-cols-2">
                      <p>
                        <span className="font-semibold print:font-medium">Mobile:</span> {company.mobile || "Not provided"}
                      </p>
                      <p>
                        <span className="font-semibold print:font-medium">Email:</span> {company.email || "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-l pl-3 ml-3 min-w-[200px] print:min-w-[140px] print:pl-2 print:ml-2">
              <div className="mb-3 print:mb-1">
                {editable && onDetailsChange ? (
                  <Input
                    value={details.invoiceTitle || ""}
                    onChange={(e) =>
                      onDetailsChange({
                        ...details,
                        invoiceTitle: e.target.value,
                      })
                    }
                    placeholder="TAX INVOICE"
                    className="h-8 text-center text-xl font-bold text-blue-800 print:hidden"
                  />
                ) : null}
                <h2 className="text-xl font-bold text-center text-blue-800 print:text-base print:leading-tight">
                  {details.invoiceTitle?.trim() || "TAX INVOICE"}
                </h2>
              </div>

              <div className="space-y-1 print:space-y-0.5">

                {/* Number (Invoice vs Quotation) */}
                {documentType === "invoice" ? (
                  <div className="grid grid-cols-2 gap-1 items-center print:grid-cols-2 print:gap-0.5">
                    <span className="font-semibold text-xs print:text-[7px]">Invoice No:</span>
                    {editable && onDetailsChange ? (
                      <>
                        <div className="flex items-center print:hidden">
                          <span className="text-xs font-medium mr-1 whitespace-nowrap">
                            {INVOICE_NUMBER_PREFIX}
                          </span>
                          <Input
                            value={invoiceNumberSuffix}
                            onChange={(e) => handleInvoiceNumberSuffixChange(e.target.value)}
                            className="h-6 text-xs w-full"
                            placeholder="Enter number"
                            inputMode="numeric"
                          />
                        </div>
                        <span className="hidden print:block text-xs print:text-[7px] font-medium">
                          {details.invoiceNo || INVOICE_NUMBER_PREFIX}
                        </span>
                      </>
                    ) : (
                      <span className="font-medium text-xs print:text-[7px] print:font-normal">
                        {details.invoiceNo || INVOICE_NUMBER_PREFIX}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1 items-center print:grid-cols-2 print:gap-0.5">
                    <span className="font-semibold text-xs print:text-[7px]">Quotation No:</span>
                    {editable && onDetailsChange ? (
                      <>
                        <Input
                          value={details.quotationNo || ""}
                          onChange={(e) => handleQuotationNumberChange(e.target.value)}
                          className="h-6 text-xs w-full print:hidden"
                          placeholder="Enter quotation number"
                        />
                        <span className="hidden print:block text-xs print:text-[7px]">
                          {details.quotationNo || "-"}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs print:text-[7px]">{details.quotationNo || "-"}</span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-1 items-center print:grid-cols-2 print:gap-0.5">
                  <span className="font-semibold text-xs print:text-[7px]">Date:</span>
                  {editable && onDetailsChange ? (
                    <Input
                      type="date"
                      value={format(details.date, 'yyyy-MM-dd')}
                      onChange={(e) => onDetailsChange({ ...details, date: new Date(e.target.value) })}
                      className="h-6 text-xs w-full print:hidden"
                    />
                  ) : null}
                  <span className={editable ? "hidden print:block text-xs print:text-[7px]" : "text-xs print:text-[7px]"}>
                    {format(details.date, 'dd/MM/yyyy')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 items-center print:grid-cols-2 print:gap-0.5">
                  <span className="font-semibold text-xs print:text-[7px]">Payment Terms:</span>
                  {editable && onDetailsChange ? (
                    <Input
                      value={details.modeOfPayment}
                      onChange={(e) => onDetailsChange({ ...details, modeOfPayment: e.target.value })}
                      className="h-6 text-xs w-full print:hidden"
                    />
                  ) : null}
                  <span className={editable ? "hidden print:block text-xs print:text-[7px]" : "text-xs print:text-[7px]"}>
                    {details.modeOfPayment || "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== PARTY SECTION ===== */}
        <div className="mb-4 border-b border-gray-300 pb-3 print:mb-2 print:pb-2 print:break-inside-avoid">
          <div className="grid grid-cols-2 gap-4 print:gap-2">
            <div>
              <h3 className="font-bold text-xs mb-1 text-blue-700 print:text-[8px] print:mb-0.5">BILL TO</h3>
              <div className="border border-gray-300 p-2 rounded print:p-1">
                {editable && onBuyerChange ? (
                  <>
                    <div className="space-y-1 print:hidden">
                      <Input
                        value={buyer.name}
                        onChange={(e) => onBuyerChange({ ...buyer, name: e.target.value })}
                        placeholder="Buyer Name"
                        className="h-6 text-xs w-full"
                      />
                      <Textarea
                        value={buyer.address}
                        onChange={(e) => onBuyerChange({ ...buyer, address: e.target.value })}
                        placeholder="Address"
                        className="h-14 text-xs w-full"
                        rows={2}
                      />
                      <div className="grid grid-cols-2 gap-1">
                        <Input
                          value={buyer.gstin}
                          onChange={(e) => onBuyerChange({ ...buyer, gstin: e.target.value })}
                          placeholder="GSTIN"
                          className="h-6 text-xs"
                        />
                        <Input
                          value={buyer.state}
                          onChange={(e) => onBuyerChange({ ...buyer, state: e.target.value })}
                          placeholder="State"
                          className="h-6 text-xs"
                        />
                      </div>
                    </div>
                    <div className="hidden print:block text-[7px] space-y-0.5">
                      <p className="font-semibold">{buyer.name || "Not provided"}</p>
                      <p className="whitespace-pre-wrap text-gray-700">{buyer.address || "Not provided"}</p>
                      <div className="grid grid-cols-2 gap-1 mt-0.5">
                        <p>
                          <span className="font-medium">GSTIN:</span> {buyer.gstin || "-"}
                        </p>
                        <p>
                          <span className="font-medium">State:</span> {buyer.state || "-"}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-xs space-y-0.5 print:text-[7px] print:space-y-0.5">
                    <p className="font-semibold">{buyer.name || "Not provided"}</p>
                    <p className="whitespace-pre-wrap text-gray-700">{buyer.address || "Not provided"}</p>
                    <div className="grid grid-cols-2 gap-1 mt-1 print:mt-0.5">
                      <p>
                        <span className="font-medium">GSTIN:</span> {buyer.gstin || "-"}
                      </p>
                      <p>
                        <span className="font-medium">State:</span> {buyer.state || "-"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-xs mb-1 text-blue-700 print:text-[8px] print:mb-0.5">SHIP TO</h3>
              <div className="border border-gray-300 p-2 rounded print:p-1">
                {editable && onConsigneeChange ? (
                  <>
                    <div className="space-y-1 print:hidden">
                      <Input
                        value={consignee.name}
                        onChange={(e) => onConsigneeChange({ ...consignee, name: e.target.value })}
                        placeholder="Consignee Name"
                        className="h-6 text-xs w-full"
                      />
                      <Textarea
                        value={consignee.address}
                        onChange={(e) => onConsigneeChange({ ...consignee, address: e.target.value })}
                        placeholder="Address"
                        className="h-14 text-xs w-full"
                        rows={2}
                      />
                      <div className="grid grid-cols-2 gap-1">
                        <Input
                          value={consignee.gstin}
                          onChange={(e) => onConsigneeChange({ ...consignee, gstin: e.target.value })}
                          placeholder="GSTIN"
                          className="h-6 text-xs"
                        />
                        <Input
                          value={consignee.state}
                          onChange={(e) => onConsigneeChange({ ...consignee, state: e.target.value })}
                          placeholder="State"
                          className="h-6 text-xs"
                        />
                      </div>
                    </div>
                    <div className="hidden print:block text-[7px] space-y-0.5">
                      <p className="font-semibold">{consignee.name || "Not provided"}</p>
                      <p className="whitespace-pre-wrap text-gray-700">{consignee.address || "Not provided"}</p>
                      <div className="grid grid-cols-2 gap-1 mt-0.5">
                        <p>
                          <span className="font-medium">GSTIN:</span> {consignee.gstin || "-"}
                        </p>
                        <p>
                          <span className="font-medium">State:</span> {consignee.state || "-"}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-xs space-y-0.5 print:text-[7px] print:space-y-0.5">
                    <p className="font-semibold">{consignee.name || "Not provided"}</p>
                    <p className="whitespace-pre-wrap text-gray-700">{consignee.address || "Not provided"}</p>
                    <div className="grid grid-cols-2 gap-1 mt-1 print:mt-0.5">
                      <p>
                        <span className="font-medium">GSTIN:</span> {consignee.gstin || "-"}
                      </p>
                      <p>
                        <span className="font-medium">State:</span> {consignee.state || "-"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== ITEMS TABLE (only this continues onto next pages) ===== */}
      <div className="print:items-block print:break-inside-auto">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse text-xs print:text-[7px]">
            <thead className="print:table-header-group invoice-table-thead">
              <tr className="bg-blue-50 print:bg-blue-50 print:print-color-adjust-exact">
                <th className="border border-gray-400 p-1 text-center print:p-0.5 print:text-[7px]">Sr.</th>
                <th className="border border-gray-400 p-1 text-left print:p-0.5 print:text-[7px]">Description</th>
                <th className="border border-gray-400 p-1 text-center print:p-0.5 print:text-[7px]">HSN</th>
                <th className="border border-gray-400 p-1 text-center print:p-0.5 print:text-[7px]">Rate (₹)</th>
                <th className="border border-gray-400 p-1 text-center print:p-0.5 print:text-[7px]">Qty</th>
                <th className="border border-gray-400 p-1 text-center print:p-0.5 print:text-[7px]">Days</th>
                <th className="border border-gray-400 p-1 text-center print:p-0.5 print:text-[7px]">Taxable Value (₹)</th>
                <th className="border border-gray-400 p-1 text-center print:p-0.5 print:text-[7px]">GST%</th>
                <th className="border border-gray-400 p-1 text-center font-bold print:p-0.5 print:text-[7px]">Amount (₹)</th>
                {editable && <th className="border border-gray-400 p-1 text-center print:hidden">Action</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => renderItemRow(item, index))}

              <tr className="bg-gray-50 font-bold print:bg-gray-50 print:print-color-adjust-exact">
                <td colSpan={6} className="border border-gray-300 p-1 text-right pr-2 print:p-0.5 print:text-[7px]">
                  <span>Total:</span>
                </td>
                <td className="border border-gray-300 p-1 text-right print:p-0.5 print:text-[7px]">
                  <span className="text-blue-700">{totals.taxableValue.toFixed(2)}</span>
                </td>
                <td className="border border-gray-300 p-1 print:p-0.5"></td>
                <td className="border border-gray-300 p-1 text-right print:p-0.5 print:text-[7px]">
                  <span className="text-green-700 font-bold">{totals.total.toFixed(2)}</span>
                </td>
                {editable && <td className="border border-gray-300 p-1 print:hidden"></td>}
              </tr>
            </tbody>
          </table>
        </div>

        {editable && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="mt-3 print:hidden"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Item
          </Button>
        )}
      </div>

      {/* ===== FOOTER SECTION ===== */}
      <div className="print:footer-block print:break-inside-avoid">
        <div className="mb-3 print:mb-2">
          <div className="grid grid-cols-2 gap-4 print:gap-2">
            <div className="print:break-inside-avoid print:page-break-inside-avoid">
              <h4 className="font-bold text-xs mb-1 text-blue-700 print:text-[8px] print:mb-0.5">BANK DETAILS</h4>
              <div className="border border-gray-300 p-2 rounded bg-gray-50 print:bg-gray-50 print:print-color-adjust-exact print:p-1">
                <div className="text-xs space-y-0.5 print:text-[7px] print:space-y-0">
                  <p>
                    <span className="font-semibold print:font-medium">Account Name:</span> Rent My Event
                  </p>
                  <p>
                    <span className="font-semibold print:font-medium">Bank Name:</span> State Bank of India
                  </p>
                  <p>
                    <span className="font-semibold print:font-medium">Account Number:</span> 44853461690
                  </p>
                  <p>
                    <span className="font-semibold print:font-medium">IFSC Code:</span> SBIN0010269
                  </p>
                  <p>
                    <span className="font-semibold print:font-medium">Branch:</span> Madhuban Enclave
                  </p>
                </div>
              </div>
            </div>

            <div className="print:break-inside-avoid print:page-break-inside-avoid">
              <h4 className="font-bold text-xs mb-1 text-blue-700 print:text-[8px] print:mb-0.5">AMOUNT SUMMARY</h4>
              <div className="border border-gray-300 rounded overflow-hidden mb-3 print:mb-1">
                <table className="w-full text-xs print:text-[7px]">
                  <tbody>
                    <tr className="border-b border-gray-300">
                      <td className="p-2 font-semibold print:p-1">Subtotal:</td>
                      <td className="p-2 text-right font-bold print:p-1">₹{subtotal.toFixed(2)}</td>
                    </tr>

                    {discountAmount > 0 && (
                      <tr className="border-b border-gray-300">
                        <td className="p-2 font-semibold print:p-1 text-red-700">
                          Discount {discountType === 'percentage' ? `(${discountValue}%)` : `(₹${discountValue})`}:
                        </td>
                        <td className="p-2 text-right font-bold print:p-1 text-red-700">
                          −₹{discountAmount.toFixed(2)}
                        </td>
                      </tr>
                    )}

                    <tr className="border-b border-gray-300">
                      <td className="p-2 font-semibold print:p-1">
                        GST ({typeof items[0]?.gstPercent === 'number' ? `${items[0]!.gstPercent}%` : '-' }):
                      </td>
                      <td className="p-2 text-right font-bold print:p-1">
                        ₹{(discountAmount > 0 ? gstAfterDiscount : totals.gstAmount).toFixed(2)}
                      </td>
                    </tr>
                    <tr className="border-t-2 border-gray-400 bg-blue-50 print:bg-blue-50 print:print-color-adjust-exact">
                      <td className="p-2 font-bold text-base print:p-1 print:text-[9px]">GRAND TOTAL:</td>
                      <td className="p-2 text-right font-bold text-base text-green-700 print:p-1 print:text-[9px]">
                        ₹{(discountAmount > 0 ? grandTotalAfterDiscount : totals.total).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="print:break-inside-avoid print:page-break-inside-avoid">
                <p className="font-semibold text-xs mb-1 text-blue-700 print:text-[8px] print:mb-0.5">AMOUNT IN WORDS</p>
                <div className="border border-gray-300 p-2 rounded bg-gray-50 print:bg-gray-50 print:print-color-adjust-exact min-h-[50px] text-xs italic print:min-h-[30px] print:p-1 print:text-[7px]">
                  {convertToWords(discountAmount > 0 ? grandTotalAfterDiscount : totals.total)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="print:break-inside-avoid print:page-break-inside-avoid mb-4 print:mb-2">
          <p className="font-semibold text-xs mb-1 text-blue-700 print:text-[8px] print:mb-0.5">REMARKS</p>
          {editable && onRemarksChange ? (
            <>
              <Textarea
                value={remarks}
                onChange={(e) => onRemarksChange(e.target.value)}
                className="h-16 text-xs print:hidden w-full"
                placeholder="Enter any remarks or terms here..."
                rows={2}
              />
              <div className="hidden print:block border border-gray-300 p-2 rounded bg-gray-50 print:bg-gray-50 print:print-color-adjust-exact min-h-[40px] text-[7px] print:p-1">
                {remarks || "No remarks"}
              </div>
            </>
          ) : (
            <div className="border border-gray-300 p-2 rounded bg-gray-50 print:bg-gray-50 print:print-color-adjust-exact min-h-[50px] text-xs print:min-h-[30px] print:p-1 print:text-[7px]">
              {remarks || "No remarks"}
            </div>
          )}
        </div>

        <div className="print:break-inside-avoid print:page-break-inside-avoid pt-3 border-t-2 border-black print:pt-2 print:mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-bold text-xs mb-6 print:text-[8px] print:mb-3">For {company.name}</p>
              <div className="text-center mt-10 print:mt-6">
                <div className="border-t border-black w-40 mx-auto pt-1 print:w-32">
                  <p className="text-xs font-semibold print:text-[7px]">Authorized Signatory</p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="font-bold text-xs mb-6 print:text-[8px] print:mb-3">Receiver's Signature</p>
              <div className="text-center mt-10 print:mt-6">
                <div className="border-t border-black w-40 ml-auto pt-1 print:w-32">
                  <p className="text-xs font-semibold print:text-[7px]">Seal & Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ProfessionalInvoice.displayName = 'ProfessionalInvoice';

// Number to words conversion
function convertToWords(num: number): string {
  if (num === 0) return "Zero Rupees Only";

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  function convertBelow1000(n: number): string {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return (
      ones[Math.floor(n / 100)] +
      ' Hundred' +
      (n % 100 !== 0 ? ' and ' + convertBelow1000(n % 100) : '')
    );
  }

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = Math.floor(num % 1000);

  let result = '';

  if (crore > 0) result += convertBelow1000(crore) + ' Crore ';
  if (lakh > 0) result += convertBelow1000(lakh) + ' Lakh ';
  if (thousand > 0) result += convertBelow1000(thousand) + ' Thousand ';
  if (remainder > 0) result += convertBelow1000(remainder);

  return (result.trim() + ' Rupees Only').replace(/\s+/g, ' ');
}
