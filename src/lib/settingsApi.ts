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

export type BankDetailsUpdate = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
};

// Full settings payload matching backend's settingsUpsertSchema
export type SettingsUpsertPayload = {
  companyName?: string;
  address?: string;
  gstNumber?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  invoicePrefix?: string;
  quotationPrefix?: string;
  invoiceStartNumber?: number;
  quotationStartNumber?: number;
  remarks?: string[];
  bankDetails?: BankDetailsUpdate;
};

export type SettingsResponse = {
  ok: boolean;
  settings: {
    companyName: string;
    address: string;
    gstNumber: string;
    phone: string;
    email: string;
    website: string;
    logo: string;
    invoicePrefix: string;
    quotationPrefix: string;
    invoiceStartNumber: number;
    quotationStartNumber: number;
    remarks: string[];
    bankDetails: BankDetailsUpdate;
  };
};

export async function fetchSettings() {
  return apiFetch<SettingsResponse>("/api/settings");
}

export async function upsertSettings(payload: SettingsUpsertPayload) {
  return apiFetch<SettingsResponse>("/api/settings", {
    method: "POST",
    body: payload,
  });
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

export async function consumeNextNumber(documentType: string) {
  // ----- NORMALIZE: only "invoice" or "quotation" allowed -----
  const raw = documentType?.toLowerCase().trim() ?? "";
  const normalized = raw === "quotation" ? "quotation" : "invoice";

  if (normalized !== "invoice" && normalized !== "quotation") {
    const errMsg = `Invalid documentType: "${documentType}". Must be "invoice" or "quotation".`;
    throw new Error(errMsg);
  }

  const payload = { documentType: normalized };

  return apiFetch<{ ok: true; invoiceNo?: string; quotationNo?: string }>("/api/settings/consume-number", {
    method: "POST",
    body: payload,
  });
}


