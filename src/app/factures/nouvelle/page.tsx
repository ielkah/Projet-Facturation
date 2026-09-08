"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Printer, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import InvoiceDocument from '../../../components/InvoiceDocument';
import { Invoice, InvoiceItem } from '../../../types/invoice';

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [invoice, setInvoice] = useState<Invoice>({
    id: `inv-${Date.now()}`,
    number: `FAC-2026-${Math.floor(100 + Math.random() * 900)}`,
    clientName: 'Atelier Monochrome',
    clientEmail: 'hello@monochrome.design',
    clientAddress: '24 rue Châteaudun, 75009 Paris',
    projectTitle: 'Refonte CMS Headless & Direction Artistique',
    issueDate: '2026-09-08',
    dueDate: '2026-10-08',
    status: 'pending',
    taxRate: 20,
    discountPercent: 0,
    items: [
      { id: '1', description: 'Sprint Conception UI (5j)', quantity: 5, unitPrice: 650 },
      { id: '2', description: 'Développement Next.js & intégration', quantity: 1, unitPrice: 2800 }
    ]
  });

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(),
      description: 'Nouvelle prestation',
      quantity: 1,
      unitPrice: 500
    };
    setInvoice({ ...invoice, items: [...invoice.items, newItem] });
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setInvoice({
      ...invoice,
      items: invoice.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    });
  };

  const removeItem = (id: string) => {
    setInvoice({ ...invoice, items: invoice.items.filter(item => item.id !== id) });
  };

  const handleSaveInvoice = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Récupération de l'utilisateur actif
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        alert("Session expirée ou utilisateur non connecté. Veuillez vous reconnecter.");
        router.push('/login');
        return;
      }

      // 2. Payload avec association user_id
      const payload = {
        id: `inv-${Date.now()}`,
        number: invoice.number,
        client_name: invoice.clientName,
        client_email: invoice.clientEmail,
        client_address: invoice.clientAddress,
        project_title: invoice.projectTitle,
        issue_date: invoice.issueDate,
        due_date: invoice.dueDate,
        status: invoice.status,
        tax_rate: invoice.taxRate,
        discount_percent: invoice.discountPercent,
        items: invoice.items,
        user_id: user.id // Liaison au compte connecté
      };

      const { error } = await supabase.from('invoices').insert([payload]);

      if (error) {
        alert(`Erreur Supabase : ${error.message}`);
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Une erreur inattendue est survenue.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-900">
          <Link 
            href="/dashboard"
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Revenir au tableau de bord
          </Link>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl border border-slate-800 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
            >
              <Printer size={14} /> Imprimer / PDF
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSaveInvoice}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
            >
              <Check size={14} /> {loading ? 'Envoi...' : 'Émettre la facture'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-indigo-400">Détails de facturation</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">N° Facture</label>
                <input
                  type="text"
                  value={invoice.number}
                  onChange={(e) => setInvoice({ ...invoice, number: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Échéance</label>
                <input
                  type="date"
                  value={invoice.dueDate}
                  onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Client (Nom commercial)</label>
                <input
                  type="text"
                  value={invoice.clientName}
                  onChange={(e) => setInvoice({ ...invoice, clientName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Email client</label>
                  <input
                    type="email"
                    value={invoice.clientEmail || ''}
                    onChange={(e) => setInvoice({ ...invoice, clientEmail: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 outline-none"
                    placeholder="contact@client.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Adresse client</label>
                  <input
                    type="text"
                    value={invoice.clientAddress || ''}
                    onChange={(e) => setInvoice({ ...invoice, clientAddress: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 outline-none"
                    placeholder="Adresse de facturation"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Intitulé du projet</label>
                <input
                  type="text"
                  value={invoice.projectTitle}
                  onChange={(e) => setInvoice({ ...invoice, projectTitle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase text-slate-400">Prestations / Livrables</label>
              {invoice.items.map((item) => (
                <div key={item.id} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-indigo-500 outline-none"
                    placeholder="Description"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                    className="w-16 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white text-center focus:border-indigo-500 outline-none"
                    placeholder="Qté"
                  />
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                    className="w-24 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white text-right focus:border-indigo-500 outline-none"
                    placeholder="P.U HT"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addItem}
                className="w-full py-2 border border-dashed border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/10 text-slate-400 hover:text-indigo-400 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
              >
                <Plus size={14} /> Ajouter une ligne
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Taux de TVA (%)</label>
                <input
                  type="number"
                  value={invoice.taxRate}
                  onChange={(e) => setInvoice({ ...invoice, taxRate: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Remise commerciale (%)</label>
                <input
                  type="number"
                  value={invoice.discountPercent}
                  onChange={(e) => setInvoice({ ...invoice, discountPercent: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 sticky top-8">
            <InvoiceDocument invoice={invoice} />
          </div>
        </div>
      </div>
    </div>
  );
}