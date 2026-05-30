import { useEffect } from "react";
import {
  getCachedInvoiceAsync,
  getCachedInvoicesListAsync,
  getCachedInvoicesList,
  getCachedInvoice,
  putInvoice,
  putInvoicesList,
} from "@/lib/invoiceCache";
import { getInvoice as getInvoiceRemote, getInvoices as getInvoicesRemote } from "@/lib/invoiceApi";
import type { InvoiceData } from "@/types/invoice";

export function useInvoiceOfflineCache(params: {
  invoiceNo?: string;
  setInvoices?: (items: InvoiceData[]) => void;
  setInvoice?: (invoice: InvoiceData | null) => void;
}) {
  const { invoiceNo, setInvoices, setInvoice } = params;

  useEffect(() => {
    const loadFromCache = async () => {
      // Prefer IDB (async). Fallback to localStorage sync.
      if (invoiceNo && setInvoice) {
        try {
          const cached = await getCachedInvoiceAsync(invoiceNo);
          if (cached) setInvoice(cached);
        } catch {
          const cached = getCachedInvoice(invoiceNo);
          if (cached) setInvoice(cached);
        }
      }

      if (!invoiceNo && setInvoices) {
        try {
          const cached = await getCachedInvoicesListAsync(100);
          if (cached.length) setInvoices(cached);
        } catch {
          const cached = getCachedInvoicesList();
          if (cached.length) setInvoices(cached);
        }
      }
    };

    // Always attempt to show cached data first.
    void loadFromCache();

    if (navigator.onLine) {
      // Fetch remote and refresh cache
      const run = async () => {
        try {
          if (invoiceNo) {
            const remote = await getInvoiceRemote(invoiceNo);
            putInvoice(remote);
            setInvoice?.(remote);
          } else {
            const remote = await getInvoicesRemote({ page: 1, limit: 100 });
            const items = remote.items as InvoiceData[];
            putInvoicesList(items);
            setInvoices?.(items);
          }
        } catch {
          // If remote fails, cached data remains visible.
        }
      };
      void run();
    }
  }, [invoiceNo, setInvoices, setInvoice]);
}


