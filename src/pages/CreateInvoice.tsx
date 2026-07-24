import React, { useEffect, useMemo, useRef, useState } from "react";

import { useNavigate, useSearchParams } from "react-router-dom";
import { InvoiceData, InvoiceDetails, Company, Party, InvoiceItem } from "@/types/invoice";

import { useInvoiceStorage } from "@/hooks/useInvoiceStorage";
import { putInvoice } from "@/lib/invoiceCache";

import { ProfessionalInvoice } from "@/components/invoice/ProfessionalInvoice";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download, Save, RotateCcw, Eye, Edit, Upload } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { fetchSettings, consumeNextNumber } from "@/lib/settingsApi";

const DEFAULT_COMPANY: Company = {
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
  mobile: "+91 9625340107",
  email: "Rentmyevents@gmail.com",
  logo: "/logo.jpeg",
};

const DEFAULT_PARTY: Party = {
  name: "",
  address: "",
  gstin: "",
  state: "",
  placeOfSupply: "",
};

const DEFAULT_DETAILS: InvoiceDetails = {
  invoiceTitle: "TAX INVOICE",
  invoiceNo: "",
  quotationNo: "",
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
};

const DEFAULT_ITEMS: InvoiceItem[] = [
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
    gstPercent: undefined,
    sgstRate: 9,
    sgstAmount: 90,
    cgstRate: 9,
    cgstAmount: 90,
    igstRate: 0,
    igstAmount: 0,
    total: 1180,
  },
];

const defaultInvoiceData: InvoiceData = {
  company: DEFAULT_COMPANY,
  consignee: DEFAULT_PARTY,
  buyer: DEFAULT_PARTY,
  details: DEFAULT_DETAILS,
  items: DEFAULT_ITEMS,
  remarks: "",
  totalAmount: 1180,
  totalTax: 180,
  discount: { type: "percentage", value: 0 },
  totalAmountInWords: "One Thousand One Hundred and Eighty Rupees Only",
};

function convertToWords(num: number): string {
  if (num === 0) return "Zero Rupees Only";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  function convertBelow1000(n: number): string {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100)
      return (
        tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "")
      );
    return (
      ones[Math.floor(n / 100)] +
      " Hundred" +
      (n % 100 !== 0 ? " and " + convertBelow1000(n % 100) : "")
    );
  }

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = Math.floor(num % 1000);

  let result = "";
  if (crore > 0) result += convertBelow1000(crore) + " Crore ";
  if (lakh > 0) result += convertBelow1000(lakh) + " Lakh ";
  if (thousand > 0) result += convertBelow1000(thousand) + " Thousand ";
  if (remainder > 0) result += convertBelow1000(remainder);

  return (result.trim() + " Rupees Only").replace(/\s+/g, " ");
}

const CreateInvoice = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const documentTypeParam = useMemo(
    () => (searchParams.get("type") || "invoice").toLowerCase(),
    [searchParams]
  );
  const documentType: "invoice" | "quotation" =
    documentTypeParam === "quotation" ? "quotation" : "invoice";

  const { saveInvoice } = useInvoiceStorage();

  const [invoiceData, setInvoiceData] = useState<InvoiceData>(defaultInvoiceData);
  const [editable, setEditable] = useState(true);

  // Prevent double-consume on strict-mode remounts
  const consumedRef = useRef(false);

  // ---------------------------
  // Load settings -> apply to NEW docs only
  // ---------------------------
  useEffect(() => {
    let cancelled = false;

    const applySettings = async () => {
      try {
        const resp = await fetchSettings();
        const s = (resp?.settings ?? {}) as Record<string, unknown>;


        const logoFromSettings = s.logo;

        const patchedCompany: Company = {
          ...DEFAULT_COMPANY,
          name: s.companyName?.trim() ? s.companyName : DEFAULT_COMPANY.name,
          address: s.address?.trim() ? s.address : DEFAULT_COMPANY.address,
          gstin: s.gstNumber?.trim() ? s.gstNumber : DEFAULT_COMPANY.gstin,
          state: s.state?.trim ? s.state : DEFAULT_COMPANY.state,
          stateCode: (s.stateCode ?? DEFAULT_COMPANY.stateCode) as string,
          mobile: s.phone?.trim() ? s.phone : DEFAULT_COMPANY.mobile,
          email: s.email?.trim() ? s.email : DEFAULT_COMPANY.email,

          logo: logoFromSettings?.trim ? logoFromSettings : DEFAULT_COMPANY.logo,

          // Bank defaults: keep hardcoded defaults if settings have none
          bankName:
            s.bankDetails?.bankName?.trim() ? s.bankDetails.bankName : DEFAULT_COMPANY.bankName,
          accountNo:
            s.bankDetails?.accountNumber?.trim()
              ? String(s.bankDetails.accountNumber)
              : DEFAULT_COMPANY.accountNo,
          ifscCode:
            s.bankDetails?.ifscCode?.trim() ? s.bankDetails.ifscCode : DEFAULT_COMPANY.ifscCode,
          branchAddress:
            s.bankDetails?.branch?.trim()
              ? s.bankDetails.branch
              : DEFAULT_COMPANY.branchAddress,
          accountHolderName:
            s.bankDetails?.accountName?.trim()
              ? s.bankDetails.accountName
              : DEFAULT_COMPANY.accountHolderName,
        };

        // Default remarks
        const defaultRemark = Array.isArray(s.remarks) && s.remarks.length > 0 ? s.remarks[0] : "";

        if (cancelled) return;

        setInvoiceData((prev) => {
          // NEW docs only: only patch defaults if invoice has no allocated number yet
          const hasAllocatedNumber =
            prev.details.invoiceNo?.trim() || prev.details.quotationNo?.trim();
          if (hasAllocatedNumber) return prev;

          return {
            ...prev,
            company: patchedCompany,
            remarks: defaultRemark || prev.remarks,
          };
        });
    } catch (e) {
        // Settings failures should not block creation
        console.error("Failed to fetch settings", e);
      }

    };

    applySettings();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------
  // Document title + numbering consume on first NEW allocation
  // ---------------------------
  useEffect(() => {
    setInvoiceData((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        invoiceTitle: documentType === "quotation" ? "QUOTATION" : "TAX INVOICE",
      },
    }));
  }, [documentType]);

  useEffect(() => {
    const ensureNumber = async () => {
      // Do not overwrite existing numbers (edit/restore)
      if (consumedRef.current) return;

      const alreadyHasNumber =
        documentType === "invoice"
          ? !!invoiceData.details.invoiceNo?.trim()
          : !!invoiceData.details.quotationNo?.trim();

      if (alreadyHasNumber) {
        consumedRef.current = true;
        return;
      }

      consumedRef.current = true;

      try {
        // ----- NORMALIZE documentType before API call -----
        const docTypeRaw = documentType?.toLowerCase().trim() ?? "";
        const normalizedDocType = docTypeRaw === "quotation" ? "quotation" : "invoice";
        console.log("[CreateInvoice] original documentType:", documentType);
        console.log("[CreateInvoice] normalized documentType:", normalizedDocType);

        const resp = await consumeNextNumber(normalizedDocType);

        const allocated =
          documentType === "invoice" ? resp?.invoiceNo : resp?.quotationNo;

        if (!allocated || typeof allocated !== "string") {
          toast.error("Failed to allocate document number. Please try again.");
          return;
        }

        setInvoiceData((prev) => {
          // Double-check: do not overwrite
          const hasExisting =
            documentType === "invoice"
              ? !!prev.details.invoiceNo?.trim()
              : !!prev.details.quotationNo?.trim();
          if (hasExisting) return prev;

          return {
            ...prev,
            details: {
              ...prev.details,
              invoiceNo: documentType === "invoice" ? allocated : prev.details.invoiceNo,
              quotationNo:
                documentType === "quotation" ? allocated : prev.details.quotationNo,
            },
          };
        });
      } catch (e) {
        toast.error("Failed to allocate document number.");
        // Keep previous value if any; do not blank.
        setInvoiceData((prev) => prev);
      }

    };

    // Only on NEW docs (no allocated number yet)
    if (invoiceData.details.invoiceNo?.trim() || invoiceData.details.quotationNo?.trim()) {
      return;
    }

    ensureNumber();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentType]);

  const handlePrint = () => {
    toast.dismiss();
    document.body.classList.add("printing");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing");
    }, 100);
  };

  const handleReset = () => {
    setInvoiceData((prev) => {
      // Preserve allocated numbers; do not consume new.
      return {
        ...defaultInvoiceData,
        details: {
          ...defaultInvoiceData.details,
          invoiceNo: prev.details.invoiceNo,
          quotationNo: prev.details.quotationNo,
          date: new Date(),
          invoiceTitle: documentType === "quotation" ? "QUOTATION" : "TAX INVOICE",
        },
        // Keep a fresh item row (existing UI behavior)
        items: [
          {
            ...DEFAULT_ITEMS[0],
            id: crypto.randomUUID(),
          },
        ],
      };
    });
    setEditable(true);
    toast.success("Invoice reset successfully!");
  };

  const handleSave = async () => {
    if (!invoiceData.buyer.name.trim()) {
      toast.error("Please enter buyer name");
      return;
    }

    if (invoiceData.items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    if (!invoiceData.items.some((item) => item.description.trim())) {
      toast.error("Please add description for at least one item");
      return;
    }

    if (!invoiceData.items.some((item) => item.rate > 0)) {
      toast.error("Please enter rate for at least one item");
      return;
    }

    // Do not mutate allocated numbers
    if (documentType === "invoice" && !invoiceData.details.invoiceNo?.trim()) {
      toast.error("Invoice number is missing.");
      return;
    }
    if (documentType === "quotation" && !invoiceData.details.quotationNo?.trim()) {
      toast.error("Quotation number is missing.");
      return;
    }

    // Use per-item totals already computed by ProfessionalInvoice (includes days, discount, correct GST)
    const totalAmount = parseFloat(
      invoiceData.items.reduce((sum, item) => sum + (item.total || 0), 0).toFixed(2)
    );
    const totalTax = parseFloat(
      invoiceData.items.reduce(
        (sum, item) => sum + (item.sgstAmount || 0) + (item.cgstAmount || 0) + (item.igstAmount || 0),
        0
      ).toFixed(2)
    );

    const invoiceToSave = {
      ...invoiceData,
      totalAmount,
      totalTax,
      totalAmountInWords: convertToWords(totalAmount),
    };

    try {
      await saveInvoice(invoiceToSave);
      putInvoice(invoiceToSave);
      toast.success("Invoice saved successfully!");
      setEditable(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save invoice");
    }

  };

  const handleSaveAndNew = () => {
    handleSave();
    setTimeout(() => {
      handleReset();
    }, 500);
  };

  const generatePDF = () => {
    toast.dismiss();
    handlePrint();
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.match("image.*")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size should be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const logoUrl = e.target?.result as string;
      setInvoiceData((prev) => ({
        ...prev,
        company: {
          ...prev.company,
          logo: logoUrl,
        },
      }));
      toast.success("Logo uploaded successfully!");
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setInvoiceData((prev) => ({
      ...prev,
      company: {
        ...prev.company,
        logo: "",
      },
    }));
    toast.success("Logo removed!");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:py-0 print:px-0 print:bg-white">
      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              background-color: white !important;
            }
            .print-area {
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }
            .invoice-logo {
              max-height: 80px !important;
              width: auto !important;
            }
          }
        `}
      </style>

      <div className="max-w-[210mm] mx-auto print:max-w-none print:my-0">
        {/* Toolbar */}
        <div className="mb-6 no-print flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>

          {/* Logo Upload Section */}
          <div className="flex items-center gap-4">
            <div className="logo-upload-section">
              <Label htmlFor="logo-upload" className="text-sm font-medium cursor-pointer">
                <Upload className="h-4 w-4 inline mr-2" />
                Upload Logo
              </Label>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              {invoiceData.company.logo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeLogo}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  Remove Logo
                </Button>
              )}
            </div>
          </div>

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
        <div className="print-area bg-white shadow-lg print:shadow-none print:border-none">
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
        <div className="no-print text-center mt-6 text-sm text-gray-500">
          <p className="mb-1">
            💡 Fill in all details, then click <strong>Save</strong> to store the invoice.
          </p>
          <p>Upload your company logo using the "Upload Logo" button above.</p>
          <p>
            Use <strong>Preview</strong> to see how the invoice will look, then <strong>Print</strong> or{' '}
            <strong>PDF</strong> to generate the final bill.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Note: For best print results, use Chrome or Edge browser. Ensure "Background graphics" is enabled in print settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;

