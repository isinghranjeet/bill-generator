import { InvoiceItem } from "@/types/invoice";
import { calculateItemTotals, calculateInvoiceSummary } from "@/utils/calculations";
import { formatCurrency, numberToWords } from "@/utils/formatters";
import { Input } from "@/components/ui/input";

interface InvoiceSummaryProps {
  items: InvoiceItem[];
  remarks: string;
  onRemarksChange: (remarks: string) => void;
  companyName: string;
  editable?: boolean;
}

export const InvoiceSummary = ({
  items,
  remarks,
  onRemarksChange,
  companyName,
  editable = true,
}: InvoiceSummaryProps) => {
  const calculatedItems = items.map(calculateItemTotals);
  const summary = calculateInvoiceSummary(calculatedItems);

  return (
    <div className="border-t border-border">
      {/* Quantity Totals Row */}
      <div className="grid grid-cols-12 border-b border-border text-sm">
        <div className="col-span-5 p-2 font-medium text-right border-r border-border">
          Total
        </div>
        <div className="col-span-1 p-2 text-center border-r border-border font-bold">
          {summary.totalQty}
        </div>
        <div className="col-span-2 p-2 text-right border-r border-border font-bold">
          {formatCurrency(summary.taxableAmount)}
        </div>
        <div className="col-span-1 p-2 border-r border-border"></div>
        <div className="col-span-3 p-2 text-right font-bold">
          {formatCurrency(summary.totalAmount)}
        </div>
      </div>

      <div className="grid grid-cols-2">
        {/* Left - Remarks & Amount in Words */}
        <div className="border-r border-border">
          {/* Amount in Words */}
          <div className="p-3 border-b border-border">
            <div className="invoice-section-title">Amount Chargeable (in words)</div>
            <div className="text-sm font-medium mt-1">
              {numberToWords(summary.totalAmount)}
            </div>
          </div>

          {/* Remarks */}
          <div className="p-3 border-b border-border">
            <div className="invoice-section-title">Remarks</div>
            <textarea
              value={remarks}
              onChange={(e) => onRemarksChange(e.target.value)}
              className="invoice-cell-input w-full resize-none mt-1"
              rows={2}
              placeholder="Enter any remarks..."
              readOnly={!editable}
            />
          </div>

          {/* Payment Instruction */}
          <div className="p-3">
            <div className="text-sm font-medium">
              Issue Cheque in favor of <span className="font-bold">{companyName || "Company Name"}</span>
            </div>
          </div>
        </div>

        {/* Right - Summary */}
        <div className="p-4">
          <div className="invoice-section-title text-center mb-3">Summary</div>
          
          <div className="space-y-2">
            <div className="summary-row">
              <span className="text-muted-foreground">Taxable Amount</span>
              <span className="font-medium">{formatCurrency(summary.taxableAmount)}</span>
            </div>
            <div className="summary-row">
              <span className="text-muted-foreground">CGST</span>
              <span className="font-medium">{formatCurrency(summary.cgst)}</span>
            </div>
            <div className="summary-row">
              <span className="text-muted-foreground">SGST</span>
              <span className="font-medium">{formatCurrency(summary.sgst)}</span>
            </div>
            <div className="summary-row">
              <span className="text-muted-foreground">IGST</span>
              <span className="font-medium">{formatCurrency(summary.igst)}</span>
            </div>
            <div className="summary-row-total">
              <span>Invoice Amount</span>
              <span className="text-primary">{formatCurrency(summary.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
