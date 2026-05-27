import { apiFetch } from "@/lib/apiClient";
import type { InvoiceData } from "@/types/invoice";

export type InvoicesListResponse = {
  items: InvoiceData[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export async function getInvoices(params?: {
  q?: string;
  page?: number;
  limit?: number;
}) {
  const url = new URL("/invoices", window.location.origin);
  if (params?.q) url.searchParams.set("q", params.q);
  if (params?.page) url.searchParams.set("page", String(params.page));
  if (params?.limit) url.searchParams.set("limit", String(params.limit));

  // apiFetch prefixes with API_BASE (which already includes /api)
  return apiFetch<InvoicesListResponse>(`${url.pathname}${url.search}`);
}

export async function getInvoice(invoiceNo: string) {
  return apiFetch<InvoiceData>(`/invoices/${encodeURIComponent(invoiceNo)}`);
}

export async function upsertInvoice(payload: InvoiceData) {
  return apiFetch<{ ok: true; invoiceNo: string }>("/invoices/", {
    method: "POST",
    body: payload,
  });
}

export async function deleteInvoice(invoiceNo: string) {
  return apiFetch<{ ok: true }>(`/invoices/${encodeURIComponent(invoiceNo)}`, {
    method: "DELETE",
  });
}