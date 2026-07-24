import { InvoiceDetails } from "@/types/invoice";
import type { Company } from "@/types/invoice";

import { formatDate } from "@/utils/formatters";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import { CreatableSearchableSelect } from "@/components/invoice/CreatableSearchableSelect";
import { getInvoiceNumberKeys, getQuotationNumberKeys } from "@/lib/invoiceApi";





interface InvoiceHeaderProps {
  company: Company;
  details: InvoiceDetails;
  onCompanyChange: (company: Company) => void;
  onDetailsChange: (details: InvoiceDetails) => void;
  editable?: boolean;
}


export const InvoiceHeader = ({
  company,
  details,
  onCompanyChange,
  onDetailsChange,
  editable = true,
}: InvoiceHeaderProps) => {
  const inputClass = editable
    ? "invoice-cell-input"
    : "bg-transparent border-0 cursor-default";

  // Snapshot architecture: invoice/quotation numbers must be immutable for an existing invoice.
  const [invoiceNoOptions, setInvoiceNoOptions] = useState<string[]>([]);
  const [quotationNoOptions, setQuotationNoOptions] = useState<string[]>([]);


  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const [invRes, quoRes] = await Promise.all([
          getInvoiceNumberKeys(),
          getQuotationNumberKeys(),
        ]);

        if (!mounted) return;

        setInvoiceNoOptions(invRes.items ?? []);
        setQuotationNoOptions(quoRes.items ?? []);
      } catch {
        // If keys endpoint fails, keep dropdown empty; user can still type custom values.
        if (!mounted) return;
        setInvoiceNoOptions([]);
        setQuotationNoOptions([]);
      }
    };

    if (editable) run();

    return () => {
      mounted = false;
    };
  }, [editable]);


  return (
    <div className="border-b border-border">
      {/* Title */}
      <div className="bg-primary text-primary-foreground text-center py-3">
        {editable ? (
          <Input
            value={details.invoiceTitle ?? "TAX INVOICE"}
            onChange={(e) =>
              onDetailsChange({
                ...details,
                invoiceTitle: e.target.value ?? "",
              })
            }
            className="text-xl font-bold tracking-wide text-center border-primary-foreground bg-transparent"
            readOnly={!editable}
          />
        ) : (
          <h1 className="text-xl font-bold tracking-wide">
            {details.invoiceTitle ?? "TAX INVOICE"}
          </h1>
        )}
      </div>


      {/* Company & Invoice Details Grid */}
      <div className="grid grid-cols-3 border-b border-border">
        {/* Company Details - Left Column */}
        <div className="col-span-1 border-r border-border p-4">
          <Input
            value={company.name}
            onChange={(e) => onCompanyChange({ ...company, name: e.target.value })}
            className={`${inputClass} font-bold text-lg mb-1`}
            placeholder="Company Name"
            readOnly={!editable}
          />
          <textarea
            value={company.address}
            onChange={(e) => onCompanyChange({ ...company, address: e.target.value })}
            className={`${inputClass} w-full resize-none text-sm text-muted-foreground`}
            placeholder="Address"
            rows={2}
            readOnly={!editable}
          />
          <div className="text-sm mt-2">
            <span className="font-medium">GSTIN/UIN: </span>
            <Input
              value={company.gstin}
              onChange={(e) => onCompanyChange({ ...company, gstin: e.target.value })}
              className={`${inputClass} inline-block w-auto`}
              placeholder="GSTIN"
              readOnly={!editable}
            />
          </div>
          <div className="text-sm mt-1">
            <span className="font-medium">State Name: </span>
            <Input
              value={company.state}
              onChange={(e) => onCompanyChange({ ...company, state: e.target.value })}
              className={`${inputClass} inline-block w-20`}
              placeholder="State"
              readOnly={!editable}
            />
            <span className="ml-2">Code: </span>
            <Input
              value={company.stateCode}
              onChange={(e) => onCompanyChange({ ...company, stateCode: e.target.value })}
              className={`${inputClass} inline-block w-16`}
              placeholder="Code"
              readOnly={!editable}
            />
          </div>
        </div>

        {/* Invoice Details - Right Columns */}
        <div className="col-span-2 grid grid-cols-2">
          <div className="border-r border-b border-border p-2">
            <div className="invoice-section-title"> No.</div>
            <CreatableSearchableSelect
              value={details.invoiceNo}
              options={invoiceNoOptions}
              placeholder="INV-0001"
              disabled={true}
              onChange={() => {
                // no-op: immutable invoiceNo for snapshot architecture
              }}
            />

          </div>

          <div className="border-b border-border p-2">
            <div className="invoice-section-title">Dated</div>
            <div className="invoice-value">{formatDate(details.date)}</div>
          </div>

          <div className="border-r border-b border-border p-2">
            <div className="invoice-section-title">Quotation No</div>
            <CreatableSearchableSelect
              value={details.quotationNo ?? ""}
              options={quotationNoOptions}
              placeholder="Quotation No"
              disabled={true}
              onChange={() => {
                // no-op: immutable quotationNo for snapshot architecture
              }}
            />

          </div>


         
          <div className="border-b border-border p-2">
            <div className="invoice-section-title">Mode/Terms of Payment</div>
            <Input
              value={details.modeOfPayment}
              onChange={(e) => onDetailsChange({ ...details, modeOfPayment: e.target.value })}
              className={inputClass}
              placeholder=""
              readOnly={!editable}
            />

          </div>

         
         
          <div className="border-b border-border p-2">
            <div className="invoice-section-title">Buyer Order Date</div>
            <Input
              value={details.buyerOrderDate}
              onChange={(e) => onDetailsChange({ ...details, buyerOrderDate: e.target.value })}
              className={inputClass}
              placeholder=""
              readOnly={!editable}
            />

          </div>

          

          

          <div className="col-span-2 p-2">
            <div className="invoice-section-title">Terms of Delivery</div>
            <Input
              value={details.termsOfDelivery}
              onChange={(e) => onDetailsChange({ ...details, termsOfDelivery: e.target.value })}
              className={inputClass}
              placeholder=""
              readOnly={!editable}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
