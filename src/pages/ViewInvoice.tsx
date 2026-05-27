import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { InvoiceHeader } from "@/components/invoice/InvoiceHeader";
import { PartyDetails } from "@/components/invoice/PartyDetails";
import { ItemsTable } from "@/components/invoice/ItemsTable";
import { InvoiceSummary } from "@/components/invoice/InvoiceSummary";
import { InvoiceFooter } from "@/components/invoice/InvoiceFooter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { getInvoice as getInvoiceApi } from "@/lib/invoiceApi";
import type { InvoiceData } from "@/types/invoice";

type InvoiceResponse = InvoiceData & { _id?: string };

const ViewInvoice = () => {
  const { invoiceNo } = useParams<{ invoiceNo: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!invoiceNo) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await getInvoiceApi(decodeURIComponent(invoiceNo));
        if (mounted) setInvoice(res as unknown as InvoiceResponse);
      } catch (e) {
        if (mounted) {
          toast.error(e instanceof Error ? e.message : "Failed to load invoice");
          setInvoice(null);
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
            <Button variant="outline" onClick={handlePrint}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        <div className="invoice-container">
          <InvoiceHeader
            company={invoice.company}
            details={{
              ...invoice.details,
              date: new Date(invoice.details.date),
            }}
            onCompanyChange={() => {}}
            onDetailsChange={() => {}}
            editable={false}
          />

          <div className="grid grid-cols-2 border-b border-border">
            <div className="border-r border-border">
              <PartyDetails
                title="Consignee (Ship to)"
                party={invoice.consignee}
                onPartyChange={() => {}}
                editable={false}
              />
            </div>
            <div>
              <PartyDetails
                title="Buyer (Bill to)"
                party={invoice.buyer}
                onPartyChange={() => {}}
                editable={false}
              />
            </div>
          </div>

          <ItemsTable items={invoice.items} onItemsChange={() => {}} editable={false} />

          <InvoiceSummary
            items={invoice.items}
            remarks={invoice.remarks}
            onRemarksChange={() => {}}
            companyName={invoice.company.name}
            editable={false}
          />

          <InvoiceFooter companyName={invoice.company.name} />
        </div>
      </div>
    </div>
  );
};

export default ViewInvoice;

