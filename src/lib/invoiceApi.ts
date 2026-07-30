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

  // apiFetch prefixes with API_BASE
  // Use backend route prefix: /api/invoices
  return apiFetch<InvoicesListResponse>(`/api/invoices${url.search}`);
}

export async function getInvoice(invoiceNo: string) {
  return apiFetch<InvoiceData>(`/api/invoices/${encodeURIComponent(invoiceNo)}`);
}

export async function upsertInvoice(payload: InvoiceData) {
  // Sanitize payload: The backend Zod schema rejects null for optional object fields.
  // - Remove discount if null/undefined so the schema's .optional() accepts it as absent.
  // - Remove any other fields that might be null but the schema expects absent.
  const sanitized = { ...payload };
  if (sanitized.discount === null || sanitized.discount === undefined) {
    delete sanitized.discount;
  }

  return apiFetch<{ ok: true; invoiceNo: string }>("/api/invoices/", {
    method: "POST",
    body: sanitized,
  });
}

export async function deleteInvoice(invoiceNo: string) {
  return apiFetch<{ ok: true }>(`/api/invoices/${encodeURIComponent(invoiceNo)}`, {
    method: "DELETE",
  });
}

export async function getInvoiceNumberKeys() {
  return apiFetch<{ items: string[] }>("/api/invoices/numbers/invoice");
}

export async function getQuotationNumberKeys() {
  return apiFetch<{ items: string[] }>("/api/invoices/numbers/quotation");
}



