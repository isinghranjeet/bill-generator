import { useCallback, useEffect, useMemo, useState } from "react";
import type { InvoiceData } from "@/types/invoice";
import { deleteInvoice, getInvoice, getInvoices, upsertInvoice } from "@/lib/invoiceApi";

export type SavedInvoice = InvoiceData & { savedAt?: string };

export const useInvoiceStorage = () => {
  const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const firstPage = await getInvoices({ page: 1, limit: 100 });
      const allInvoices = [...firstPage.items];
      const pageCount = Math.max(1, firstPage.totalPages || 1);

      for (let firstPageNumber = 2; firstPageNumber <= pageCount; firstPageNumber += 5) {
        const pageNumbers = Array.from(
          { length: Math.min(5, pageCount - firstPageNumber + 1) },
          (_, index) => firstPageNumber + index
        );
        const pages = await Promise.all(
          pageNumbers.map((page) => getInvoices({ page, limit: 100 }))
        );
        allInvoices.push(...pages.flatMap((page) => page.items));
      }

      setInvoices(allInvoices as SavedInvoice[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveInvoice = useCallback(
    async (invoice: InvoiceData) => {
      const res = await upsertInvoice(invoice);
      await refresh();
      return res;
    },
    [refresh]
  );

  const deleteInvoiceByNo = useCallback(
    async (invoiceNo: string) => {
      await deleteInvoice(invoiceNo);
      await refresh();
    },
    [refresh]
  );

  const getInvoiceByNo = useCallback(
    async (invoiceNo: string) => {
      return getInvoice(invoiceNo);
    },
    []
  );

  const getInvoiceFromCache = useCallback(
    (invoiceNo: string): SavedInvoice | undefined => {
      return invoices.find((inv) => inv.details.invoiceNo === invoiceNo);
    },
    [invoices]
  );

  const searchInvoices = useCallback(
    (query: string): SavedInvoice[] => {
      const lowerQuery = query.toLowerCase();
      return invoices.filter(
        (inv) =>
          inv.details.invoiceNo.toLowerCase().includes(lowerQuery) ||
          inv.buyer.name.toLowerCase().includes(lowerQuery) ||
          inv.consignee.name.toLowerCase().includes(lowerQuery)
      );
    },
    [invoices]
  );

  const apiState = useMemo(() => ({ loading, error }), [loading, error]);

  return {
    invoices,
    saveInvoice,
    deleteInvoice: deleteInvoiceByNo,
    getInvoice: getInvoiceFromCache,
    getInvoiceRemote: getInvoiceByNo,
    searchInvoices,
    apiState,
    refresh,
  };
};


