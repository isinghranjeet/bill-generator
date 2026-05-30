import type { InvoiceData } from "@/types/invoice";
import { idbGetInvoice, idbGetInvoicesList, idbSetInvoice } from "@/lib/invoiceCacheDb";

const STORAGE_KEY = "invoice_creator_invoice_cache_v1";

const IDB_MIGRATION_FLAG_KEY = "invoice_creator_idb_migrated_v1";

type CacheState = {
  invoicesByNo: Record<string, InvoiceData>;
  invoicesList: InvoiceData[];
  updatedAt?: string;
};

function safeParse(raw: string | null): CacheState {
  if (!raw) return { invoicesByNo: {}, invoicesList: [] };

  try {
    const parsed = JSON.parse(raw) as Partial<CacheState>;
    return {
      invoicesByNo: parsed?.invoicesByNo ?? {},
      invoicesList: parsed?.invoicesList ?? [],
      updatedAt: parsed?.updatedAt,
    };
  } catch {
    return { invoicesByNo: {}, invoicesList: [] };
  }
}

function loadState(): CacheState {
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

function persistState(state: CacheState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function hasIdbSupport(): boolean {
  return typeof indexedDB !== "undefined";
}

async function migrateLocalStorageToIdbIfNeeded() {
  if (!hasIdbSupport()) return;

  const already = window.localStorage.getItem(IDB_MIGRATION_FLAG_KEY);
  if (already === "1") return;

  try {
    // If IDB has invoices, don't migrate.
    const idbList = await idbGetInvoicesList(1);
    if (idbList.length > 0) {
      window.localStorage.setItem(IDB_MIGRATION_FLAG_KEY, "1");
      return;
    }

    const state = loadState();
    const list = state.invoicesList;
    if (!Array.isArray(list) || list.length === 0) {
      window.localStorage.setItem(IDB_MIGRATION_FLAG_KEY, "1");
      return;
    }

    for (const inv of list) {
      await idbSetInvoice(inv);
    }

    window.localStorage.setItem(IDB_MIGRATION_FLAG_KEY, "1");
  } catch {
    // ignore migration errors
  }
}

let migrationStarted = false;
function ensureMigrationStarted() {
  if (migrationStarted) return;
  migrationStarted = true;
  void migrateLocalStorageToIdbIfNeeded();
}

function putInvoicesListLocalStorage(invoices: InvoiceData[]) {
  const state = loadState();
  const invoicesByNo = { ...state.invoicesByNo };

  for (const inv of invoices) {
    const no = inv?.details?.invoiceNo;
    if (no) invoicesByNo[String(no)] = inv;
  }

  persistState({
    invoicesByNo,
    invoicesList: invoices,
    updatedAt: new Date().toISOString(),
  });
}

function putInvoiceLocalStorage(invoice: InvoiceData) {
  const no = invoice?.details?.invoiceNo;
  if (!no) return;
  const state = loadState();
  const invoicesByNo = { ...state.invoicesByNo, [String(no)]: invoice };

  // keep list in sync when possible
  const invoicesList = state.invoicesList.some((i) => i?.details?.invoiceNo === no)
    ? state.invoicesList.map((i) => (i?.details?.invoiceNo === no ? invoice : i))
    : [invoice, ...state.invoicesList];

  persistState({
    invoicesByNo,
    invoicesList,
    updatedAt: new Date().toISOString(),
  });
}

export function putInvoicesList(invoices: InvoiceData[]) {
  // Backward compatible primary layer: localStorage (as fallback)
  putInvoicesListLocalStorage(invoices);

  // Primary layer now: IDB, and also mirror for compatibility
  ensureMigrationStarted();
  void (async () => {
    if (!hasIdbSupport()) return;
    try {
      for (const inv of invoices) {
        await idbSetInvoice(inv);
      }
    } catch {
      // ignore
    }
  })();
}

export function putInvoice(invoice: InvoiceData) {
  putInvoiceLocalStorage(invoice);

  ensureMigrationStarted();
  void (async () => {
    if (!hasIdbSupport()) return;
    try {
      await idbSetInvoice(invoice);
    } catch {
      // ignore
    }
  })();
}

export function getCachedInvoice(invoiceNo: string): InvoiceData | null {
  // Keep the API synchronous: IDB reads are async.
  // Strategy: if migration already happened or we likely have IDB data, callers
  // can still use localStorage immediately. IDB will be filled for future sessions.
  // Offline invoice pages already have localStorage first.
  const state = loadState();
  return state.invoicesByNo[String(invoiceNo)] ?? null;
}

export function getCachedInvoicesList(): InvoiceData[] {
  const state = loadState();
  return state.invoicesList;
}

export async function getCachedInvoiceAsync(invoiceNo: string): Promise<InvoiceData | null> {
  ensureMigrationStarted();
  if (!hasIdbSupport()) return getCachedInvoice(invoiceNo);
  try {
    return await idbGetInvoice(invoiceNo);
  } catch {
    return getCachedInvoice(invoiceNo);
  }
}

export async function getCachedInvoicesListAsync(limit?: number): Promise<InvoiceData[]> {
  ensureMigrationStarted();
  if (!hasIdbSupport()) return getCachedInvoicesList();
  try {
    return await idbGetInvoicesList(limit);
  } catch {
    return getCachedInvoicesList();
  }
}


