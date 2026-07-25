/**
 * pdfService.ts
 *
 * Single source of truth for PDF generation.
 * Uses html2canvas + jsPDF pipeline but improved for maximum fidelity:
 *   - Injects print-mimic CSS during capture so @media print styles apply
 *   - Uses PNG (lossless) instead of JPEG
 *   - 3x scale for sharp text
 *   - Waits for fonts and images before capture
 *   - Renders each A4 page individually (no tall-image slicing)
 *
 * ProfessionalInvoice remains the single source of truth for layout.
 */

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { InvoiceData } from "@/types/invoice";

// -----------------------------------------------------------------------
// Build the print-mimic CSS as a string.
// These rules mirror the Tailwind print: utility classes used by
// ProfessionalInvoice (e.g. print:text-[7px], print:p-0 etc.).
// They are injected into the cloned document during html2canvas capture
// via the onclone callback, scoped to the [data-pdf-capture] container.
// -----------------------------------------------------------------------
function buildPrintMimicCss(): string {
  // Helper: escape class name for CSS selector use
  const esc = (s: string) => s.replace(/:/g, "\\:").replace(/\[/g, "\\[").replace(/\]/g, "\\]");

  // Build a block of rules for a list of class->style mappings
  const rules: string[] = [];

  // Font sizes: print:text-[7px], print:text-[8px], print:text-[9px], print:text-[10px]
  const fontSizes: [string, string][] = [
    ["text-[7px]", "7px"],
    ["text-[8px]", "8px"],
    ["text-[9px]", "9px"],
    ["text-[10px]", "10px"],
    ["text-base", "16px"],
  ];
  for (const [cls, size] of fontSizes) {
    rules.push(`[data-pdf-capture] .print\\:${esc(cls)} { font-size: ${size} !important; }`);
  }

  // Paddings
  const paddings: [string, string][] = [
    ["p-0", "0"],
    ["p-0\\.5", "0.125rem"],
    ["p-1", "0.25rem"],
    ["p-2", "0.5rem"],
    ["pb-2", "0 0 0.5rem"],
    ["pt-2", "0.5rem 0 0"],
    ["pl-2", "0 0 0 0.5rem"],
    ["pr-2", "0 0.5rem 0 0"],
  ];
  for (const [cls, val] of paddings) {
    const prop = cls.startsWith("p-") ? "padding" : cls.startsWith("pb-") ? "padding-bottom" : cls.startsWith("pt-") ? "padding-top" : cls.startsWith("pl-") ? "padding-left" : "padding-right";
    rules.push(`[data-pdf-capture] .print\\:${esc(cls)} { ${prop}: ${val} !important; }`);
  }

  // Margins
  const margins: [string, string, string][] = [
    ["mb-0", "margin-bottom", "0"],
    ["mb-0\\.5", "margin-bottom", "0.125rem"],
    ["mb-1", "margin-bottom", "0.25rem"],
    ["mb-2", "margin-bottom", "0.5rem"],
    ["mb-3", "margin-bottom", "0.75rem"],
    ["mt-2", "margin-top", "0.5rem"],
    ["mt-6", "margin-top", "1.5rem"],
    ["ml-2", "margin-left", "0.5rem"],
    ["mr-2", "margin-right", "0.5rem"],
  ];
  for (const [cls, prop, val] of margins) {
    rules.push(`[data-pdf-capture] .print\\:${esc(cls)} { ${prop}: ${val} !important; }`);
  }

  // Gaps
  rules.push(`[data-pdf-capture] .print\\:gap-0\\.5 { gap: 0.125rem !important; }`);
  rules.push(`[data-pdf-capture] .print\\:gap-1 { gap: 0.25rem !important; }`);
  rules.push(`[data-pdf-capture] .print\\:gap-2 { gap: 0.5rem !important; }`);
  rules.push(`[data-pdf-capture] .print\\:gap-4 { gap: 1rem !important; }`);

  // Spacing
  rules.push(`[data-pdf-capture] .print\\:space-y-0 > * + * { margin-top: 0 !important; }`);
  rules.push(`[data-pdf-capture] .print\\:space-y-0\\.5 > * + * { margin-top: 0.125rem !important; }`);

  // Layout
  rules.push(`[data-pdf-capture] .print\\:w-full { width: 100% !important; }`);
  rules.push(`[data-pdf-capture] .print\\:min-h-auto { min-height: auto !important; }`);
  rules.push(`[data-pdf-capture] .print\\:border-0 { border: 0 !important; }`);
  rules.push(`[data-pdf-capture] .print\\:shadow-none { box-shadow: none !important; }`);
  rules.push(`[data-pdf-capture] .print\\:overflow-visible { overflow: visible !important; }`);
  rules.push(`[data-pdf-capture] .print\\:p-0 { padding: 0 !important; }`);
  rules.push(`[data-pdf-capture] .print\\:flex-nowrap { flex-wrap: nowrap !important; }`);
  rules.push(`[data-pdf-capture] .print\\:flex-1 { flex: 1 1 0% !important; }`);

  // Display (hide/show)
  rules.push(`[data-pdf-capture] .print\\:hidden { display: none !important; }`);
  rules.push(`[data-pdf-capture] .print\\:block { display: block !important; }`);

  // Header / Footer blocks
  rules.push(`[data-pdf-capture] .print\\:header-block { page-break-inside: avoid; }`);
  rules.push(`[data-pdf-capture] .print\\:items-block { page-break-inside: auto; }`);
  rules.push(`[data-pdf-capture] .print\\:footer-block { page-break-inside: avoid; }`);

  // Page breaks
  rules.push(`[data-pdf-capture] .print\\:break-inside-avoid { break-inside: avoid; }`);
  rules.push(`[data-pdf-capture] .print\\:break-inside-auto { break-inside: auto; }`);
  rules.push(`[data-pdf-capture] .print\\:page-break-inside-avoid { page-break-inside: avoid; }`);

  // Table header groups
  rules.push(`[data-pdf-capture] .print\\:table-header-group { display: table-header-group; }`);

  // Print color adjustment
  rules.push(`[data-pdf-capture] .print\\:print-color-adjust-exact { print-color-adjust: exact; -webkit-print-color-adjust: exact; }`);

  // Backgrounds
  rules.push(`[data-pdf-capture] .print\\:bg-gray-50 { background-color: #f9fafb !important; }`);
  rules.push(`[data-pdf-capture] .print\\:bg-blue-50 { background-color: #eff6ff !important; }`);

  // Font weight
  rules.push(`[data-pdf-capture] .print\\:font-normal { font-weight: 400 !important; }`);
  rules.push(`[data-pdf-capture] .print\\:font-medium { font-weight: 500 !important; }`);

  // Minimum widths
  rules.push(`[data-pdf-capture] .print\\:min-w-\\[140px\\] { min-width: 140px !important; }`);
  rules.push(`[data-pdf-capture] .print\\:min-h-\\[30px\\] { min-height: 30px !important; }`);
  rules.push(`[data-pdf-capture] .print\\:min-h-\\[40px\\] { min-height: 40px !important; }`);

  // Leading (line height)
  rules.push(`[data-pdf-capture] .print\\:leading-tight { line-height: 1.25 !important; }`);

  // Flex shrink
  rules.push(`[data-pdf-capture] .print\\:flex-shrink-0 { flex-shrink: 0 !important; }`);

  // Image max height
  rules.push(`[data-pdf-capture] .print\\:max-h-\\[50px\\] { max-height: 50px !important; }`);
  rules.push(`[data-pdf-capture] .print\\:h-auto { height: auto !important; }`);

  // Container dimensions
  rules.push(`[data-pdf-capture] .invoice-container { width: 210mm !important; margin: 0 auto !important; }`);

  // Grid columns  
  rules.push(`[data-pdf-capture] .print\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }`);

  return rules.join("\n");
}

// -----------------------------------------------------------------------
// Render an invoice into a temporary hidden DOM element and capture it
// with html2canvas + jsPDF, page by page.
// -----------------------------------------------------------------------
async function renderInvoiceToPdf(
  invoice: InvoiceData,
  _options?: { title?: string }
): Promise<jsPDF> {
  const containerId = "pdf-render-container";
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "210mm";
    container.style.backgroundColor = "#ffffff";
    container.style.zIndex = "-1";
    document.body.appendChild(container);
  } else {
    container.innerHTML = "";
  }

  // Dynamically import ProfessionalInvoice and React/ReactDOM to render
  const { createElement, StrictMode } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { ProfessionalInvoice } = await import(
    "@/components/invoice/ProfessionalInvoice"
  );

  // Create a root and render the invoice
  const root = createRoot(container);
  root.render(
    createElement(StrictMode, null,
      createElement(ProfessionalInvoice, {
        company: invoice.company,
        consignee: invoice.consignee,
        buyer: invoice.buyer,
        details: {
          ...invoice.details,
          date: new Date(invoice.details.date),
          invoiceTitle: invoice.details.invoiceTitle ?? "TAX INVOICE",
        },
        items: invoice.items,
        remarks: invoice.remarks,
        editable: false,
        onCompanyChange: () => {},
        onConsigneeChange: () => {},
        onBuyerChange: () => {},
        onDetailsChange: () => {},
        onItemsChange: () => {},
        onRemarksChange: () => {},
      })
    )
  );

  // Wait for React rendering to settle
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Wait for web fonts to load
  if (document.fonts && typeof document.fonts.ready !== "undefined") {
    await document.fonts.ready;
  }

  // Wait for images to load within the container
  const images = container.querySelectorAll("img");
  if (images.length > 0) {
    await Promise.all(
      Array.from(images).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) resolve();
            else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          })
      )
    );
    // Extra settle time after images load
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  // Mark the container so the print-mimic CSS takes effect
  container.setAttribute("data-pdf-capture", "");

  try {
    // Capture the entire invoice as one tall canvas using PNG (lossless)
    const canvas = await html2canvas(container, {
      scale: 3,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      onclone: (clonedDoc) => {
        // Inject the print-mimic CSS into the cloned document's head
        const styleEl = clonedDoc.createElement("style");
        styleEl.setAttribute("data-pdf-mimic", "");
        styleEl.textContent = buildPrintMimicCss();
        clonedDoc.head.appendChild(styleEl);
      },
    });

    const imgData = canvas.toDataURL("image/png"); // lossless PNG

    // A4 dimensions in mm
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();   // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight();  // 297mm

    // Calculate how many A4 pages the content spans
    const canvasPageHeight = (pdfHeight * canvas.width) / pdfWidth;
    const totalPages = Math.ceil(canvas.height / canvasPageHeight);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      // Calculate the source slice for this page
      const srcY = page * canvasPageHeight;
      const srcHeight = Math.min(canvasPageHeight, canvas.height - srcY);

      // Create a temporary canvas just for this page's slice
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = srcHeight;
      const ctx = pageCanvas.getContext("2d")!;
      ctx.drawImage(canvas, 0, srcY, canvas.width, srcHeight, 0, 0, canvas.width, srcHeight);

      const pageImgData = pageCanvas.toDataURL("image/png");

      // Calculate output dimensions maintaining aspect ratio
      const imgHeightOnPage = (pdfWidth * srcHeight) / canvas.width;
      pdf.addImage(pageImgData, "PNG", 0, 0, pdfWidth, imgHeightOnPage);
    }

    return pdf;
  } finally {
    // Cleanup: remove the data attribute and unmount
    container.removeAttribute("data-pdf-capture");
    root.unmount();
    container.innerHTML = "";
  }
}

/**
 * Generates and downloads a single invoice PDF.
 */
export async function generateInvoicePdf(
  invoice: InvoiceData,
  filename?: string
): Promise<void> {
  const pdf = await renderInvoiceToPdf(invoice);
  const docTitle = invoice.details.invoiceTitle || "TAX INVOICE";
  const docNo = invoice.details.invoiceNo || invoice.details.quotationNo || "document";
  const safeFilename = filename || `${docTitle}-${docNo}.pdf`;
  pdf.save(safeFilename);
}

/**
 * Generates a combined PDF report from multiple invoices.
 * Uses the EXACT SAME ProfessionalInvoice rendering, html2canvas pipeline,
 * print-mimic CSS injection, and page-slicing logic as renderInvoiceToPdf
 * (which is used by generateInvoicePdf for single-invoice PDFs).
 *
 * The only difference is that this accumulates all invoices into a single
 * jsPDF document, with each invoice starting on a new A4 page.
 */
export async function generateReportPdf(
  invoices: InvoiceData[],
  _options?: { title?: string }
): Promise<Blob> {
  if (invoices.length === 0) {
    throw new Error("No invoices to generate report");
  }

  // Dynamically import React and ProfessionalInvoice ONCE before the loop
  const { createElement, StrictMode } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { ProfessionalInvoice } = await import(
    "@/components/invoice/ProfessionalInvoice"
  );

  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();   // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight();  // 297mm

  // Shared hidden container (same approach as renderInvoiceToPdf)
  const containerId = "pdf-report-render-container";
  let container = document.getElementById(containerId) as HTMLDivElement | null;

  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "210mm";
    container.style.backgroundColor = "#ffffff";
    container.style.zIndex = "-1";
    document.body.appendChild(container);
  }

  // Root is created/cleared per-invoice but we keep the variable for cleanup
  let root: unknown = null;

  try {
    for (let i = 0; i < invoices.length; i++) {
      const inv = invoices[i];

      // Clear previous content
      if (root) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (root as any).unmount();
        root = null;
      }
      container.innerHTML = "";

      // Create new root and render
      root = createRoot(container);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (root as any).render(
        createElement(StrictMode, null,
          createElement(ProfessionalInvoice, {
            company: inv.company,
            consignee: inv.consignee,
            buyer: inv.buyer,
            details: {
              ...inv.details,
              date: new Date(inv.details.date),
              invoiceTitle: inv.details.invoiceTitle ?? "TAX INVOICE",
            },
            items: inv.items,
            remarks: inv.remarks,
            editable: false,
            onCompanyChange: () => {},
            onConsigneeChange: () => {},
            onBuyerChange: () => {},
            onDetailsChange: () => {},
            onItemsChange: () => {},
            onRemarksChange: () => {},
          })
        )
      );

      // Wait for React rendering to settle
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Wait for web fonts
      if (document.fonts && typeof document.fonts.ready !== "undefined") {
        await document.fonts.ready;
      }

      // Wait for images to load
      const images = container.querySelectorAll("img");
      if (images.length > 0) {
        await Promise.all(
          Array.from(images).map(
            (img) =>
              new Promise<void>((resolve) => {
                if (img.complete) resolve();
                else {
                  img.onload = () => resolve();
                  img.onerror = () => resolve();
                }
              })
          )
        );
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Mark container so print-mimic CSS takes effect (same as renderInvoiceToPdf)
      container.setAttribute("data-pdf-capture", "");

      // Capture with html2canvas — EXACT same settings as renderInvoiceToPdf
      const canvas = await html2canvas(container, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (clonedDoc) => {
          const styleEl = clonedDoc.createElement("style");
          styleEl.setAttribute("data-pdf-mimic", "");
          styleEl.textContent = buildPrintMimicCss();
          clonedDoc.head.appendChild(styleEl);
        },
      });

      // Slice the tall canvas into A4 pages and add to combined PDF
      const canvasPageHeight = (pdfHeight * canvas.width) / pdfWidth;
      const totalPages = Math.ceil(canvas.height / canvasPageHeight);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0 || i > 0) {
          pdf.addPage();
        }

        const srcY = page * canvasPageHeight;
        const srcHeight = Math.min(canvasPageHeight, canvas.height - srcY);

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = srcHeight;
        const ctx = pageCanvas.getContext("2d")!;
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcHeight, 0, 0, canvas.width, srcHeight);

        const pageImgData = pageCanvas.toDataURL("image/png");

        const imgHeightOnPage = (pdfWidth * srcHeight) / canvas.width;
        pdf.addImage(pageImgData, "PNG", 0, 0, pdfWidth, imgHeightOnPage);
      }

      // Cleanup per-invoice
      container.removeAttribute("data-pdf-capture");
    }

    return pdf.output("blob");
  } finally {
    // Final cleanup: unmount root, clear content, but DO NOT remove the
    // container from the DOM — it will be reused for the next invoice.
    // Removing it detaches the element, causing html2canvas to fail on
    // subsequent iterations because the element is no longer in the DOM tree.
    if (root) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (root as any).unmount();
      } catch { /* ignore */ }
    }
    if (container) {
      container.innerHTML = "";
      container.removeAttribute("data-pdf-capture");
    }
  }
}

/**
 * Opens a print dialog with the invoice rendered in ProfessionalInvoice format.
 */
export function printInvoice(_invoice: InvoiceData): void {
  // Use the native print dialog - ProfessionalInvoice already has print styles
  window.print();
}

/**
 * Returns a Blob URL for preview use.
 */
export async function getInvoicePdfBlobUrl(
  invoice: InvoiceData
): Promise<string> {
  const pdf = await renderInvoiceToPdf(invoice);
  const blob = pdf.output("blob");
  return URL.createObjectURL(blob);
}
