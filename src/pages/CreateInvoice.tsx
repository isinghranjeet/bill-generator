import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { InvoiceData } from "@/types/invoice";
import { generateInvoiceNumber, calculateItemTotals, calculateInvoiceSummary } from "@/utils/calculations";
import { useInvoiceStorage } from "@/hooks/useInvoiceStorage";
import { ProfessionalInvoice } from "@/components/invoice/ProfessionalInvoice";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download, Save, RotateCcw, Eye, Edit } from "lucide-react";
import { toast } from "sonner";

const defaultInvoiceData: InvoiceData = {
  company: {
    name: "Rent My EVENT",
    address: "A123 Main Road Mandawali Fazelfur Near New Delhi, 110092",
    gstin: "07KRDPD7397PIZT",
    state: "Delhi",
    stateCode: "07",
    bankName: "State Bank of India",
    accountNo: "123456789012",
    ifscCode: "SBIN0001234",
    branchAddress: "Mandawali Branch, New Delhi",
    accountHolderName: "Rent My EVENT",
    mobile: "+91 9876543210",
    email: "info@rentmyevent.com",
  },
  consignee: {
    name: "",
    address: "",
    gstin: "",
    state: "",
    placeOfSupply: "",
  },
  buyer: {
    name: "",
    address: "",
    gstin: "",
    state: "",
    placeOfSupply: "",
  },
  details: {
    invoiceNo: generateInvoiceNumber(),
    date: new Date(),
    deliveryNote: "",
    modeOfPayment: "Net 30 Days",
    supplierRef: "",
    otherReferences: "",
    buyerOrderNo: "",
    buyerOrderDate: "",
    despatchDocNo: "",
    deliveryNoteDate: "",
    despatchThrough: "",
    destination: "",
    termsOfDelivery: "",
  },
  items: [
    {
      id: crypto.randomUUID(),
      srNo: 1,
      description: "Event Equipment Rental",
      hsn: "9966",
      quantity: 1,
      unit: "Pcs",
      rate: 1000,
      amount: 1000,
      discount: 0,
      taxableValue: 1000,
      sgstRate: 9,
      sgstAmount: 90,
      cgstRate: 9,
      cgstAmount: 90,
      igstRate: 0,
      igstAmount: 0,
      total: 1180,
    },
  ],
  remarks: "",
  totalAmount: 1180,
  totalTax: 180,
  totalAmountInWords: "One Thousand One Hundred and Eighty Rupees Only",
};

const CreateInvoice = () => {
  const navigate = useNavigate();
  const { saveInvoice } = useInvoiceStorage();
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(defaultInvoiceData);
  const [editable, setEditable] = useState(true);

  // Calculate summary whenever items change
  const calculatedItems = invoiceData.items.map(calculateItemTotals);
  const summary = calculateInvoiceSummary(calculatedItems);

  const handlePrint = () => {
    // Force all content to be visible before printing
    document.body.classList.add('printing');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing');
    }, 100);
  };

  const handleReset = () => {
    setInvoiceData({
      ...defaultInvoiceData,
      details: {
        ...defaultInvoiceData.details,
        invoiceNo: generateInvoiceNumber(),
        date: new Date(),
      },
      items: [
        {
          id: crypto.randomUUID(),
          srNo: 1,
          description: "Event Equipment Rental",
          hsn: "9966",
          quantity: 1,
          unit: "Pcs",
          rate: 1000,
          amount: 1000,
          discount: 0,
          taxableValue: 1000,
          sgstRate: 9,
          sgstAmount: 90,
          cgstRate: 9,
          cgstAmount: 90,
          igstRate: 0,
          igstAmount: 0,
          total: 1180,
        },
      ],
    });
    setEditable(true);
    toast.success("Invoice reset successfully!");
  };

  const handleSave = () => {
    // Validate required fields
    if (!invoiceData.buyer.name.trim()) {
      toast.error("Please enter buyer name");
      return;
    }
    
    if (invoiceData.items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }
    
    if (!invoiceData.items.some(item => item.description.trim())) {
      toast.error("Please add description for at least one item");
      return;
    }
    
    if (!invoiceData.items.some(item => item.rate > 0)) {
      toast.error("Please enter rate for at least one item");
      return;
    }

    // Calculate totals
    const totals = invoiceData.items.reduce(
      (acc, item) => ({
        totalAmount: acc.totalAmount + (item.rate * item.quantity),
        totalTax: acc.totalTax + ((item.rate * item.quantity) * (item.sgstRate + item.cgstRate + item.igstRate) / 100),
      }),
      { totalAmount: 0, totalTax: 0 }
    );

    const invoiceToSave = {
      ...invoiceData,
      totalAmount: parseFloat(totals.totalAmount.toFixed(2)),
      totalTax: parseFloat(totals.totalTax.toFixed(2)),
      totalAmountInWords: convertToWords(totals.totalAmount),
    };

    saveInvoice(invoiceToSave, totals.totalAmount);
    toast.success("Invoice saved successfully!");
    setEditable(false);
  };

  const handleSaveAndNew = () => {
    handleSave();
    setTimeout(() => {
      handleReset();
    }, 500);
  };

  const generatePDF = () => {
    toast.info("PDF generation in progress...");
    handlePrint();
  };

  // Helper function for number to words
  const convertToWords = (num: number): string => {
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
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:py-0 print:px-0 print:bg-white">
      <div className="max-w-[210mm] mx-auto print:max-w-none print:my-0">
        {/* Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden bg-white p-4 rounded-lg shadow-sm border">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button variant="outline" onClick={() => setEditable(!editable)}>
              {editable ? (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" onClick={handleSaveAndNew}>
              <Save className="h-4 w-4 mr-2" />
              Save & New
            </Button>
            <Button variant="outline" onClick={generatePDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Invoice Template */}
        <div className="bg-white shadow-lg print:shadow-none print:border-none">
          <ProfessionalInvoice
            company={invoiceData.company}
            consignee={invoiceData.consignee}
            buyer={invoiceData.buyer}
            details={invoiceData.details}
            items={invoiceData.items}
            remarks={invoiceData.remarks}
            editable={editable}
            onCompanyChange={(company) => setInvoiceData({ ...invoiceData, company })}
            onConsigneeChange={(consignee) => setInvoiceData({ ...invoiceData, consignee })}
            onBuyerChange={(buyer) => setInvoiceData({ ...invoiceData, buyer })}
            onDetailsChange={(details) => setInvoiceData({ ...invoiceData, details })}
            onItemsChange={(items) => setInvoiceData({ ...invoiceData, items })}
            onRemarksChange={(remarks) => setInvoiceData({ ...invoiceData, remarks })}
          />
        </div>

        {/* Help Tips */}
        <div className="text-center mt-6 text-sm text-gray-500 print:hidden">
          <p className="mb-1">💡 Fill in all details, then click <strong>Save</strong> to store the invoice.</p>
          <p>Use <strong>Preview</strong> to see how the invoice will look, then <strong>Print</strong> or <strong>PDF</strong> to generate the final bill.</p>
          <p className="text-xs text-gray-400 mt-2">
            Note: For best print results, use Chrome or Edge browser. Ensure "Background graphics" is enabled in print settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;