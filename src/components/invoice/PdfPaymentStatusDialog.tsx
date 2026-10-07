// import { useEffect, useState } from "react";
// import type { InvoiceData } from "@/types/invoice";
// import { Button } from "@/components/ui/button";
// import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { Label } from "@/components/ui/label";
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// import { toast } from "sonner";

// export type PdfPaymentStatus = "paid" | "unpaid";

// type PdfPaymentStatusDialogProps = {
//   open: boolean;
//   invoice: InvoiceData;
//   onOpenChange: (open: boolean) => void;
//   onConfirm: (status: PdfPaymentStatus) => Promise<void>;
// };

// export function PdfPaymentStatusDialog({
//   open,
//   invoice,
//   onOpenChange,
//   onConfirm,
// }: PdfPaymentStatusDialogProps) {
//   const [status, setStatus] = useState<PdfPaymentStatus | null>(null);
//   const [isSaving, setIsSaving] = useState(false);

//   useEffect(() => {
//     if (open) setStatus(null);
//   }, [open]);

//   const handleConfirm = async () => {
//     if (!status) return;
//     setIsSaving(true);
//     try {
//       await onConfirm(status);
//       onOpenChange(false);
//     } catch (error) {
//       toast.error(error instanceof Error ? error.message : "Could not save payment status.");
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const documentNumber = invoice.details.invoiceNo || invoice.details.quotationNo || "New document";

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="sm:max-w-md">
//         <DialogHeader>
//           <DialogTitle>Payment status for PDF</DialogTitle>
//           <DialogDescription>
//             Choose the payment status for {documentNumber}. The choice is saved with the invoice before printing.
//           </DialogDescription>
//         </DialogHeader>
//         <RadioGroup
//           value={status}
//           onValueChange={(value) => setStatus(value as PdfPaymentStatus)}
//           className="grid grid-cols-2 gap-3"
//         >
//           <Label
//             htmlFor="pdf-status-paid"
//             className="flex cursor-pointer items-center gap-3 rounded-md border p-4 hover:bg-muted/50"
//           >
//             <RadioGroupItem id="pdf-status-paid" value="paid" />
//             <span>
//               <span className="block font-semibold">Paid</span>
//               <span className="block text-xs text-muted-foreground">Payment received</span>
//             </span>
//           </Label>
//           <Label
//             htmlFor="pdf-status-unpaid"
//             className="flex cursor-pointer items-center gap-3 rounded-md border p-4 hover:bg-muted/50"
//           >
//             <RadioGroupItem id="pdf-status-unpaid" value="unpaid" />
//             <span>
//               <span className="block font-semibold">Unpaid</span>
//               <span className="block text-xs text-muted-foreground">Payment pending</span>
//             </span>
//           </Label>
//         </RadioGroup>
//         <DialogFooter>
//           <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
//             Cancel
//           </Button>
//           <Button onClick={handleConfirm} disabled={isSaving || status === null}>
//             {isSaving ? "Saving..." : "Save status and print PDF"}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }