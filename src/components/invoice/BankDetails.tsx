import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Company } from "@/types/invoice";

interface BankDetailsProps {
  company: Company;
  onCompanyChange: (company: Company) => void;
  editable: boolean;
}

export const BankDetails = ({ company, onCompanyChange, editable }: BankDetailsProps) => {
  const handleChange = (field: keyof Company, value: string) => {
    onCompanyChange({
      ...company,
      [field]: value,
    });
  };

  return (
    <div className="border border-border p-4 bg-muted/30">
      <h3 className="font-semibold mb-3 text-center">Company's Bank Details</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="bankName">Bank Name</Label>
          {editable ? (
            <Input
              id="bankName"
              value={company.bankName || ""}
              onChange={(e) => handleChange("bankName", e.target.value)}
              placeholder="e.g., State Bank of India"
            />
          ) : (
            <div className="text-sm p-2 bg-background min-h-9">
              {company.bankName || "Not provided"}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="accountNo">Account Number</Label>
          {editable ? (
            <Input
              id="accountNo"
              value={company.accountNo || ""}
              onChange={(e) => handleChange("accountNo", e.target.value)}
              placeholder="e.g., 123456789012"
            />
          ) : (
            <div className="text-sm p-2 bg-background min-h-9">
              {company.accountNo || "Not provided"}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ifscCode">IFSC Code</Label>
          {editable ? (
            <Input
              id="ifscCode"
              value={company.ifscCode || ""}
              onChange={(e) => handleChange("ifscCode", e.target.value)}
              placeholder="e.g., SBIN0001234"
            />
          ) : (
            <div className="text-sm p-2 bg-background min-h-9">
              {company.ifscCode || "Not provided"}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="accountHolderName">Account Holder Name</Label>
          {editable ? (
            <Input
              id="accountHolderName"
              value={company.accountHolderName || ""}
              onChange={(e) => handleChange("accountHolderName", e.target.value)}
              placeholder="e.g., Rent My EVENT"
            />
          ) : (
            <div className="text-sm p-2 bg-background min-h-9">
              {company.accountHolderName || "Not provided"}
            </div>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="branchAddress">Branch Address</Label>
          {editable ? (
            <Input
              id="branchAddress"
              value={company.branchAddress || ""}
              onChange={(e) => handleChange("branchAddress", e.target.value)}
              placeholder="e.g., Main Branch, Delhi"
            />
          ) : (
            <div className="text-sm p-2 bg-background min-h-9">
              {company.branchAddress || "Not provided"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};