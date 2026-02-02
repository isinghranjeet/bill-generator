import { Company, Party, InvoiceDetails, InvoiceItem } from "@/types/invoice";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

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

export const ProfessionalInvoice = ({
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
  
  // Calculate totals
  const totals = items.reduce(
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

  const handleAddItem = () => {
    if (!onItemsChange) return;
    
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      srNo: items.length + 1,
      description: "",
      hsn: "",
      quantity: 1,
      unit: "Pcs",
      rate: 0,
      amount: 0,
      taxableValue: 0,
      gstPercent: 18,
      sgstRate: 9,
      sgstAmount: 0,
      cgstRate: 9,
      cgstAmount: 0,
      igstRate: 0,
      igstAmount: 0,
      total: 0,
    };
    
    onItemsChange([...items, newItem]);
  };

  const handleDeleteItem = (id: string) => {
    if (!onItemsChange) return;
    
    const newItems = items.filter(item => item.id !== id)
      .map((item, index) => ({ ...item, srNo: index + 1 }));
    
    onItemsChange(newItems);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    if (!onItemsChange) return;
    
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    // Recalculate
    const amount = item.rate * item.quantity;
    const taxableValue = amount;
    
    item.amount = parseFloat(amount.toFixed(2));
    item.taxableValue = parseFloat(taxableValue.toFixed(2));
    
    // Calculate GST (simplified - always SGST+CGST for this format)
    const gstRate = item.gstPercent || 18;
    item.sgstRate = gstRate / 2;
    item.cgstRate = gstRate / 2;
    item.sgstAmount = parseFloat((taxableValue * (item.sgstRate / 100)).toFixed(2));
    item.cgstAmount = parseFloat((taxableValue * (item.cgstRate / 100)).toFixed(2));
    
    item.total = parseFloat((taxableValue + item.sgstAmount + item.cgstAmount).toFixed(2));
    
    newItems[index] = item;
    onItemsChange(newItems);
  };

  return (
    <div className="bg-white p-6 print:p-0 w-[210mm] min-h-[297mm] mx-auto font-sans print:border-0 print:shadow-none print:overflow-visible">
      {/* Single Header with Logo */}
      <div className="border-b-2 border-black pb-4 mb-4">
        <div className="flex justify-between items-start">
          {/* Company Logo Section */}
          <div className="flex-1">
            <div className="flex items-start gap-3 mb-2">
              {/* Logo Image */}
              {company.logo && (
                <div className="logo-container">
                  <img 
                    src={company.logo} 
                    alt={`${company.name} Logo`}
                    className="h-16 w-auto object-contain"
                  />
                </div>
              )}
              
              {/* Company Text Details */}
              <div className="flex-1">
                <div className="company-name-section">
                  <h1 className="text-3xl font-black text-blue-900 tracking-wider mb-1">
                    {company.name || "RENT MY EVENT"}
                  </h1>
                  <div className="text-sm font-medium text-blue-600 uppercase tracking-widest mb-2">
                    Style Your Moment
                  </div>
                </div>
                
                <div className="text-xs text-gray-600 space-y-0.5">
                  <p className="font-medium">{company.address}</p>
                  <div className="grid grid-cols-2 gap-1">
                    <p><span className="font-semibold">GSTIN:</span> {company.gstin}</p>
                    <p><span className="font-semibold">State:</span> {company.state} ({company.stateCode})</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <p><span className="font-semibold">Mobile:</span> {company.mobile || "Not provided"}</p>
                    <p><span className="font-semibold">Email:</span> {company.email || "Not provided"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Invoice Details */}
          <div className="border-l pl-3 ml-3">
            <h2 className="text-xl font-bold text-center mb-3 text-blue-800">TAX INVOICE</h2>
            <div className="space-y-1">
              <div className="grid grid-cols-2 gap-1 items-center">
                <span className="font-semibold text-xs">Invoice No:</span>
                {editable && onDetailsChange ? (
                  <Input
                    value={details.invoiceNo}
                    onChange={(e) => onDetailsChange({...details, invoiceNo: e.target.value})}
                    className="h-6 text-xs w-full"
                  />
                ) : (
                  <span className="font-medium text-xs">{details.invoiceNo}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1 items-center">
                <span className="font-semibold text-xs">Date:</span>
                {editable && onDetailsChange ? (
                  <Input
                    type="date"
                    value={format(details.date, 'yyyy-MM-dd')}
                    onChange={(e) => onDetailsChange({...details, date: new Date(e.target.value)})}
                    className="h-6 text-xs w-full"
                  />
                ) : (
                  <span className="text-xs">{format(details.date, 'dd/MM/yyyy')}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1 items-center">
                <span className="font-semibold text-xs">Payment Terms:</span>
                {editable && onDetailsChange ? (
                  <Input
                    value={details.modeOfPayment}
                    onChange={(e) => onDetailsChange({...details, modeOfPayment: e.target.value})}
                    className="h-6 text-xs w-full"
                  />
                ) : (
                  <span className="text-xs">{details.modeOfPayment || "-"}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Buyer & Consignee Section */}
      <div className="mb-4 border-b border-gray-300 pb-3">
        <div className="grid grid-cols-2 gap-4">
          {/* Buyer Section */}
          <div>
            <h3 className="font-bold text-xs mb-1 text-blue-700">BILL TO</h3>
            <div className="border border-gray-300 p-2 rounded">
              {editable && onBuyerChange ? (
                <>
                  <div className="space-y-1 print:hidden">
                    <Input
                      value={buyer.name}
                      onChange={(e) => onBuyerChange({...buyer, name: e.target.value})}
                      placeholder="Buyer Name"
                      className="h-6 text-xs w-full"
                    />
                    <Textarea
                      value={buyer.address}
                      onChange={(e) => onBuyerChange({...buyer, address: e.target.value})}
                      placeholder="Address"
                      className="h-14 text-xs w-full"
                      rows={2}
                    />
                    <div className="grid grid-cols-2 gap-1">
                      <Input
                        value={buyer.gstin}
                        onChange={(e) => onBuyerChange({...buyer, gstin: e.target.value})}
                        placeholder="GSTIN"
                        className="h-6 text-xs"
                      />
                      <Input
                        value={buyer.state}
                        onChange={(e) => onBuyerChange({...buyer, state: e.target.value})}
                        placeholder="State"
                        className="h-6 text-xs"
                      />
                    </div>
                  </div>
                  <div className="hidden print:block text-xs space-y-0.5">
                    <p className="font-semibold">{buyer.name || "Not provided"}</p>
                    <p className="whitespace-pre-wrap text-gray-700">{buyer.address || "Not provided"}</p>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      <p><span className="font-medium">GSTIN:</span> {buyer.gstin || "-"}</p>
                      <p><span className="font-medium">State:</span> {buyer.state || "-"}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold">{buyer.name || "Not provided"}</p>
                  <p className="whitespace-pre-wrap text-gray-700">{buyer.address || "Not provided"}</p>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    <p><span className="font-medium">GSTIN:</span> {buyer.gstin || "-"}</p>
                    <p><span className="font-medium">State:</span> {buyer.state || "-"}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Consignee Section */}
          <div>
            <h3 className="font-bold text-xs mb-1 text-blue-700">SHIP TO</h3>
            <div className="border border-gray-300 p-2 rounded">
              {editable && onConsigneeChange ? (
                <>
                  <div className="space-y-1 print:hidden">
                    <Input
                      value={consignee.name}
                      onChange={(e) => onConsigneeChange({...consignee, name: e.target.value})}
                      placeholder="Consignee Name"
                      className="h-6 text-xs w-full"
                    />
                    <Textarea
                      value={consignee.address}
                      onChange={(e) => onConsigneeChange({...consignee, address: e.target.value})}
                      placeholder="Address"
                      className="h-14 text-xs w-full"
                      rows={2}
                    />
                    <div className="grid grid-cols-2 gap-1">
                      <Input
                        value={consignee.gstin}
                        onChange={(e) => onConsigneeChange({...consignee, gstin: e.target.value})}
                        placeholder="GSTIN"
                        className="h-6 text-xs"
                      />
                      <Input
                        value={consignee.state}
                        onChange={(e) => onConsigneeChange({...consignee, state: e.target.value})}
                        placeholder="State"
                        className="h-6 text-xs"
                      />
                    </div>
                  </div>
                  <div className="hidden print:block text-xs space-y-0.5">
                    <p className="font-semibold">{consignee.name || "Not provided"}</p>
                    <p className="whitespace-pre-wrap text-gray-700">{consignee.address || "Not provided"}</p>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      <p><span className="font-medium">GSTIN:</span> {consignee.gstin || "-"}</p>
                      <p><span className="font-medium">State:</span> {consignee.state || "-"}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold">{consignee.name || "Not provided"}</p>
                  <p className="whitespace-pre-wrap text-gray-700">{consignee.address || "Not provided"}</p>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    <p><span className="font-medium">GSTIN:</span> {consignee.gstin || "-"}</p>
                    <p><span className="font-medium">State:</span> {consignee.state || "-"}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-blue-50">
                <th className="border border-gray-400 p-1 text-center">Sr.</th>
                <th className="border border-gray-400 p-1 text-left">Description</th>
                <th className="border border-gray-400 p-1 text-center">HSN</th>
                <th className="border border-gray-400 p-1 text-center">Rate (₹)</th>
                <th className="border border-gray-400 p-1 text-center">Qty</th>
                <th className="border border-gray-400 p-1 text-center">Taxable Value (₹)</th>
                <th className="border border-gray-400 p-1 text-center">GST%</th>
                <th className="border border-gray-400 p-1 text-center font-bold">Amount (₹)</th>
                {editable && (
                  <th className="border border-gray-400 p-1 text-center print:hidden">Action</th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td className="border border-gray-300 p-1 text-center">{item.srNo}</td>
                  <td className="border border-gray-300 p-1">
                    {editable ? (
                      <>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="h-5 text-xs w-full print:hidden"
                          placeholder="Item description"
                        />
                        <span className="hidden print:inline text-xs">
                          {item.description || "-"}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs">{item.description || "-"}</span>
                    )}
                  </td>
                  <td className="border border-gray-300 p-1">
                    {editable ? (
                      <>
                        <Input
                          value={item.hsn}
                          onChange={(e) => updateItem(index, 'hsn', e.target.value)}
                          className="h-5 text-xs text-center w-full print:hidden"
                          placeholder="HSN Code"
                        />
                        <span className="hidden print:inline block text-center text-xs">
                          {item.hsn || "-"}
                        </span>
                      </>
                    ) : (
                      <span className="block text-center text-xs">{item.hsn || "-"}</span>
                    )}
                  </td>
                  <td className="border border-gray-300 p-1">
                    {editable ? (
                      <>
                        <Input
                          type="number"
                          min="0"
                          step="01"
                          value={item.rate}
                          onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                          className="h-5 text-xs text-right w-full print:hidden"
                          placeholder="0.00"
                        />
                        <span className="hidden print:inline block text-right text-xs font-medium">
                          {item.rate.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="block text-right text-xs font-medium">
                        {item.rate.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="border border-gray-300 p-1">
                    {editable ? (
                      <>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="h-5 text-xs text-center w-full print:hidden"
                          placeholder="1"
                        />
                        <span className="hidden print:inline block text-center text-xs font-medium">
                          {item.quantity}
                        </span>
                      </>
                    ) : (
                      <span className="block text-center text-xs font-medium">{item.quantity}</span>
                    )}
                  </td>
                  <td className="border border-gray-300 p-1 text-right">
                    <span className="text-xs font-semibold">
                      {item.taxableValue.toFixed(2)}
                    </span>
                  </td>
                  <td className="border border-gray-300 p-1">
                    {editable ? (
                      <>
                        <Input
                          type="number"
                          min="0"
                          max="28"
                          step="01"
                          value={item.gstPercent || 18}
                          onChange={(e) => updateItem(index, 'gstPercent', parseFloat(e.target.value) || 0)}
                          className="h-5 text-xs text-center w-full print:hidden"
                          placeholder="18"
                        />
                        <span className="hidden print:inline block text-center text-xs font-medium">
                          {item.gstPercent || 18}%
                        </span>
                      </>
                    ) : (
                      <span className="block text-center text-xs font-medium">{item.gstPercent || 18}%</span>
                    )}
                  </td>
                  <td className="border border-gray-300 p-1 text-right">
                    <span className="text-xs font-bold text-blue-700">
                      {item.total.toFixed(2)}
                    </span>
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
              ))}
              
              {/* Totals Row */}
              <tr className="bg-gray-50 font-bold">
                <td colSpan={5} className="border border-gray-300 p-1 text-right pr-2">
                  <span className="text-xs">Total:</span>
                </td>
                <td className="border border-gray-300 p-1 text-right">
                  <span className="text-xs text-blue-700">
                    {totals.taxableValue.toFixed(2)}
                  </span>
                </td>
                <td className="border border-gray-300 p-1"></td>
                <td className="border border-gray-300 p-1 text-right">
                  <span className="text-xs text-green-700 font-bold">
                    {totals.total.toFixed(2)}
                  </span>
                </td>
                {editable && <td className="border border-gray-300 p-1 print:hidden"></td>}
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Add Item Button */}
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

      {/* Bottom Section */}
      <div className="mb-3">
        <div className="grid grid-cols-2 gap-4">
          {/* Left: Bank Details */}
          <div>
            <h4 className="font-bold text-xs mb-1 text-blue-700">BANK DETAILS</h4>
            <div className="border border-gray-300 p-2 rounded bg-gray-50">
              {editable && onCompanyChange ? (
                <>
                  <div className="space-y-2 print:hidden">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-medium">Bank Name</Label>
                        <Input
                          value={company.bankName || ""}
                          onChange={(e) => onCompanyChange({...company, bankName: e.target.value})}
                          className="h-6 text-xs w-full"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium">Account No.</Label>
                        <Input
                          value={company.accountNo || ""}
                          onChange={(e) => onCompanyChange({...company, accountNo: e.target.value})}
                          className="h-6 text-xs w-full"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-medium">IFSC Code</Label>
                        <Input
                          value={company.ifscCode || ""}
                          onChange={(e) => onCompanyChange({...company, ifscCode: e.target.value})}
                          className="h-6 text-xs w-full"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium">Account Holder</Label>
                        <Input
                          value={company.accountHolderName || ""}
                          onChange={(e) => onCompanyChange({...company, accountHolderName: e.target.value})}
                          className="h-6 text-xs w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Branch Address</Label>
                      <Input
                        value={company.branchAddress || ""}
                        onChange={(e) => onCompanyChange({...company, branchAddress: e.target.value})}
                        className="h-6 text-xs w-full"
                      />
                    </div>
                  </div>
                  <div className="hidden print:block text-xs space-y-0.5">
                    <p><span className="font-semibold">Bank:</span> {company.bankName || "-"}</p>
                    <p><span className="font-semibold">A/c No.:</span> {company.accountNo || "-"}</p>
                    <p><span className="font-semibold">IFSC Code:</span> {company.ifscCode || "-"}</p>
                    <p><span className="font-semibold">Branch:</span> {company.branchAddress || "-"}</p>
                    <p><span className="font-semibold">Account Holder:</span> {company.accountHolderName || "-"}</p>
                  </div>
                </>
              ) : (
                <div className="text-xs space-y-0.5">
                  <p><span className="font-semibold">Bank:</span> {company.bankName || "-"}</p>
                  <p><span className="font-semibold">A/c No.:</span> {company.accountNo || "-"}</p>
                  <p><span className="font-semibold">IFSC Code:</span> {company.ifscCode || "-"}</p>
                  <p><span className="font-semibold">Branch:</span> {company.branchAddress || "-"}</p>
                  <p><span className="font-semibold">Account Holder:</span> {company.accountHolderName || "-"}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Amount Summary */}
          <div>
            <h4 className="font-bold text-xs mb-1 text-blue-700">AMOUNT SUMMARY</h4>
            <div className="border border-gray-300 rounded overflow-hidden mb-3">
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-semibold">Taxable Value:</td>
                    <td className="p-2 text-right font-bold">
                      ₹{totals.taxableValue.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">GST ({items[0]?.gstPercent || 18}%):</td>
                    <td className="p-2 text-right font-bold">
                      ₹{totals.gstAmount.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="border-t-2 border-gray-400 bg-blue-50">
                    <td className="p-2 font-bold text-base">GRAND TOTAL:</td>
                    <td className="p-2 text-right font-bold text-base text-green-700">
                      ₹{totals.total.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Amount in Words */}
            <div>
              <p className="font-semibold text-xs mb-1 text-blue-700">AMOUNT IN WORDS</p>
              <div className="border border-gray-300 p-2 rounded bg-gray-50 min-h-[50px] text-xs italic">
                {convertToWords(totals.total)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Remarks */}
      <div className="mb-4">
        <div>
          <p className="font-semibold text-xs mb-1 text-blue-700">REMARKS</p>
          {editable && onRemarksChange ? (
            <>
              <Textarea
                value={remarks}
                onChange={(e) => onRemarksChange(e.target.value)}
                className="h-16 text-xs print:hidden w-full"
                placeholder="Enter any remarks or terms here..."
                rows={2}
              />
              <div className="hidden print:block border border-gray-300 p-2 rounded bg-gray-50 min-h-[50px] text-xs">
                {remarks || "No remarks"}
              </div>
            </>
          ) : (
            <div className="border border-gray-300 p-2 rounded bg-gray-50 min-h-[50px] text-xs">
              {remarks || "No remarks"}
            </div>
          )}
        </div>
      </div>

      {/* Signatures */}
      <div className="pt-3 border-t-2 border-black">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-bold text-xs mb-6">For {company.name}</p>
            <div className="text-center mt-10">
              <div className="border-t border-black w-40 mx-auto pt-1">
                <p className="text-xs font-semibold">Authorized Signatory</p>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <p className="font-bold text-xs mb-6">Receiver's Signature</p>
            <div className="text-center mt-10">
              <div className="border-t border-black w-40 ml-auto pt-1">
                <p className="text-xs font-semibold">Seal & Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convertBelow1000(n % 100) : '');
  }
  
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = Math.floor(num % 1000);
  
  let result = '';
  
  if (crore > 0) {
    result += convertBelow1000(crore) + ' Crore ';
  }
  if (lakh > 0) {
    result += convertBelow1000(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertBelow1000(thousand) + ' Thousand ';
  }
  if (remainder > 0) {
    result += convertBelow1000(remainder);
  }
  
  return (result.trim() + ' Rupees Only').replace(/\s+/g, ' ');
}