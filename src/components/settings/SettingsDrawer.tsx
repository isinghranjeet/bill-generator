import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Settings, LogOut, FileText, Tag, Banknote } from "lucide-react";

import { useSettings } from "@/hooks/useSettings";

type InvoiceCounters = {
  invoicePrefix: string;
  quotationPrefix: string;
  invoiceStartNumber: number;
  quotationStartNumber: number;
};

type CompanyProfileForm = {
  name: string;
  address: string;
  gstNumber: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
};

type BankDetailsForm = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
};

type SettingsFormState = {
  companyProfile: CompanyProfileForm;
  bankDetails: BankDetailsForm;
  invoiceNumberSettings: {
    invoicePrefix: string;
    quotationPrefix: string;
    invoiceStartNumber: number;
    quotationStartNumber: number;
  };
  remarks: string[];
};

type SettingsDrawerShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DEFAULT_FORM: SettingsFormState = {
  companyProfile: {
    name: "",
    address: "",
    gstNumber: "",
    phone: "",
    email: "",
    website: "",
    logo: "",
  },
  bankDetails: {
    accountName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    branch: "",
  },
  invoiceNumberSettings: {
    invoicePrefix: "INV-",
    quotationPrefix: "QT-",
    invoiceStartNumber: 1001,
    quotationStartNumber: 1001,
  },
  remarks: [],
};

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  const i = Math.trunc(value);
  return Math.max(min, Math.min(max, i));
}

function trimAndDedupeRemarks(list: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const v = String(raw ?? "").trim();
    if (!v) continue;
    const key = v;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

export function SettingsDrawerShell({
  open,
  onOpenChange,
}: SettingsDrawerShellProps) {
  const navigate = useNavigate();
  const { settings, loading, error, refresh } = useSettings();

  const [form, setForm] = useState<SettingsFormState>(DEFAULT_FORM);

  const [isSaving, setIsSaving] = useState(false);

  // Remarks confirm delete
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);

  const [draftRemark, setDraftRemark] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    if (loading) return;
    if (!settings) return;

// Map flat settings (from useSettings / API) to nested form state
    setForm({
      companyProfile: {
        name: settings.companyName ?? "",
        address: settings.address ?? "",
        gstNumber: settings.gstNumber ?? "",
        phone: settings.phone ?? "",
        email: settings.email ?? "",
        website: settings.website ?? "",
        logo: settings.logo ?? "",
      },
      bankDetails: {
        accountName: settings.bankDetails?.accountName ?? "",
        bankName: settings.bankDetails?.bankName ?? "",
        accountNumber: settings.bankDetails?.accountNumber ?? "",
        ifscCode: settings.bankDetails?.ifscCode ?? "",
        branch: settings.bankDetails?.branch ?? "",
      },
      invoiceNumberSettings: {
        invoicePrefix: settings.invoicePrefix ?? "INV-",
        quotationPrefix: settings.quotationPrefix ?? "QT-",
        invoiceStartNumber: settings.invoiceStartNumber ?? 1001,
        quotationStartNumber: settings.quotationStartNumber ?? 1001,
      },
      remarks: Array.isArray(settings.remarks) ? settings.remarks : [],
    });
  }, [open, loading, settings]);

  const invoicePreview = useMemo(() => {
    const prefix = form.invoiceNumberSettings.invoicePrefix || "";
    const n = clampInt(form.invoiceNumberSettings.invoiceStartNumber, 0, 999999999);
    return `${prefix}${String(n).padStart(3, "0").slice(-3)}`;
  }, [form.invoiceNumberSettings.invoicePrefix, form.invoiceNumberSettings.invoiceStartNumber]);

  const quotationPreview = useMemo(() => {
    const prefix = form.invoiceNumberSettings.quotationPrefix || "";
    const n = clampInt(form.invoiceNumberSettings.quotationStartNumber, 0, 999999999);
    return `${prefix}${String(n).padStart(3, "0").slice(-3)}`;
  }, [form.invoiceNumberSettings.quotationPrefix, form.invoiceNumberSettings.quotationStartNumber]);

  const onLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch {
      // ignore
    }
    toast.success("Logged out.");
    navigate("/login");
  };

  const onAddOrUpdateRemark = () => {
    const v = String(draftRemark ?? "").trim();
    if (!v) {
      toast.error("Remark cannot be empty.");
      return;
    }

    setForm((prev) => {
      const next = [...prev.remarks];

      const normalized = v;
      const alreadyIdx = next.findIndex((x) => String(x).trim() === normalized);
      const isDuplicate = alreadyIdx !== -1 && alreadyIdx !== (editingIndex ?? -1);
      if (isDuplicate) {
        toast.error("Duplicate remark not allowed.");
        return prev;
      }

      if (editingIndex === null) {
        next.push(normalized);
      } else {
        next[editingIndex] = normalized;
      }

      return { ...prev, remarks: trimAndDedupeRemarks(next) };
    });

    setDraftRemark("");
    setEditingIndex(null);
  };

  const onRequestDeleteRemark = (idx: number) => {
    setPendingDeleteIndex(idx);
    setIsConfirmDeleteOpen(true);
  };

  const onConfirmDeleteRemark = () => {
    if (pendingDeleteIndex === null) return;

    setForm((prev) => ({
      ...prev,
      remarks: prev.remarks.filter((_, i) => i !== pendingDeleteIndex),
    }));

    setPendingDeleteIndex(null);
    setIsConfirmDeleteOpen(false);
    toast.success("Remark deleted.");

    if (editingIndex !== null && pendingDeleteIndex === editingIndex) {
      setEditingIndex(null);
      setDraftRemark("");
    }
  };

  const onEditRemark = (idx: number) => {
    setEditingIndex(idx);
    setDraftRemark(form.remarks[idx] ?? "");
  };

  const onResetRemarkDraft = () => {
    setEditingIndex(null);
    setDraftRemark("");
  };

const onSave = async () => {
    setIsSaving(true);
    try {
      // Use upsertSettings with full payload to save all settings in one call
      const { upsertSettings } = await import("@/lib/settingsApi");
      await upsertSettings({
        companyName: String(form.companyProfile.name ?? ""),
        address: String(form.companyProfile.address ?? ""),
        gstNumber: String(form.companyProfile.gstNumber ?? ""),
        phone: String(form.companyProfile.phone ?? ""),
        email: String(form.companyProfile.email ?? ""),
        website: String(form.companyProfile.website ?? ""),
        logo: String(form.companyProfile.logo ?? ""),
        invoicePrefix: String(form.invoiceNumberSettings.invoicePrefix ?? "INV-"),
        quotationPrefix: String(form.invoiceNumberSettings.quotationPrefix ?? "QT-"),
        invoiceStartNumber: clampInt(form.invoiceNumberSettings.invoiceStartNumber, 0, 999999999),
        quotationStartNumber: clampInt(form.invoiceNumberSettings.quotationStartNumber, 0, 999999999),
        remarks: trimAndDedupeRemarks(form.remarks),
        bankDetails: {
          accountName: String(form.bankDetails.accountName ?? ""),
          bankName: String(form.bankDetails.bankName ?? ""),
          accountNumber: String(form.bankDetails.accountNumber ?? ""),
          ifscCode: String(form.bankDetails.ifscCode ?? ""),
          branch: String(form.bankDetails.branch ?? ""),
        },
      });

      await refresh();
      toast.success("Settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="px-4 py-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-auto px-4 py-4 space-y-6">
            {error ? <div className="text-sm text-destructive">{error}</div> : null}

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Company Profile</h3>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Input
                  value={form.companyProfile.name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      companyProfile: { ...prev.companyProfile, name: e.target.value },
                    }))
                  }
                  placeholder="Company name"
                />
                <Textarea
                  value={form.companyProfile.address}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      companyProfile: { ...prev.companyProfile, address: e.target.value },
                    }))
                  }
                  placeholder="Address"
                  className="min-h-[90px]"
                />
                <Input
                  value={form.companyProfile.gstNumber}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      companyProfile: { ...prev.companyProfile, gstNumber: e.target.value },
                    }))
                  }
                  placeholder="GSTIN"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    value={form.companyProfile.phone}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        companyProfile: { ...prev.companyProfile, phone: e.target.value },
                      }))
                    }
                    placeholder="Phone"
                  />
                  <Input
                    value={form.companyProfile.email}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        companyProfile: { ...prev.companyProfile, email: e.target.value },
                      }))
                    }
                    placeholder="Email"
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Bank Details Section */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Bank Details</h3>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Input
                  value={form.bankDetails.accountName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      bankDetails: { ...prev.bankDetails, accountName: e.target.value },
                    }))
                  }
                  placeholder="Account Holder Name"
                />
                <Input
                  value={form.bankDetails.bankName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      bankDetails: { ...prev.bankDetails, bankName: e.target.value },
                    }))
                  }
                  placeholder="Bank Name"
                />
                <Input
                  value={form.bankDetails.accountNumber}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      bankDetails: { ...prev.bankDetails, accountNumber: e.target.value },
                    }))
                  }
                  placeholder="Account Number"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    value={form.bankDetails.ifscCode}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        bankDetails: { ...prev.bankDetails, ifscCode: e.target.value },
                      }))
                    }
                    placeholder="IFSC Code"
                  />
                  <Input
                    value={form.bankDetails.branch}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        bankDetails: { ...prev.bankDetails, branch: e.target.value },
                      }))
                    }
                    placeholder="Branch Address"
                  />
                </div>
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Invoice & Quotation Number Settings</h3>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Invoices</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Prefix</label>
                      <Input
                        value={form.invoiceNumberSettings.invoicePrefix}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            invoiceNumberSettings: {
                              ...prev.invoiceNumberSettings,
                              invoicePrefix: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Starting Invoice Number</label>
                      <Input
                        value={String(form.invoiceNumberSettings.invoiceStartNumber)}
                        inputMode="numeric"
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            invoiceNumberSettings: {
                              ...prev.invoiceNumberSettings,
                              invoiceStartNumber: clampInt(Number(e.target.value), 0, 999999999),
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs text-muted-foreground">Preview</label>
                      <div className="h-10 flex items-center px-3 rounded-md border bg-muted/30 text-sm">
                        {invoicePreview}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Quotations</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Prefix</label>
                      <Input
                        value={form.invoiceNumberSettings.quotationPrefix}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            invoiceNumberSettings: {
                              ...prev.invoiceNumberSettings,
                              quotationPrefix: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Starting Quotation Number</label>
                      <Input
                        value={String(form.invoiceNumberSettings.quotationStartNumber)}
                        inputMode="numeric"
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            invoiceNumberSettings: {
                              ...prev.invoiceNumberSettings,
                              quotationStartNumber: clampInt(Number(e.target.value), 0, 999999999),
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs text-muted-foreground">Preview</label>
                      <div className="h-10 flex items-center px-3 rounded-md border bg-muted/30 text-sm">
                        {quotationPreview}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Remarks</h3>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <Input
                    value={draftRemark}
                    onChange={(e) => setDraftRemark(e.target.value)}
                    placeholder="Add a remark"
                  />
                  <div className="flex gap-2">
                    <Button variant="default" onClick={onAddOrUpdateRemark}>
                      {editingIndex === null ? "Add" : "Update"}
                    </Button>
                    {editingIndex !== null ? (
                      <Button variant="outline" onClick={onResetRemarkDraft}>
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </div>

                <Separator />

                {form.remarks.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No remarks added yet.</div>
                ) : (
                  <div className="space-y-2">
                    {form.remarks.map((r, idx) => (
                      <div key={`${r}-${idx}`} className="rounded-md border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="text-sm">{r}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={() => onEditRemark(idx)}>
                              Edit
                            </Button>
                            <Button variant="ghost" onClick={() => onRequestDeleteRemark(idx)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="px-4 py-4 border-t border-border flex flex-col gap-2">
            <Button
              onClick={onSave}
              disabled={loading || isSaving}
              className="justify-start"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
            <Button variant="outline" onClick={onLogout} className="justify-start">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="justify-start"
            >
              Close
            </Button>

            <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this remark?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove the remark from saved settings.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onConfirmDeleteRemark}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

type SettingsDrawerProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function SettingsDrawer(props: SettingsDrawerProps) {
  return (
    <SettingsDrawerShell
      open={props.open ?? false}
      onOpenChange={props.onOpenChange ?? (() => {})}
    />
  );
}







