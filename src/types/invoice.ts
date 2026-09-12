export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue';
export type InvoiceType = 'invoice' | 'credit_note';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  number: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  clientLegalForm?: string; 
  clientSiren?: string;   
  clientVatNumber?: string; 
  invoiceType?: InvoiceType;
  originalInvoiceId?: string; 
  issuedAt?: string;
  projectTitle: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  taxRate: number;
  discountPercent: number;
  items: InvoiceItem[];
}