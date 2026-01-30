interface InvoiceFooterProps {
  companyName: string;
}

export const InvoiceFooter = ({ companyName }: InvoiceFooterProps) => {
  return (
    <div className="border-t border-border">
      {/* Signatures */}
      <div className="grid grid-cols-2 border-b border-border">
        <div className="p-4 border-r border-border">
          <div className="signature-box mb-2">
            <span>Signature</span>
          </div>
          <div className="text-center text-sm font-medium">Accountant's Signature</div>
        </div>
        <div className="p-4">
          <div className="text-right text-xs text-muted-foreground mb-2">
            for {companyName || "Company Name"}
          </div>
          <div className="signature-box mb-2">
            <span>Signature</span>
          </div>
          <div className="text-center text-sm font-medium">Authorized Signatory</div>
        </div>
      </div>

      {/* Footer Message */}
      <div className="bg-primary text-primary-foreground text-center py-3">
        <p className="text-sm font-medium">Thank You. Visit Again.</p>
      </div>

      {/* Computer Generated Note */}
      <div className="text-center py-2 text-xs text-muted-foreground">
        This is a Computer Generated Invoice
      </div>
    </div>
  );
};
