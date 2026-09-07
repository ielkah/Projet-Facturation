import React from 'react';
import { Invoice } from '../types/invoice';
interface Props {
  invoice: Invoice;
}

export default function InvoiceDocument({ invoice }: Props) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);

  const subtotalHT = invoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const discountAmount = (subtotalHT * invoice.discountPercent) / 100;
  const netHT = subtotalHT - discountAmount;
  const totalTax = (netHT * invoice.taxRate) / 100;
  const totalTTC = netHT + totalTax;

  return (
    <div className="bg-white text-slate-900 p-8 md:p-12 rounded-xl shadow-2xl border border-slate-200 text-xs font-sans max-w-2xl mx-auto flex flex-col justify-between min-h-[750px]">
      <div>
        <div className="flex justify-between items-start border-b border-slate-100 pb-8 mb-8">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-950">STUDIO NOVALIS</h2>
            <p className="text-slate-500 mt-1">Agence Conseil & Design Web</p>
            <p className="text-slate-400">SIREN : 894 120 456 — RCS Paris</p>
          </div>
          <div className="text-right">
            <span className="text-indigo-600 font-bold uppercase tracking-widest text-[10px] block">Facture Pro</span>
            <div className="text-lg font-mono font-bold text-slate-900">{invoice.number}</div>
            <p className="text-slate-500 mt-1">Date : {invoice.issueDate}</p>
            <p className="text-slate-500">Échéance : {invoice.dueDate}</p>
          </div>
        </div>

        <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-100 max-w-xs ml-auto">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Facturé à :</span>
          <p className="font-bold text-slate-900">{invoice.clientName || 'Nom du client'}</p>
          <p className="text-slate-600">{invoice.clientEmail}</p>
          <p className="text-slate-500 whitespace-pre-line">{invoice.clientAddress}</p>
        </div>

        <div className="mb-6">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Objet du projet :</span>
          <p className="font-semibold text-slate-800 text-sm">{invoice.projectTitle || 'Prestations de services'}</p>
        </div>

        <table className="w-full text-left mb-8 border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
              <th className="py-2">Description</th>
              <th className="py-2 text-center w-16">Qté / Jours</th>
              <th className="py-2 text-right w-24">P.U. HT</th>
              <th className="py-2 text-right w-28">Total HT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td className="py-3 font-medium text-slate-800">{item.description || 'Ligne vide'}</td>
                <td className="py-3 text-center text-slate-600">{item.quantity}</td>
                <td className="py-3 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                <td className="py-3 text-right font-semibold text-slate-900">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2 border-t border-slate-200 pt-4">
            <div className="flex justify-between text-slate-600">
              <span>Sous-total HT :</span>
              <span>{formatCurrency(subtotalHT)}</span>
            </div>
            {invoice.discountPercent > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Remise ({invoice.discountPercent}%) :</span>
                <span>- {formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>TVA ({invoice.taxRate}%) :</span>
              <span>{formatCurrency(totalTax)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-950 text-sm border-t border-slate-200 pt-2">
              <span>Total TTC :</span>
              <span className="text-indigo-600">{formatCurrency(totalTTC)}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 text-[9px] text-slate-400 space-y-1">
          <p>Paiement par virement bancaire sous 30 jours nets. IBAN : FR76 3000 4000 5000 6000 7000 890.</p>
          <p>En cas de retard, indemnité forfaitaire pour frais de recouvrement : 40 € (art. D.441-5 C. com) et pénalités de retard au taux légal en vigueur.</p>
        </div>
      </div>
    </div>
  );
}