"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Printer, Save, Lock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import InvoiceDocument from '@/components/InvoiceDocument';
import { Invoice, InvoiceItem } from '@/types/invoice';

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params?.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);

  // 1. Récupération des données existantes (avec champs B2B)
  useEffect(() => {
    if (!invoiceId) return;

    const fetchInvoice = async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error || !data) {
        console.error("Facture introuvable :", error);
        alert("Impossible de charger la facture à modifier.");
        router.push('/dashboard');
        return;
      }

      setInvoice({
        id: data.id,
        number: data.number,
        clientName: data.client_name,
        clientEmail: data.client_email,
        clientAddress: data.client_address,
        clientLegalForm: data.client_legal_form || '',
        clientSiren: data.client_siren || '',
        clientVatNumber: data.client_vat_number || '',
        projectTitle: data.project_title,
        issueDate: data.issue_date,
        dueDate: data.due_date,
        status: data.status,
        taxRate: data.tax_rate,
        discountPercent: data.discount_percent,
        items: data.items || []
      });
      setLoading(false);
    };

    fetchInvoice();
  }, [invoiceId, router]);

  // Verrouillage légal : modifiable UNIQUEMENT si draft
  const isLocked = invoice?.status !== 'draft';

  // 2. Gestion des lignes de prestations
  const addItem = () => {
    if (!invoice || isLocked) return;
    const newItem: InvoiceItem = {
      id: Math.random().toString(),
      description: 'Nouvelle prestation',
      quantity: 1,
      unitPrice: 500
    };
    setInvoice({ ...invoice, items: [...invoice.items, newItem] });
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    if (!invoice || isLocked) return;
    setInvoice({
      ...invoice,
      items: invoice.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    });
  };

  const removeItem = (id: string) => {
    if (!invoice || isLocked) return;
    setInvoice({ ...invoice, items: invoice.items.filter(item => item.id !== id) });
  };

  // 3. Sauvegarde des modifications (UPDATE)
  const handleUpdateInvoice = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!invoice) return;

    if (isLocked) {
      alert("Action refusée : une facture déjà validée et émise ne peut plus être modifiée (loi anti-fraude).");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        number: invoice.number,
        client_name: invoice.clientName,
        client_email: invoice.clientEmail,
        client_address: invoice.clientAddress,
        client_legal_form: invoice.clientLegalForm,
        client_siren: invoice.clientSiren,
        client_vat_number: invoice.clientVatNumber,
        project_title: invoice.projectTitle,
        issue_date: invoice.issueDate,
        due_date: invoice.dueDate,
        status: invoice.status,
        tax_rate: invoice.taxRate,
        discount_percent: invoice.discountPercent,
        items: invoice.items
      };

      const { error } = await supabase
        .from('invoices')
        .update(payload)
        .eq('id', invoice.id);

      if (error) {
        alert(`Erreur Supabase : ${error.message}`);
        setSaving(false);
        return;
      }

      router.push(`/factures/${invoice.id}`);
    } catch (err) {
      console.error(err);
      alert('Une erreur inattendue est survenue.');
      setSaving(false);
    }
  };

  // 4. Émission définitive de la facture
  const handleIssueInvoice = async () => {
    if (!invoice) return;

    const confirmed = window.confirm(
      "Attention : l'émission d'une facture est définitive. Elle obtiendra un numéro séquentiel continu officiel et deviendra légalement inaltérable. Confirmer l'émission ?"
    );
    if (!confirmed) return;

    setIssuing(true);
    try {
      const { data, error } = await supabase.rpc('issue_invoice', {
        invoice_id: invoice.id,
      });

      if (error) throw error;

      alert(`✅ Facture émise avec succès sous la référence ${data.number} !`);

      setInvoice((prev) => prev ? ({
        ...prev,
        number: data.number,
        status: 'pending',
        issuedAt: new Date().toISOString(),
      }) : null);

      router.push(`/factures/${invoice.id}`);
    } catch (err: any) {
      alert(`Erreur lors de l'émission : ${err.message}`);
    } finally {
      setIssuing(false);
    }
  };

  // 5. Création d'un Avoir (Credit Note)
  const handleCreateCreditNote = async () => {
    if (!invoice) return;

    const confirmed = window.confirm(
      `Voulez-vous générer un Avoir pour annuler la facture ${invoice.number} ? Un nouveau document avec montants négatifs sera créé.`
    );
    if (!confirmed) return;

    try {
      const userRes = await supabase.auth.getUser();
      const currentUserId = userRes.data.user?.id;

      const creditNotePayload = {
        id: crypto.randomUUID(),
        user_id: currentUserId,
        number: `AVOIR-${invoice.number}`,
        status: 'draft',
        invoice_type: 'credit_note',
        original_invoice_id: invoice.id,
        client_name: invoice.clientName,
        client_email: invoice.clientEmail,
        client_address: invoice.clientAddress,
        client_legal_form: invoice.clientLegalForm,
        client_siren: invoice.clientSiren,
        client_vat_number: invoice.clientVatNumber,
        project_title: `Avoir sur facture ${invoice.number} - ${invoice.projectTitle}`,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        tax_rate: invoice.taxRate,
        discount_percent: invoice.discountPercent,
        items: invoice.items.map(item => ({
          ...item,
          unitPrice: -Math.abs(item.unitPrice)
        }))
      };

      const { data, error } = await supabase
        .from('invoices')
        .insert([creditNotePayload])
        .select()
        .single();

      if (error) throw error;

      alert("Avoir créé avec succès ! Redirection en cours...");
      router.push(`/factures/${data.id}`);
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    }
  };

  if (loading || !invoice) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-indigo-400 font-mono text-sm">
        Chargement de la facture...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-900">
          <Link 
            href={`/factures/${invoice.id}`}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Annuler / Retour
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl border border-slate-800 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
            >
              <Printer size={14} /> Imprimer / PDF
            </button>

            {!isLocked ? (
              <>
                <button
                  type="button"
                  disabled={saving || issuing}
                  onClick={handleUpdateInvoice}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                >
                  <Save size={14} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  disabled={saving || issuing}
                  onClick={handleIssueInvoice}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                >
                  <Lock size={14} /> {issuing ? 'Émission...' : 'Émettre la facture'}
                </button>
              </>
            ) : (
              <>
                <span className="px-4 py-2 bg-slate-900 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold tracking-wider flex items-center gap-2">
                  <CheckCircle2 size={14} /> Facture validée & inaltérable
                </span>
                <button
                  type="button"
                  onClick={handleCreateCreditNote}
                  className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                >
                  <span>↩</span> Générer un Avoir d'annulation
                </button>
              </>
            )}
          </div>
        </div>

        {isLocked && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-2">
            <Lock size={16} className="shrink-0 text-amber-400" />
            Cette facture est validée. Conformément à la réglementation fiscale (loi anti-fraude à la TVA), son contenu ne peut plus être modifié.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-indigo-400">
              Modifier la facture ({invoice.number})
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">N° Facture</label>
                <input
                  type="text"
                  disabled={true}
                  value={invoice.number}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono opacity-60 cursor-not-allowed outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Échéance</label>
                <input
                  type="date"
                  disabled={isLocked}
                  value={invoice.dueDate}
                  onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white disabled:opacity-50 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Client (Nom commercial)</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={invoice.clientName}
                  onChange={(e) => setInvoice({ ...invoice, clientName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white disabled:opacity-50 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Mentions B2B obligatoires */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Forme Juridique</label>
                  <select
                    disabled={isLocked}
                    value={invoice.clientLegalForm || ''}
                    onChange={(e) => setInvoice({ ...invoice, clientLegalForm: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white disabled:opacity-50 focus:border-indigo-500 outline-none"
                  >
                    <option value="">Forme...</option>
                    <option value="SAS">SAS / SASU</option>
                    <option value="SARL">SARL / EURL</option>
                    <option value="EI">Entreprise Individuelle (EI)</option>
                    <option value="SA">SA</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">SIREN (9 chiffres)</label>
                  <input
                    type="text"
                    maxLength={9}
                    disabled={isLocked}
                    placeholder="123456789"
                    value={invoice.clientSiren || ''}
                    onChange={(e) => setInvoice({ ...invoice, clientSiren: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white disabled:opacity-50 focus:border-indigo-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">N° TVA Intracom.</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    placeholder="FR..."
                    value={invoice.clientVatNumber || ''}
                    onChange={(e) => setInvoice({ ...invoice, clientVatNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white disabled:opacity-50 focus:border-indigo-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Email Client</label>
                <input
                  type="email"
                  disabled={isLocked}
                  value={invoice.clientEmail || ''}
                  onChange={(e) => setInvoice({ ...invoice, clientEmail: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white disabled:opacity-50 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Adresse Client</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={invoice.clientAddress || ''}
                  onChange={(e) => setInvoice({ ...invoice, clientAddress: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white disabled:opacity-50 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Intitulé du projet</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={invoice.projectTitle}
                  onChange={(e) => setInvoice({ ...invoice, projectTitle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white disabled:opacity-50 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase text-slate-400">Prestations / Livrables</label>
              {invoice.items.map((item) => (
                <div key={item.id} className="flex gap-2 items-center">
                  <input
                    type="text"
                    disabled={isLocked}
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white disabled:opacity-50 focus:border-indigo-500 outline-none"
                    placeholder="Description"
                  />
                  <input
                    type="number"
                    disabled={isLocked}
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                    className="w-16 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white disabled:opacity-50 text-center focus:border-indigo-500 outline-none"
                    placeholder="Qté"
                  />
                  <input
                    type="number"
                    disabled={isLocked}
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                    className="w-24 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white disabled:opacity-50 text-right focus:border-indigo-500 outline-none"
                    placeholder="P.U HT"
                  />
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}

              {!isLocked && (
                <button
                  type="button"
                  onClick={addItem}
                  className="w-full py-2 border border-dashed border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/10 text-slate-400 hover:text-indigo-400 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                >
                  <Plus size={14} /> Ajouter une ligne
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Taux de TVA (%)</label>
                <input
                  type="number"
                  disabled={isLocked}
                  value={invoice.taxRate}
                  onChange={(e) => setInvoice({ ...invoice, taxRate: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white disabled:opacity-50 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Remise (%)</label>
                <input
                  type="number"
                  disabled={isLocked}
                  value={invoice.discountPercent}
                  onChange={(e) => setInvoice({ ...invoice, discountPercent: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white disabled:opacity-50 focus:border-indigo-500 outline-none"
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