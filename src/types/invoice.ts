// export interface CompanyDetails {
//   name: string;
//   address: string;
//   gstin: string;
//   state: string;
//   stateCode: string;
// }

// export interface PartyDetails {
//   name: string;
//   address: string;
//   gstin: string;
//   state: string;
// }

// export interface InvoiceDetails {
//   invoiceNo: string;
//   date: Date;
//   deliveryNote: string;
//   paymentTerms: string;
//   referenceNo: string;
//   referenceDate: string;
//   otherReferences: string;
//   buyerOrderNo: string;
//   buyerOrderDate: string;
//   dispatchDocNo: string;
//   deliveryNoteDate: string;
//   dispatchedThrough: string;
//   destination: string;
//   termsOfDelivery: string;
// }

// export interface InvoiceItem {
//   id: string;
//   productId: string;
//   description: string;
//   hsn: string;
//   rate: number;
//   qty: number;
//   gstPercent: number;
// }

// export interface InvoiceData {
//   company: CompanyDetails;
//   consignee: PartyDetails;
//   buyer: PartyDetails;
//   details: InvoiceDetails;
//   items: InvoiceItem[];
//   remarks: string;
// }





export interface Company {
  name: string;
  address: string;
  gstin: string;
  state: string;
  stateCode: string;
  // Bank Details
  bankName: string;
  accountNo: string;
  ifscCode: string;
  branchAddress: string;
  accountHolderName: string;
  // Contact Details
  mobile?: string;
  email?: string;
}

export interface Party {
  name: string;
  address: string;
  gstin: string;
  state: string;
  stateCode?: string;
  placeOfSupply?: string;
}

export interface InvoiceDetails {
  invoiceNo: string;
  date: Date;
  dueDate?: Date;
  deliveryNote: string;
  modeOfPayment: string;
  supplierRef: string;
  otherReferences: string;
  buyerOrderNo: string;
  buyerOrderDate: string;
  despatchDocNo: string;
  deliveryNoteDate: string;
  despatchThrough: string;
  destination: string;
  termsOfDelivery: string;
  ewayBillNo?: string;
}

export interface InvoiceItem {
  id: string;
  srNo: number;
  description: string;
  hsn: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  discount: number;
  taxableValue: number;
  sgstRate: number;
  sgstAmount: number;
  cgstRate: number;
  cgstAmount: number;
  igstRate: number;
  igstAmount: number;
  total: number;
}

export interface InvoiceData {
  company: Company;
  consignee: Party;
  buyer: Party;
  details: InvoiceDetails;
  items: InvoiceItem[];
  remarks: string;
  totalAmount: number;
  totalTax: number;
  totalAmountInWords: string;
}


