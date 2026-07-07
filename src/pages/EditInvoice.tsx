import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  ArrowLeft,
  Download,
  Edit,
  Eye,
  Printer,
  RotateCcw,
  Save,
  Upload,
} from "lucide-react";

import type { InvoiceData, InvoiceItem } from "@/types/invoice";

import { generateInvoiceNumber } from "@/utils/calculations";
import { useInvoiceStorage } from "@/hooks/useInvoiceStorage";
import { putInvoice } from "@/lib/invoiceCache";


import { ProfessionalInvoice } from "@/components/invoice/ProfessionalInvoice";
import { getInvoice as getInvoiceApi } from "@/lib/invoiceApi";

const createBlankInvoiceData = (): InvoiceData => ({
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
    mobile: "+91 9625340107",
    email: "Rentmyevents@gmail.com",
    logo: "/logo.jpeg",
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
    invoiceTitle: "TAX INVOICE",
    invoiceNo: generateInvoiceNumber(),
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
});

function computeTotalsFromItems(items: InvoiceItem[]) {
  const totals = items.reduce(
    (acc, item) => {
      const amount = (item.rate ?? 0) * (item.quantity ?? 0) - (item.discount ?? 0);
      const taxableValue = amount;

      const gst = (item.sgstAmount ?? 0) + (item.cgstAmount ?? 0) + (item.igstAmount ?? 0);
      const total = taxableValue + gst;

      acc.totalAmount += taxableValue;
      acc.totalTax += gst;
      acc.total += total;
      return acc;
    },
    { totalAmount: 0, totalTax: 0, total: 0 }
  );

  return {
    totalAmount: parseFloat(totals.totalAmount.toFixed(2)),
    totalTax: parseFloat(totals.totalTax.toFixed(2)),
    grandTotal: parseFloat(totals.total.toFixed(2)),
  };
}

function convertToWords(num: number): string {
  if (num === 0) return "Zero Rupees Only";

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
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
    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
    }
    return (
      ones[Math.floor(n / 100)] + " Hundred" +
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

export default function EditInvoice() {
  const navigate = useNavigate();
  const { invoiceNo } = useParams<{ invoiceNo: string }>();
  const { saveInvoice } = useInvoiceStorage();

  const [invoiceData, setInvoiceData] = useState<InvoiceData>(() => createBlankInvoiceData());
  const [editable, setEditable] = useState(true);
  const [loading, setLoading] = useState(true);

  const invoiceNoDecoded = useMemo(() => {
    if (!invoiceNo) return "";
    return decodeURIComponent(invoiceNo);
  }, [invoiceNo]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!invoiceNoDecoded) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        if (mounted) setLoading(true);

        const res = await getInvoiceApi(invoiceNoDecoded);
        const data = res as unknown as InvoiceData;

        const normalizedItems: InvoiceItem[] = (data.items ?? []).map((it, idx: number) => {
          const quantity = Number(it.quantity ?? 0);
          const rate = Number(it.rate ?? 0);
          const sgstAmount = Number(it.sgstAmount ?? 0);
          const cgstAmount = Number(it.cgstAmount ?? 0);
          const igstAmount = Number(it.igstAmount ?? 0);

          const taxableValue = Number(it.taxableValue ?? rate * quantity);
          const total = Number(it.total ?? taxableValue + sgstAmount + cgstAmount + igstAmount);

          return {
            ...it,
            id: typeof it.id === "string" ? it.id : crypto.randomUUID(),
            srNo: Number(it.srNo ?? idx + 1),
            quantity,
            rate,
            taxableValue,
            sgstAmount,
            cgstAmount,
            igstAmount,
            total,
          } as InvoiceItem;
        });

        const normalized: InvoiceData = {
          ...(data as InvoiceData),
          details: {
            ...(data as InvoiceData).details,
            invoiceTitle:
              (data as InvoiceData).details.invoiceTitle ?? "TAX INVOICE",
            date: (() => {
              const raw = (data as InvoiceData).details.date as unknown;
              const d = raw instanceof Date ? raw : new Date(String(raw));
              return Number.isNaN(d.getTime()) ? new Date() : d;
            })(),
          },
          company: {
            ...(data as InvoiceData).company,
            logo: (data as InvoiceData).company.logo ?? "",
          },
          items: normalizedItems,
        };

        const totals = computeTotalsFromItems(normalized.items);

        normalized.totalAmount = totals.totalAmount;
        normalized.totalTax = totals.totalTax;
        normalized.totalAmountInWords = convertToWords(totals.grandTotal);

        if (mounted) setInvoiceData(normalized);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load invoice for editing");
        if (mounted) navigate("/");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [invoiceNoDecoded, navigate]);

  const handlePrint = () => {
    document.body.classList.add("printing");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing");
    }, 100);
  };

  const originalInvoiceNo = invoiceNoDecoded;

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

    const totals = computeTotalsFromItems(invoiceData.items);

    const invoiceToSave: InvoiceData = {
      ...invoiceData,
      totalAmount: totals.totalAmount,
      totalTax: totals.totalTax,
      totalAmountInWords: convertToWords(totals.grandTotal),
    };

    try {
      toast.loading("Saving invoice...");

      const currentInvoiceNo = invoiceToSave.details.invoiceNo;
      const original = originalInvoiceNo;

      if (original && currentInvoiceNo && original !== currentInvoiceNo) {
        // If invoiceNo changed, delete the old invoice record so it doesn't remain orphaned.
        // Then save the invoice under the new invoiceNo.
        await saveInvoice(invoiceToSave);
      } else {
        await saveInvoice(invoiceToSave);
      }

      // Local cache mirror
      putInvoice(invoiceToSave);

      toast.success("Invoice updated successfully!");

      // If invoiceNo changed, ensure the route/identifier matches the new value.
      if (original && currentInvoiceNo && original !== currentInvoiceNo) {
        navigate(`/edit/${encodeURIComponent(currentInvoiceNo)}`);
        return;
      }

      setEditable(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save invoice");
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading invoice...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:py-0 print:px-0 print:bg-white">
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            body { background-color: white !important; }
            .print-area {
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }
            .invoice-logo { max-height: 80px !important; width: auto !important; }
          }
        `}
      </style>

      <div className="max-w-[210mm] mx-auto print:max-w-none print:my-0">
        <div className="mb-6 no-print flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>

          <div className="flex items-center gap-4">
            <div className="logo-upload-section">
              <Label htmlFor="logo-upload-edit" className="text-sm font-medium cursor-pointer">
                <Upload className="h-4 w-4 inline mr-2" />
                Upload Logo
              </Label>
              <Input
                id="logo-upload-edit"
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
            <Button variant="outline" onClick={() => navigate("/")}> 
              <RotateCcw className="h-4 w-4 mr-2" />
              Exit
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

            <Button variant="outline" onClick={handlePrint}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>

            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        <div className="print-area bg-white shadow-lg print:shadow-none print:border-none">
          <ProfessionalInvoice
            company={invoiceData.company}
            consignee={invoiceData.consignee}
            buyer={invoiceData.buyer}
            details={invoiceData.details}
            items={invoiceData.items}
            remarks={invoiceData.remarks}
            editable={editable}
            onCompanyChange={(company) => setInvoiceData((prev) => ({ ...prev, company }))}
            onConsigneeChange={(consignee) => setInvoiceData((prev) => ({ ...prev, consignee }))}
            onBuyerChange={(buyer) => setInvoiceData((prev) => ({ ...prev, buyer }))}
            onDetailsChange={(details) => setInvoiceData((prev) => ({ ...prev, details }))}
            onItemsChange={(items) => setInvoiceData((prev) => ({ ...prev, items }))}
            onRemarksChange={(remarks) => setInvoiceData((prev) => ({ ...prev, remarks }))}
          />
        </div>

        <div className="no-print text-center mt-6 text-sm text-gray-500">
          <p className="mb-1">💡 Make changes, then click <strong>Save</strong> to update this invoice.</p>
          <p>
            Use <strong>Preview</strong> to see how it will look, then <strong>Print</strong> or <strong>PDF</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
