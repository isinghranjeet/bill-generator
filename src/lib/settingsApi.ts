import { apiFetch } from "@/lib/apiClient";

export type SettingsRemarks = {
  remarks: string[];
};

export type CompanyProfileUpdate = {
  name: string;
  address: string;
  gstNumber: string;
  phoneNumber: string;
  email: string;
  logo: string; // base64 or URL
};

export type InvoiceNumberSettings = {
  invoicePrefix: string;
  quotationPrefix: string;
  nextInvoiceNumber: number;
  nextQuotationNumber: number;
};

export async function fetchSettings() {
  return apiFetch<{ ok: true; settings: object }>("/api/settings");
}



export async function updateRemarks(remarks: string[]) {
  return apiFetch<{ ok: true }>("/api/settings/remarks", {
    method: "PUT",
    body: { remarks },
  });
}

export async function updateCompanyProfile(payload: CompanyProfileUpdate) {
  return apiFetch<{ ok: true }>("/api/settings/company", {
    method: "PUT",
    body: payload,
  });
}

export async function updateInvoiceNumberSettings(payload: InvoiceNumberSettings) {
  return apiFetch<{ ok: true }>("/api/settings/number-settings", {
    method: "PUT",
    body: payload,
  });
}

export async function getNextNumbers() {
  return apiFetch<{ ok: true; invoice: { prefix: string; next: number }; quotation: { prefix: string; next: number } }>(
    "/api/settings/next-numbers"
  );
}

export async function consumeNextNumber(documentType: "invoice" | "quotation") {
  return apiFetch<{ ok: true }>("/api/settings/consume-number", {
    method: "POST",
    body: { documentType },
  });
}

