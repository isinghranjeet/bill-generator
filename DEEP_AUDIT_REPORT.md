# DEEP AUDIT REPORT — Happy Invoice Creator

> **Auditor:** Senior Software Architect / QA Automation / MERN / Security / Performance / Database  
> **Date:** Comprehensive second-pass audit  
> **Methodology:** Every file read, every component traced, every API endpoint verified from scratch.

---

## EXECUTIVE SUMMARY

This application has **severe architectural fragmentation** between an older legacy codebase and a newer refactored version. Multiple components, types, utilities, and even whole models exist in duplicate, resulting in an inconsistent, bug-prone system. **Approximately 40-50% of the codebase is either unused, duplicated, or broken.**

The application's core flow (Create → Save → View → Edit → Print) works on a basic level, but edges are frayed: calculations differ across components, types are mismatched, the database has overlapping models, and the UI has dead components and unused features throughout.

---

## SCORES

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Architecture** | 4/10 | Two competing architectures (old flat Settings vs new nested), mirrored components, no clear separation |
| **Frontend** | 5/10 | Works for basic flow but has duplicate components, broken types, stale state issues |
| **Backend** | 6/10 | Clean Express setup, good middleware, but Zod v4/v3 mismatch, overlapping models |
| **Database** | 5/10 | `Settings` and `UserSettings` overlap significantly; invoices store loose objects |
| **Security** | 5/10 | JWT in localStorage (XSS vulnerable), no CSRF, no input sanitization, token never validated client-side |
| **Performance** | 6/10 | Good memoization in ProfessionalInvoice, but heavy re-renders in AdminPortal, duplicate API calls |
| **Code Quality** | 3/10 | Massive duplication, dead code, console.logs in production, inconsistent naming |
| **Scalability** | 4/10 | Single settings document, no pagination beyond simple skip/limit, no indexes on queries |
| **Maintainability** | 2/10 | Three SettingsDrawer implementations, duplicated utilities, overlapping types — any change breaks in unexpected places |

---

## FEATURE COMPLETION

| Status | Count | Details |
|--------|-------|---------|
| **Working Features** | ~60% | Create invoice, Save/Edit, View, Print, PDF, List invoices, Dashboard stats, Auth (login/register) |
| **Partially Working** | ~25% | Settings saving (mismatched data shape), Discount (two implementations), Invoice number auto-generation, Offline cache |
| **Broken Features** | ~15% | Invoice number editing (disabled), Settings Drawer data mapping, ItemsTable vs ProfessionalInvoice type mismatch, Report generation (broken page numbering JS) |

---

## BUGS BY SEVERITY

| Severity | Count | Key Examples |
|----------|-------|-------------|
| **Critical** | 10 | Duplicate SettingsDrawer components, type mismatch between ItemsTable/ProfessionalInvoice, broken InvoiceSummary, SettingsDrawer loads wrong data shape, Zod v4/v3 incompatibility |
| **High** | 8 | Duplicate convertToWords (3 copies), hardcoded bank details, missing `days` type field, HSN code mismatch (9966 vs 9973), invoice number field always disabled |
| **Medium** | 12 | Unused components (BankDetails, InvoiceFooter), overlapping Settings/UserSettings models, console.logs in production, NotFound uses `<a>` not `<Link>`, missing CSS class |
| **Low** | 8 | Missing Tailwind class, rate limit too high, unused imports, unused packages, stale TODO files |

---

## DETAILED FINDINGS

---

### 1. CRITICAL: Triple SettingsDrawer Components

**Why:** The project has **three conflicting SettingsDrawer implementations** in different locations, plus a default export wrapper.

**Files:**
- `src/components/SettingsDrawer.tsx` — **EMPTY FILE** (no content)
- `src/components/SettingsDrawer/index.tsx` — re-exports from `../SettingsDrawer`
- `src/components/settings/SettingsDrawer.tsx` — **ACTUAL IMPLEMENTATION** (~400 lines)
- `src/components/settings/SettingsDrawer.default.tsx` — wrapper for default export
- `src/components/settings/index.ts` — re-exports from SettingsDrawer

**Root Cause:** During refactoring, the SettingsDrawer was moved from `src/components/SettingsDrawer.tsx` to `src/components/settings/SettingsDrawer.tsx`, but the old file locations and re-export wrappers were never cleaned up.

**Impact:** Importers may get an empty component or the wrong version depending on the import path.

**Severity:** Critical

**Suggested Solution:** Delete `src/components/SettingsDrawer.tsx`, `src/components/SettingsDrawer/index.tsx`, and `src/components/settings/SettingsDrawer.default.tsx`. Standardize on `src/components/settings/SettingsDrawer.tsx` with a single export.

---

### 2. CRITICAL: ItemsTable vs ProfessionalInvoice Type Mismatch

**Why:** These two components operate on the **same InvoiceItem type** but use completely different field names and column layouts.

**ItemsTable.tsx uses (OLD schema):**
- `productId`, `qty`, `gstPercent`, `taxableValue`, `amount`

**ProfessionalInvoice.tsx uses (NEW schema):**
- `srNo`, `quantity`, `days`, `unit`, `rate`, `taxableValue`, `gstPercent`, `sgstRate`, `cgstRate`, `igstRate`, `sgstAmount`, `cgstAmount`, `igstAmount`, `total`

**Root Cause:** ItemsTable was never updated to match the new InvoiceItem type. The ProfessionalInvoice was built with a NEW set of fields that the type file supports, but ItemsTable references OLD pattern (single `amount` instead of `total`, `qty` instead of `quantity`, `productId`).

**Impact:** `AdminPortal.tsx` uses `ItemsTable`, `InvoiceSummary`, `InvoiceHeader`, `InvoiceFooter` (the OLD view components), while `CreateInvoice.tsx` and `EditInvoice.tsx` use `ProfessionalInvoice` (the NEW component). When viewing an invoice, the OLD components show different data than the NEW components for the same invoice.

**Severity:** Critical

**Line Numbers:** ItemsTable.tsx entire file vs ProfessionalInvoice.tsx entire file

**Suggested Solution:** Delete the OLD view components (`ItemsTable`, `InvoiceSummary`, `InvoiceHeader`, `PartyDetails`, `InvoiceFooter`) and make `ProfessionalInvoice` the sole rendering component for all views.

---

### 3. CRITICAL: InvoiceSummary References Non-Existent Fields

**Why:** `InvoiceSummary.tsx` references `summary.totalQty` and `summary.taxableAmount`, but `calculateInvoiceSummary()` returns `{ amount, discount, taxableValue, sgst, cgst, igst, total }`.

**File:** `src/components/invoice/InvoiceSummary.tsx`

**Lines causing the bug:**
```tsx
// Line: summary.totalQty — DOES NOT EXIST
<div className="col-span-1 p-2 text-center border-r border-border font-bold">
  {summary.totalQty}
</div>

// Line: summary.taxableAmount — DOES NOT EXIST (should be taxableValue)
<div className="col-span-2 p-2 text-right border-r border-border font-bold">
  {formatCurrency(summary.taxableAmount)}
</div>
```

**Root Cause:** The component was partially refactored but the field names were not updated to match the actual return type of `calculateInvoiceSummary`.

**Impact:** The summary table renders `undefined` or `NaN` for the quantity total and taxable amount columns.

**Severity:** Critical

**Suggested Solution:** Replace `summary.totalQty` with `items.reduce((sum, i) => sum + (i.quantity || 0), 0)` and replace `summary.taxableAmount` with `summary.taxableValue`.

---

### 4. CRITICAL: SettingsDrawer Reads Wrong Data Shape

**Why:** `src/hooks/useSettings.ts` maps the API response to a flat structure:
```
{ companyName, address, gstNumber, phone, email, website, logo, invoicePrefix, ... }
```

But `src/components/settings/SettingsDrawer.tsx` expects a **nested** structure:
```
settings.companyProfile.name
settings.invoiceNumberSettings.invoicePrefix
```

**File:** `src/components/settings/SettingsDrawer.tsx`

**Lines causing the bug:**
```tsx
// Line ~106-120 — expects nested shape that doesn't exist
companyProfile: {
  name: settings.companyProfile?.name ?? "",
  ...
}
invoiceNumberSettings: {
  invoicePrefix: settings.invoiceNumberSettings?.invoicePrefix ?? "INV-",
  ...
}
```

But the actual API returns:
```json
{ "companyName": "...", "address": "...", "invoicePrefix": "INV-" }
```

**Root Cause:** The SettingsDrawer was written expecting a UserSettings-shaped response (nested), but the actual API returns a flat Settings-shaped response. The `useSettings` hook maps to the flat shape correctly, but the SettingsDrawer reads fields that don't exist.

**Impact:** Settings drawer loads with empty/default values even though settings are saved correctly. Saving from the drawer overwrites with defaults, effectively **resetting settings to empty**.

**Severity:** Critical

**Suggested Solution:** Rewrite SettingsDrawer to read from the flat API response shape, or change the backend to return the nested shape. The two representations must be reconciled.

---

### 5. CRITICAL: Zod v4 in package.json but v3 API Used

**Why:** Backend `package.json` lists `"zod": "^4.4.3"`, but every schema file uses **Zod v3 syntax**:
- `z.object()`, `z.string()`, `.parse()` — these changed in Zod v4

**File:** `backend/server/package.json` (line with "zod": "^4.4.3")
**Files with v3 syntax:** All files in `backend/server/src/schemas/`

**Root Cause:** The package was updated to v4 but the schema code was never migrated. Zod v4 has a completely different API.

**Impact:** `npm install` will install Zod v4.x, and on startup, every `.parse()` call will fail because the v4 API is different. **The application will not start.**

**Severity:** Critical

**Suggested Solution:** Pin `zod` to `^3.23.8` in `backend/server/package.json`, or migrate all schemas to Zod v4 syntax.

---

### 6. HIGH: Three Copies of convertToWords()

**Why:** The number-to-words conversion function is duplicated **three times** with subtly different behavior:

| Location | Handles Paise? | Suffix |
|----------|----------------|--------|
| `src/utils/formatters.ts` - `numberToWords()` | ✅ Yes | "Rupees ... Paise Only" |
| `src/pages/CreateInvoice.tsx` - `convertToWords()` | ❌ No | "Rupees Only" |
| `src/components/invoice/ProfessionalInvoice.tsx` - `convertToWords()` | ❌ No | "Rupees Only" |

**Files:**
- `src/utils/formatters.ts` (lines ~29-65)
- `src/pages/CreateInvoice.tsx` (lines ~54-94)
- `src/components/invoice/ProfessionalInvoice.tsx` (lines ~1500-1535)

**Root Cause:** Developers were unaware of the existing utility and wrote their own inline versions.

**Impact:** Inconsistent amount-in-words display. The CreateInvoice page and ProfessionalInvoice don't show paise (cents), while the formatters utility does.

**Severity:** High

**Suggested Solution:** Delete the two inline copies and import `numberToWords` from `@/utils/formatters` everywhere. Note: the `formatters.ts` version has different crore/lakh handling than the inline ones — use one canonical version.

---

### 7. HIGH: Invoice Number Field Always Disabled

**Why:** In `InvoiceHeader.tsx`, the `CreatableSearchableSelect` for invoice number has `disabled={true}` hardcoded:

**File:** `src/components/invoice/InvoiceHeader.tsx` (lines ~111-120)
```tsx
<CreatableSearchableSelect
  value={details.invoiceNo}
  options={invoiceNoOptions}
  placeholder="INV-0001"
  disabled={true}  // <-- ALWAYS DISABLED
  onChange={() => { /* no-op */ }}
/>
```

**Root Cause:** During the "snapshot architecture" refactoring, invoice numbers were made immutable after creation. But the field is disabled even during **initial creation**, making it impossible to enter a custom invoice number.

**Impact:** Users cannot manually enter or edit invoice numbers. Only auto-generated numbers work.

**Severity:** High

**Suggested Solution:** Pass `disabled={!editable}` instead of `disabled={true}`, and implement `onChange` to update the details.

---

### 8. HIGH: HSN Code Mismatch (9966 vs 9973)

**Why:** Two different HSN codes are hardcoded in different components:

**File:** `src/pages/CreateInvoice.tsx` → default item has `hsn: "9966"`
**File:** `src/components/invoice/ProfessionalInvoice.tsx` → `const FIXED_HSN = "9973"` and overrides all items to this value

**Root Cause:** Different developers chose different default/service HSN codes.

**Impact:** When an invoice is created, the HSN shows as "9966" in the CreateInvoice page, but when rendered in ProfessionalInvoice, it's forcibly changed to "9973". The two components disagree on the same data.

**Severity:** High

**Suggested Solution:** Remove the forced override in ProfessionalInvoice. Let each item keep its own HSN. Use a configurable default.

---

### 9. HIGH: Missing `days` Field on InvoiceItem Type

**Why:** `ProfessionalInvoice.tsx` uses `item.days` in calculations:
```tsx
const days = item.days || 1;
const amount = rate * quantity * days;
```

But the `InvoiceItem` interface in `src/types/invoice.ts` does NOT have a `days` field.

**File:** `src/components/invoice/ProfessionalInvoice.tsx` (line referencing `item.days`)
**File:** `src/types/invoice.ts` — InvoiceItem interface

**Root Cause:** The days multiplier was added to ProfessionalInvoice's calculations but the TypeScript type was never updated.

**Impact:** TypeScript compilation errors. The `days` value is always coerced to `undefined || 1`, so the multiplier has no effect.

**Severity:** High

**Suggested Solution:** Add `days?: number` to the `InvoiceItem` interface.

---

### 10. HIGH: Hardcoded Bank Details in ProfessionalInvoice

**Why:** ProfessionalInvoice renders bank details as **hardcoded strings** rather than reading from the `company` prop:

**File:** `src/components/invoice/ProfessionalInvoice.tsx` (bank details section):
```tsx
<p><span>Account Name:</span> Rent My Event</p>
<p><span>Bank Name:</span> State Bank of India</p>
<p><span>Account Number:</span> 44853461690</p>
```

**Root Cause:** The developer hardcoded fallback values instead of using the dynamic `company.bankName`, `company.accountNo`, etc. from the `Company` type.

**Impact:** Bank details on the invoice PDF/print always show the fallback values, ignoring whatever the user entered in settings or on the invoice.

**Severity:** High

**Suggested Solution:** Replace hardcoded values with `{company.bankName}`, `{company.accountNo}`, `{company.ifscCode}`, `{company.branchAddress}`, `{company.accountHolderName}`.

---

### 11. HIGH: Discount Calculation Duplication

**Why:** Two completely independent discount calculation implementations exist:

**File:** `src/utils/calculations.ts` — `applyInvoiceDiscountToItems()` and `computeInvoiceDiscount()`
**File:** `src/components/invoice/ProfessionalInvoice.tsx` — local discount calculation with `discountAmount`, `discountedTaxableValue`, `gstAfterDiscount`, `grandTotalAfterDiscount`

**Root Cause:** ProfessionalInvoice was built with its own discount logic instead of importing from calculations.ts.

**Impact:** The two implementations compute GST differently:
- `calculations.ts`: Applies discount to taxable value proportionally across items, then computes GST per-item
- `ProfessionalInvoice.tsx`: Computes discount on total subtotal, then applies blended GST rate

These produce **different numerical results** for the same input.

**Severity:** High

**Suggested Solution:** Use the `applyInvoiceDiscountToItems` from calculations.ts in ProfessionalInvoice. Remove the local discount calculation.

---

### 12. MEDIUM: Unused Components

**The following components are imported nowhere and can be deleted:**

| Component | File | Status |
|-----------|------|--------|
| `BankDetails` | `src/components/invoice/BankDetails.tsx` | 🗑️ Unused |
| `InvoiceFooter` | `src/components/invoice/InvoiceFooter.tsx` | 🗑️ Unused (ViewInvoice imports it but ProfessionalInvoice has own footer) |
| `InvoiceHeader` (old) | `src/components/invoice/InvoiceHeader.tsx` | 🗑️ Used only by ViewInvoice (should be replaced by ProfessionalInvoice) |
| `ItemsTable` (old) | `src/components/invoice/ItemsTable.tsx` | 🗑️ Used only by ViewInvoice |
| `InvoiceSummary` (old) | `src/components/invoice/InvoiceSummary.tsx` | 🗑️ Used only by ViewInvoice (and has broken field names) |
| `PartyDetails` (old) | `src/components/invoice/PartyDetails.tsx` | 🗑️ Used only by ViewInvoice |
| `SettingsDrawer` (empty) | `src/components/SettingsDrawer.tsx` | 🗑️ Empty file |
| `SettingsDrawer/index` | `src/components/SettingsDrawer/index.tsx` | 🗑️ Re-export wrapper |
| `SettingsDrawer.default` | `src/components/settings/SettingsDrawer.default.tsx` | 🗑️ Wrapper component |

**Suggested Solution:** Delete all unused components.

---

### 13. MEDIUM: Overlapping Database Models

**Two separate Mongoose models store overlapping company/settings data:**

| Field | `Settings` model | `UserSettings` model |
|-------|-----------------|---------------------|
| Company name | `companyName` | `companyProfile.name` |
| Address | `address` | `companyProfile.address` |
| GST Number | `gstNumber` | `companyProfile.gstNumber` |
| Invoice prefix | `invoicePrefix` | `invoiceNumberSettings.invoicePrefix` |
| Invoice start number | `invoiceStartNumber` | `invoiceNumberSettings.nextInvoiceNumber` |
| Remarks | `remarks` (array) | `remarks` (array) |
| Bank details | `bankDetails` (embedded) | ❌ Not present |
| `ownerId` | ❌ Not present (single doc) | ✅ Present (user-scoped) |

**Root Cause:** The `UserSettings` model was created during a multi-user refactoring, but the `Settings` model was never migrated or deprecated. Both collections can exist simultaneously with different data.

**Impact:** Settings can be saved to one model but read from the other. The `settingsController` uses the `Settings` model, but the `SettingsDrawer` was designed expecting the `UserSettings` shape.

**Severity:** Medium

**Suggested Solution:** Choose one canonical model. Either:
- (A) Use `Settings` (current controller) — flatten the shape and drop `UserSettings` model
- (B) Use `UserSettings` with `ownerId` — migrate Settings data and update the controller

---

### 14. MEDIUM: ViewInvoice Uses Old Components with Different Data

**Why:** `ViewInvoice.tsx` renders using the old component set:
- `InvoiceHeader` (old — shows different fields than ProfessionalInvoice)
- `PartyDetails` (old — no stateCode, placeOfSupply fields)
- `ItemsTable` (old — shows `qty`/`productId`, not `quantity`/`days`/`srNo`)
- `InvoiceSummary` (old — has **broken field names**)
- `InvoiceFooter` (old — different layout)

While `CreateInvoice.tsx` and `EditInvoice.tsx` render using `ProfessionalInvoice` (new — complete layout).

**Impact:** An invoice viewed immediately after creation looks completely different from the same invoice in create/edit mode. Fields appear/disappear.

**Severity:** Medium

**Suggested Solution:** Make ViewInvoice use `ProfessionalInvoice` with `editable={false}`.

---

### 15. MEDIUM: Title Input in InvoiceHeader Doesn't Update

**Why:** In `InvoiceHeader.tsx`, the invoice title input uses `details.invoiceTitle` but initializes as uncontrolled. The `onChange` calls `onDetailsChange({...details, invoiceTitle: e.target.value})`, but this creates a new object every keystroke, potentially causing **cursor jumping** in input fields.

**File:** `src/components/invoice/InvoiceHeader.tsx` (title input)

**Root Cause:** The parent (`ViewInvoice`, `AdminPortal`) passes `onDetailsChange={() => {}}` as a no-op, so editing the title has no effect in View mode. In Create/Edit mode, the ProfessionalInvoice has its own title input anyway.

**Impact:** In the old ViewInvoice flow, the title input appears editable but changes are discarded.

**Severity:** Medium

---

### 16. MEDIUM: Discount Persistence via Extended Interface Hack

**Why:** `ProfessionalInvoice.tsx` uses a local extended type to add discount fields to InvoiceDetails:
```tsx
interface InvoiceDetailsWithDiscount extends InvoiceDetails {
  discountType?: DiscountType;
  discountValue?: number;
}
```

Discount data is stored by spreading onto InvoiceDetails via `onDetailsChange`. But `InvoiceData` has its own `discount?: InvoiceDiscount` field at the top level.

**Root Cause:** Two competing discount storage mechanisms: one on `details` (via the interface hack) and one on `InvoiceData.discount`. They are never synchronized.

**Impact:** Discount may be stored on one field but read from the other, depending on which save/load code path is executed.

**Severity:** Medium

**Suggested Solution:** Pick ONE representation. Either:
- Store discount on `InvoiceData.discount` (already exists in the type)
- Or add `discountType`/`discountValue` to `InvoiceDetails` properly

---

### 17. MEDIUM: Rate Limiting Too High

**Why:** Backend rate limiting set to 300 requests per 15-minute window.

**File:** `backend/server/src/app.js` (rate limit config)
```js
rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
})
```

**Impact:** 300 requests per 15 minutes = 1 request every 3 seconds. A single user refreshing the admin portal (which fetches invoices + settings + stats) could easily exhaust this. At the same time, it's too permissive for brute-force protection.

**Severity:** Medium

**Suggested Solution:** Lower to 100 requests per 15 minutes for general API, with stricter limits on auth endpoints (e.g., 5 attempts per 15 minutes on login).

---

### 18. MEDIUM: JWT in localStorage (XSS Vulnerable)

**Why:** Token is stored in `localStorage` and read on every request.

**Files:**
- `src/lib/apiClient.ts` — reads from localStorage
- `src/lib/authApi.ts` — writes to localStorage

**Impact:** Any XSS vulnerability gives attackers permanent access to the JWT token. `HttpOnly` cookies would prevent this.

**Severity:** Medium

**Suggested Solution:** Use `httpOnly` cookies for JWT storage. Alternatively, use `sessionStorage` (cleared on tab close) as a partial mitigation.

---

### 19. MEDIUM: No Input Sanitization

**Why:** The report generator in `AdminPortal.tsx` uses `escapeHtml()` to sanitize user inputs before HTML injection, but **no other component sanitizes user input**. Invoice data containing `<script>` tags could execute when rendered in the PDF report or ViewInvoice.

**File (sanitized):** `AdminPortal.tsx` — `escapeHtml()` function
**File (NOT sanitized):** All invoice display components (ProfessionalInvoice, ViewInvoice components)

**Root Cause:** The report generator was identified as XSS-prone and fixed, but the same vulnerability exists in every place invoice data is rendered as HTML (including the ProfessionalInvoice which outputs directly to the DOM).

**Severity:** Medium

**Suggested Solution:** Apply `escapeHtml()` (or React's built-in escaping which handles most cases) consistently across all display components. Since React escapes by default via JSX, this is mainly a concern for the report's raw HTML string.

---

### 20. LOW: Console.log Statements in Production Code

**Files with leftover console.log statements:**
- `src/pages/CreateInvoice.tsx` — `console.log("[CreateInvoice] original documentType:", ...)`
- `src/lib/settingsApi.ts` — `console.log("[consumeNextNumber]", ...)`
- `src/lib/apiClient.ts` — `console.log("[apiFetch]", { method, url })`

**Severity:** Low
**Impact:** Unnecessary log output in browser console, minor performance impact.

---

### 21. LOW: NotFound Uses `<a>` Instead of `<Link>`

**File:** `src/pages/NotFound.tsx`
```tsx
<a href="/" className="text-primary underline hover:text-primary/90">
  Return to Home
</a>
```

**Impact:** Causes full page reload instead of client-side navigation.

**Severity:** Low

---

### 22. LOW: Missing Tailwind Classes

**File:** `src/pages/ViewInvoice.tsx`
```tsx
<div className="invoice-container">
```
The class `invoice-container` is not defined in any CSS file or Tailwind config.

**Severity:** Low

---

### 23. LOW: PROGRESS.md and TODO.md in Production

**Files:**
- `PROGRESS.md`
- `TODO.md`
- `backend/server/TODO.md`

These development tracking files should be removed before release.

**Severity:** Low

---

### 24. Database Issues

#### 24.1 Invoice Schema Stores Objects Without Validation

**File:** `backend/server/src/models/Invoice.js`
```js
details: { type: Object, required: true },
company: { type: Object, required: true },
buyer: { type: Object, required: true },
consignee: { type: Object, required: true },
items: { type: Array, required: true },
```

Every sub-object is stored as a generic `Object` or `Array` with **no schema validation**. Any shape of data can be stored.

**Severity:** Medium

#### 24.2 Missing Index on `ownerId + createdAt`

The current index is only on `ownerId + details.invoiceNo`. The listing queries sort by `savedAt` descending — but there's no index on `{ ownerId: 1, savedAt: -1 }`. With many invoices, this will cause slow queries.

**Severity:** Medium

#### 24.3 Settings Model Has No `ownerId`

The Settings model is a single-document collection with no owner. In a multi-user environment, all users share the same settings.

**Severity:** High

---

### 25. API Issues

#### 25.1 Unused API Endpoints

The following settings endpoints exist but are not called from the frontend:
- `GET /api/settings/next-invoice-number` (backend has `nextInvoiceNumber`)
- `GET /api/settings/next-quotation-number` (backend has `nextQuotationNumber`)
- `PUT /api/settings/remarks` (backend has `updateRemarks`)
- `PUT /api/settings/company` (backend has `updateCompanyProfile`)
- `PUT /api/settings/number-settings` (backend has `updateInvoiceNumberSettings`)
- `GET /api/settings/next-numbers` (backend has `nextDocumentNumbers`)

The frontend only uses `GET /api/settings`, `POST /api/settings`, and `POST /api/settings/consume-number`.

**Severity:** Low

#### 25.2 Swagger Spec Missing Settings Endpoints

The Swagger spec in `backend/server/src/swagger/swaggerSpec.js` documents only auth and invoice endpoints. Settings endpoints are completely undocumented.

**Severity:** Low

---

### 26. Calculation Issues

#### 26.1 CreateInvoice.tsx Uses Rate × Qty Only (No Days Factor)

```tsx
const totals = invoiceData.items.reduce(
  (acc, item) => ({
    totalAmount: acc.totalAmount + item.rate * item.quantity,
    ...
  }),
  { totalAmount: 0, totalTax: 0 }
);
```

But ProfessionalInvoice calculates `amount = rate * quantity * days`. The save function in CreateInvoice doesn't account for the `days` multiplier.

**Severity:** Medium

#### 26.2 CreateInvoice Saves Wrong Totals

In `handleSave`, the totals are recalculated using `rate * quantity` (ignoring discount and days), and these override whatever ProfessionalInvoice displays. The saved `totalAmount` does not match the displayed amount.

**Severity:** High

#### 26.3 Both EditInvoice and CreateInvoice Recalculate Totals Locally

**Why:** Instead of using the calculated values from ProfessionalInvoice (which includes discount, days, GST), both CreateInvoice and EditInvoice recalculate totals from scratch using simplified formulas:

```tsx
// CreateInvoice handleSave
const totals = invoiceData.items.reduce(
  (acc, item) => ({
    totalAmount: acc.totalAmount + item.rate * item.quantity,
    totalTax: acc.totalTax + ((item.rate * item.quantity) * (item.sgstRate + ...)) / 100,
  }),
  { totalAmount: 0, totalTax: 0 }
);
```

This formula uses `rate * quantity` (no days factor), with GST based on `rate * quantity` (not taxable value), and ignores discount entirely.

**Severity:** High

---

### 27. State Management Issues

#### 27.1 React.StrictMode Double-Fetching (CreateInvoice)

CreateInvoice uses `Ref` (`consumedRef`) to prevent double-consuming document numbers in React StrictMode. This is a workaround for the `useEffect` running twice, but it introduces a bug: if the number consumption fails on the first call, it won't retry because `consumedRef.current` is already `true`.

**Severity:** Medium

#### 27.2 InvoiceHeader Loads Number Options on Every Edit

```tsx
useEffect(() => {
  if (editable) run();  // Fetches all existing invoice/quotation numbers
}, [editable]);
```

This runs every time `editable` changes (toggling preview/edit mode). With many invoices, this causes unnecessary API calls.

**Severity:** Low

#### 27.3 AdminPortal Passes `setInvoices: undefined` to useInvoiceOfflineCache

```tsx
useInvoiceOfflineCache({
  setInvoices: undefined,
});
```

The hook checks `if (setInvoices)` which means the entire offline cache hook effectively does nothing on the admin page.

**Severity:** Medium

---

### 28. UI Issues

#### 28.1 All Invoices Show "Paid" Status Badge

In AdminPortal, every invoice gets:
```tsx
<Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
  <CheckCircle className="h-3 w-3 mr-1" />
  Paid
</Badge>
```

There is no actual payment status tracking. All invoices are hardcoded as "Paid".

**Severity:** Low

#### 28.2 "Download" Button Does Not Generate PDF

In AdminPortal dropdown menu:
```tsx
<DropdownMenuItem onClick={() => window.print()}>
  <Download className="h-4 w-4 mr-2" /> Download
</DropdownMenuItem>
```

Clicking "Download" triggers `window.print()` — the same as the "Print" button. It does not actually download a PDF.

**Severity:** Low

---

### 29. Security Issues

#### 29.1 Credentials: False in CORS

```js
credentials: false,
```

With `credentials: false`, the browser will not send cookies even if httpOnly cookie auth is implemented. This prevents switching from localStorage to cookies.

**Severity:** Medium

#### 29.2 No Auth on Settings Endpoints for Single-Tenant

Settings endpoints are protected by `requireAuth`, but the Settings model has no `ownerId`. Any authenticated user can read/modify the single shared settings document.

**Severity:** Medium

#### 29.3 No Rate Limiting on Auth Routes

Auth routes (`/api/auth/login`, `/api/auth/register`) are not separately rate-limited beyond the global 300/15min limit. Brute-force attacks on login are possible.

**Severity:** Medium

---

### 30. Performance Issues

#### 30.1 AdminPortal Renders All Invoices in Memory

The `useInvoiceStorage` hook fetches up to 100 invoices and keeps them all in memory. Filtering, sorting, and searching are done client-side. With 100 invoices this is fine, but beyond 200 it will cause slowdowns.

**Severity:** Low

#### 30.2 Images Stored as Base64 in Company Logo

The logo upload converts images to base64 data URLs. These are stored in:
- Invoice objects (as `company.logo`)
- Settings (as `logo` string)
- localStorage cache

Base64 strings are ~33% larger than binary and inflate the size of every JSON payload.

**Severity:** Low

#### 30.3 `putInvoice` Called Twice on Save

In `handleSave` of both CreateInvoice and EditInvoice:
```tsx
await saveInvoice(invoiceToSave);   // Calls API + refreshes
putInvoice(invoiceToSave);          // Updates local cache
```

But `saveInvoice` → `upsertInvoice` → `refresh()` already updates the cache. The `putInvoice` call is redundant.

**Severity:** Low

---

## UNUSED FILES AND COMPONENTS

| File | Type | Reason |
|------|------|--------|
| `src/components/SettingsDrawer.tsx` | Component | Empty file |
| `src/components/SettingsDrawer/index.tsx` | Re-export | Wrapper for above |
| `src/components/settings/SettingsDrawer.default.tsx` | Component | Wrapper for default export |
| `src/components/invoice/BankDetails.tsx` | Component | Never imported anywhere |
| `src/components/invoice/InvoiceFooter.tsx` | Component | Never imported (footer in ProfessionalInvoice used instead) |
| `src/test/example.test.ts` | Test | Placeholder |
| `src/test/setup.ts` | Test | Test setup |
| `PROGRESS.md` | Doc | Dev tracking |
| `TODO.md` | Doc | Dev tracking |
| `backend/server/TODO.md` | Doc | Dev tracking |

---

## DUPLICATE CODE

| Code | Locations | Count |
|------|-----------|-------|
| `convertToWords`/`numberToWords` | `formatters.ts`, `CreateInvoice.tsx`, `ProfessionalInvoice.tsx` | 3 |
| Discount calculation logic | `calculations.ts`, `ProfessionalInvoice.tsx` | 2 |
| Settings model | `Settings.js`, `UserSettings.js` | 2 |
| Invoice number generation | `calculations.ts` (generateInvoiceNumber), backend controller `formatThreeDigitSuffix` | 2 |
| Default company/fallback data | `settingsController.js`, `CreateInvoice.tsx`, `EditInvoice.tsx` | 3 |

---

## PRIORITY FIX ORDER

| Priority | Task | Est. Time | Risk |
|----------|------|-----------|------|
| **P0** | Pin Zod to v3.x in backend package.json | 5 min | 🔴 App won't start without this |
| **P0** | Fix SettingsDrawer to read correct data shape | 2 hrs | 🔴 Settings silently reset |
| **P0** | Delete duplicate SettingsDrawer files | 15 min | 🔴 Import resolution chaos |
| **P1** | Fix InvoiceSummary field names (totalQty → computed, taxableAmount → taxableValue) | 15 min | 🟠 Broken summary display |
| **P1** | Standardize on ProfessionalInvoice for all views (delete old ViewInvoice components) | 3 hrs | 🟠 Two competing UIs |
| **P1** | Add `days` field to InvoiceItem type | 5 min | 🟠 TS compilation error |
| **P1** | Fix CreateInvoice save to use ProfessionalInvoice's calculated totals | 1 hr | 🟠 Wrong totals saved |
| **P2** | Delete duplicate convertToWords, import from formatters.ts | 30 min | 🟡 Inconsistent output |
| **P2** | Fix ProfessionalInvoice bank details to read from company prop | 30 min | 🟡 Hardcoded values |
| **P2** | Unify discount calculation to use calculations.ts | 1 hr | 🟡 Two different results |
| **P2** | Fix InvoiceHeader disabled prop for invoice number | 15 min | 🟡 Can't edit number |
| **P2** | Remove forced HSN override in ProfessionalInvoice | 5 min | 🟡 Wrong HSN on save |
| **P3** | Choose one Settings model and migrate | 2 hrs | 🟢 Technical debt |
| **P3** | Add createdAt index to Invoice schema | 5 min | 🟢 Performance |
| **P3** | Remove console.log statements | 10 min | 🟢 Clean code |
| **P3** | Remove PROGRESS.md, TODO.md | 5 min | 🟢 Clean up |

---

## ESTIMATED FIX TIME

| Category | Time |
|----------|------|
| P0 (App-breaking) | ~3 hours |
| P1 (Major bugs) | ~5 hours |
| P2 (Minor bugs) | ~3 hours |
| P3 (Tech debt) | ~3 hours |
| **Total** | **~14 hours** |

---

## RISK ANALYSIS

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss from Settings reset | High | High | Fix SettingsDrawer data mapping first |
| App not starting (Zod v4) | Certain | High | Pin Zod to v3 immediately |
| Saved totals don't match display | High | Medium | Fix CreateInvoice save logic |
| Invoice printed with wrong bank details | High | Low | Replace hardcoded values |
| Conflict between Settings/UserSettings models | Medium | Medium | Migrate to single model |
| Production console.log exposure | Low | Low | Remove before deploy |

---

## CONCLUSION

This codebase is **mid-refactoring**. An older architecture (flat Settings, ItemsTable-based view, generateInvoiceNumber utility) is partially replaced by a newer architecture (nested UserSettings, ProfessionalInvoice view, server-side number allocation). The two coexist, causing conflicts everywhere.

The single highest-impact fix is **consolidating the rendering pipeline** — delete all the old ViewInvoice components and use ProfessionalInvoice everywhere. Second is **reconciling the Settings data shape** between frontend expectations and backend reality.

Every issue here is fixable, but requires a systematic approach: pick one canonical path for each concern (rendering, settings, calculations, types) and delete the legacy path completely. Partial refactoring is worse than no refactoring — and that's exactly what this codebase demonstrates.

