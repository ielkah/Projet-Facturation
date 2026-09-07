import { Invoice } from '../types/invoice';

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: '1',
    number: 'FAC-2026-104',
    clientName: 'Maison Vauréal SARL',
    clientEmail: 'compta@vaureal-luxe.fr',
    clientAddress: '12 Place Vendôme, 75001 Paris',
    projectTitle: 'Refonte identité visuelle — Solde (40%)',
    issueDate: '2026-08-10',
    dueDate: '2026-09-10',
    status: 'paid',
    taxRate: 20,
    discountPercent: 0,
    items: [
      { id: 'it-1', description: 'Direction artistique & déclinaisons print', quantity: 1, unitPrice: 6400 }
    ]
  },
  {
    id: '2',
    number: 'FAC-2026-105',
    clientName: 'TechVenture SAS',
    clientEmail: 'finance@techventure.io',
    clientAddress: '45 Rue de la Bourse, 69002 Lyon',
    projectTitle: 'Campagne Ads Q3 — Régie mensuelle',
    issueDate: '2026-08-25',
    dueDate: '2026-09-25',
    status: 'pending',
    taxRate: 20,
    discountPercent: 0,
    items: [
      { id: 'it-2', description: 'Expert Acquisition & Tracking (TJM)', quantity: 8, unitPrice: 700 }
    ]
  },
  {
    id: '3',
    number: 'FAC-2026-106',
    clientName: 'Studio Belleville',
    clientEmail: 'contact@bellevillestudio.com',
    clientAddress: '8 Passage Piver, 75011 Paris',
    projectTitle: 'Acompte cadrage UX/UI (30%)',
    issueDate: '2026-08-01',
    dueDate: '2026-08-31',
    status: 'overdue',
    taxRate: 20,
    discountPercent: 5,
    items: [
      { id: 'it-3', description: 'Ateliers de design sprint & wireframing', quantity: 1, unitPrice: 2250 }
    ]
  }
];