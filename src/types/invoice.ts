export type InvoiceStatus = 'paid' | 'pending' | 'overdue';

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
  projectTitle: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  taxRate: number;
  discountPercent: number;
  items: InvoiceItem[];
}