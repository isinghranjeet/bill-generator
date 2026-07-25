import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ProfessionalInvoice } from "@/components/invoice/ProfessionalInvoice";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { getInvoice as getInvoiceApi } from "@/lib/invoiceApi";
import type { InvoiceData } from "@/types/invoice";
import { getCachedInvoice } from "@/lib/invoiceCache";


type InvoiceResponse = InvoiceData & { _id?: string };

const ViewInvoice = () => {
  const { invoiceNo } = useParams<{ invoiceNo: string }>();
  const navigate = useNavigate();

const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // DEBUG: Log the raw URL param received by ViewInvoice
    console.log("[DEBUG ViewInvoice] invoiceNo from URL params:", JSON.stringify(invoiceNo));
    console.log("[DEBUG ViewInvoice] invoiceNo type:", typeof invoiceNo);
    console.log("[DEBUG ViewInvoice] invoiceNo length:", invoiceNo?.length);
    console.log("[DEBUG ViewInvoice] decoded:", decodeURIComponent(invoiceNo || ""));
    console.log("[DEBUG ViewInvoice] decoded charCodes:", Array.from(decodeURIComponent(invoiceNo || "")).map(c => c.charCodeAt(0)));
  }, [invoiceNo]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!invoiceNo) {
        if (mounted) setLoading(false);
        return;
      }

      // Offline-first: show cached invoice immediately if available
      const cached = getCachedInvoice(decodeURIComponent(invoiceNo));
      if (mounted && cached) {
        console.log("[DEBUG ViewInvoice] Found in cache:", cached.details?.invoiceNo);
        setInvoice(cached as unknown as InvoiceResponse);
        setLoading(false);
      }

      try {
        setLoading(true);
        const decoded = decodeURIComponent(invoiceNo);
        console.log("[DEBUG ViewInvoice] Calling getInvoiceApi with:", JSON.stringify(decoded));
        const res = await getInvoiceApi(decoded);
        console.log("[DEBUG ViewInvoice] API response received:", res ? "OK" : "null");
        if (mounted) {
          setInvoice(res as unknown as InvoiceResponse);
        }
      } catch (e) {
        console.error("[DEBUG ViewInvoice] API call failed:", e);
        if (mounted) {
          toast.error(e instanceof Error ? e.message : "Failed to load invoice");
          // keep cached view if we have it
          if (!cached) setInvoice(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }

    };

    run();
    return () => {
      mounted = false;
    };
  }, [invoiceNo]);

const handlePrint = () => {
    toast.dismiss();
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading invoice...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invoice Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The invoice you're looking for doesn't exist.
          </p>
          <Button onClick={() => navigate("/")}>Back to Admin</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4 no-print">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
<div className="flex items-center gap-2">
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        <div className="invoice-container">
          <ProfessionalInvoice
            company={invoice.company}
            consignee={invoice.consignee}
            buyer={invoice.buyer}
            details={{
              ...invoice.details,
              invoiceTitle: invoice.details.invoiceTitle ?? "TAX INVOICE",
              date: (() => {
                const raw = invoice.details.date as unknown;
                const d = raw instanceof Date ? raw : new Date(String(raw));
                return Number.isNaN(d.getTime()) ? new Date() : d;
              })(),
            }}
            items={invoice.items}
            remarks={invoice.remarks}
            editable={false}
            onCompanyChange={() => {}}
            onConsigneeChange={() => {}}
            onBuyerChange={() => {}}
            onDetailsChange={() => {}}
            onItemsChange={() => {}}
            onRemarksChange={() => {}}
          />
        </div>
      </div>
    </div>
  );
};

export default ViewInvoice;

