import { useCallback, useEffect, useState } from "react";
import { fetchSettings, upsertSettings, updateRemarks } from "@/lib/settingsApi";
import type { BankDetailsUpdate } from "@/lib/settingsApi";

export type UserSettings = {
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

const DEFAULT_SETTINGS: UserSettings = {
  companyName: "",
  address: "",
  gstNumber: "",
  phone: "",
  email: "",
  website: "",
  logo: "",
  invoicePrefix: "INV-",
  quotationPrefix: "QT-",
  invoiceStartNumber: 1001,
  quotationStartNumber: 1001,
  remarks: [],
  bankDetails: {
    accountName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    branch: "",
  },
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSettings();
      const s = res.settings;
      setSettings({
        companyName: s.companyName ?? "",
        address: s.address ?? "",
        gstNumber: s.gstNumber ?? "",
        phone: s.phone ?? "",
        email: s.email ?? "",
        website: s.website ?? "",
        logo: s.logo ?? "",
        invoicePrefix: s.invoicePrefix ?? "INV-",
        quotationPrefix: s.quotationPrefix ?? "QT-",
        invoiceStartNumber: s.invoiceStartNumber ?? 1001,
        quotationStartNumber: s.quotationStartNumber ?? 1001,
        remarks: Array.isArray(s.remarks) ? s.remarks : [],
        bankDetails: {
          accountName: s.bankDetails?.accountName ?? "",
          bankName: s.bankDetails?.bankName ?? "",
          accountNumber: s.bankDetails?.accountNumber ?? "",
          ifscCode: s.bankDetails?.ifscCode ?? "",
          branch: s.bankDetails?.branch ?? "",
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveAllSettings = useCallback(
    async (payload: Partial<UserSettings>) => {
      const res = await upsertSettings({
        companyName: payload.companyName,
        address: payload.address,
        gstNumber: payload.gstNumber,
        phone: payload.phone,
        email: payload.email,
        website: payload.website,
        logo: payload.logo,
        invoicePrefix: payload.invoicePrefix,
        quotationPrefix: payload.quotationPrefix,
        invoiceStartNumber: payload.invoiceStartNumber,
        quotationStartNumber: payload.quotationStartNumber,
        remarks: payload.remarks,
        bankDetails: payload.bankDetails,
      });
      await refresh();
      return res;
    },
    [refresh]
  );

  const saveRemarks = useCallback(
    async (remarks: string[]) => {
      const res = await updateRemarks(remarks);
      await refresh();
      return res;
    },
    [refresh]
  );

  return {
    settings,
    loading,
    error,
    refresh,
    saveRemarks,
    saveAllSettings,
  };
}

