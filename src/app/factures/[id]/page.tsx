"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Invoice } from '@/types/invoice';
import InvoiceDocument from '@/components/InvoiceDocument';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params?.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

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
        alert("Impossible de charger cette facture.");
        router.push('/dashboard');
        return;
      }

      setInvoice({
        id: data.id,
        number: data.number,
        clientName: data.client_name,
        clientEmail: data.client_email,
        clientAddress: data.client_address,
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

  if (loading || !invoice) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-indigo-400 font-mono text-sm">
        Chargement de la facture...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Barre d'actions (masquée à l'impression) */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-4 print:hidden">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Revenir au tableau de bord
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs">
              {invoice.status === 'paid' && (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={14} /> Payée
                </span>
              )}
              {invoice.status === 'pending' && (
                <span className="text-indigo-400 font-bold flex items-center gap-1">
                  <Clock size={14} /> En attente
                </span>
              )}
              {invoice.status === 'overdue' && (
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  <AlertTriangle size={14} /> En retard
                </span>
              )}
            </div>

            <button
              onClick={() => window.print()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
            >
              <Printer size={14} /> Imprimer / PDF
            </button>
          </div>
        </div>

        {/* Aperçu du document complet */}
        <div className="shadow-2xl rounded-2xl overflow-hidden print:shadow-none print:rounded-none">
          <InvoiceDocument invoice={invoice} />
        </div>

      </div>
    </div>
  );
}