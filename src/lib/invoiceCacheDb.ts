import type { InvoiceData } from "@/types/invoice";

const DB_NAME = "invoice_creator_db";
const DB_VERSION = 1;
const STORE_NAME = "invoices";

const keyForInvoiceNo = (invoiceNo: string) => String(invoiceNo);

type DBState = {
  ready: boolean;
  db: IDBDatabase | null;
};

let singleton: DBState = { ready: false, db: null };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getDb(): Promise<IDBDatabase | null> {
  if (singleton.ready) return singleton.db;

  try {
    if (typeof indexedDB === "undefined") {
      singleton = { ready: true, db: null };
      return null;
    }

    const db = await openDb();
    singleton = { ready: true, db };
    return db;
  } catch {
    singleton = { ready: true, db: null };
    return null;
  }
}

async function getAllInvoiceNos(db: IDBDatabase): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAllKeys();

    req.onsuccess = () => {
      const keys = req.result;
      resolve(keys.map((k) => String(k)));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function idbGetInvoice(invoiceNo: string): Promise<InvoiceData | null> {
  const db = await getDb();
  if (!db) return null;

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(keyForInvoiceNo(invoiceNo));

    req.onsuccess = () => resolve((req.result as InvoiceData) ?? null);
    req.onerror = () => resolve(null);
  });
}

export async function idbSetInvoice(invoice: InvoiceData): Promise<void> {
  const invoiceNo = invoice?.details?.invoiceNo;
  if (!invoiceNo) return;

  const db = await getDb();
  if (!db) return;

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(invoice, keyForInvoiceNo(invoiceNo));

    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}

export async function idbDeleteInvoice(invoiceNo: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(keyForInvoiceNo(invoiceNo));

    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}

export async function idbGetInvoicesList(limit?: number): Promise<InvoiceData[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const nos = await getAllInvoiceNos(db);
    const selected = typeof limit === "number" ? nos.slice(0, limit) : nos;

    const results: InvoiceData[] = [];
    for (const no of selected) {
      const inv = await idbGetInvoice(no);
      if (inv) results.push(inv);
    }
    return results;
  } catch {
    return [];
  }
}

