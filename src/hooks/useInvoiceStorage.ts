import { useState, useEffect } from "react";
import { InvoiceData } from "@/types/invoice";

export interface SavedInvoice extends InvoiceData {
  savedAt: string;
  totalAmount: number;
}

const STORAGE_KEY = "saved_invoices";

export const useInvoiceStorage = () => {
  const [invoices, setInvoices] = useState<SavedInvoice[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setInvoices(parsed);
      } catch (e) {
        console.error("Failed to parse stored invoices", e);
      }
    }
  }, []);

  const saveInvoice = (invoice: InvoiceData, totalAmount: number) => {
    const savedInvoice: SavedInvoice = {
      ...invoice,
      savedAt: new Date().toISOString(),
      totalAmount,
    };

    // Check if invoice with same number exists
    const existingIndex = invoices.findIndex(
      (inv) => inv.details.invoiceNo === invoice.details.invoiceNo
    );

    let updatedInvoices: SavedInvoice[];
    if (existingIndex >= 0) {
      updatedInvoices = [...invoices];
      updatedInvoices[existingIndex] = savedInvoice;
    } else {
      updatedInvoices = [savedInvoice, ...invoices];
    }

    setInvoices(updatedInvoices);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedInvoices));
    return savedInvoice;
  };

  const deleteInvoice = (invoiceNo: string) => {
    const updatedInvoices = invoices.filter(
      (inv) => inv.details.invoiceNo !== invoiceNo
    );
    setInvoices(updatedInvoices);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedInvoices));
  };

  const getInvoice = (invoiceNo: string): SavedInvoice | undefined => {
    return invoices.find((inv) => inv.details.invoiceNo === invoiceNo);
  };

  const searchInvoices = (query: string): SavedInvoice[] => {
    const lowerQuery = query.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.details.invoiceNo.toLowerCase().includes(lowerQuery) ||
        inv.buyer.name.toLowerCase().includes(lowerQuery) ||
        inv.consignee.name.toLowerCase().includes(lowerQuery)
    );
  };

  return {
    invoices,
    saveInvoice,
    deleteInvoice,
    getInvoice,
    searchInvoices,
  };
};
