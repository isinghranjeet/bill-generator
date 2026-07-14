import { useCallback, useEffect, useState } from "react";
import { fetchSettings, updateCompanyProfile, updateInvoiceNumberSettings, updateRemarks } from "@/lib/settingsApi";

export type UserSettings = {
  remarks: string[];
  invoiceNumberSettings: {
    invoicePrefix: string;
    quotationPrefix: string;
    nextInvoiceNumber: number;
    nextQuotationNumber: number;
  };
  companyProfile: {
    name: string;
    address: string;
    gstNumber: string;
    phoneNumber: string;
    email: string;
    logo: string;
  };
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSettings();
      setSettings(res.settings as UserSettings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveRemarks = useCallback(
    async (remarks: string[]) => {
      const res = await updateRemarks(remarks);
      await refresh();
      return res;
    },
    [refresh]
  );

  const saveCompanyProfile = useCallback(
    async (payload: UserSettings["companyProfile"]) => {
      const res = await updateCompanyProfile(payload);
      await refresh();
      return res;
    },
    [refresh]
  );

  const saveInvoiceNumberSettings = useCallback(
    async (payload: UserSettings["invoiceNumberSettings"]) => {
      const res = await updateInvoiceNumberSettings(payload);
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
    saveCompanyProfile,
    saveInvoiceNumberSettings,
  };
}

