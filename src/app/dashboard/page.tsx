"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Clock, AlertTriangle, CheckCircle2, Plus, 
  BellRing, Filter, Check, RotateCcw, Trash2 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Invoice, InvoiceStatus } from '@/types/invoice';

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | InvoiceStatus>('all');

  // Récupération des données depuis Supabase
  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur Supabase :', error.message);
    } else if (data) {
      const formatted: Invoice[] = data.map((row: any) => ({
        id: row.id,
        number: row.number,
        clientName: row.client_name,
        clientEmail: row.client_email,
        clientAddress: row.client_address,
        projectTitle: row.project_title,
        issueDate: row.issue_date,
        dueDate: row.due_date,
        status: row.status,
        taxRate: row.tax_rate,
        discountPercent: row.discount_percent,
        items: row.items || []
      }));
      setInvoices(formatted);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Modification du statut dans Supabase et mise à jour de l'état local
  const handleUpdateStatus = async (id: string, newStatus: InvoiceStatus) => {
    // Mise à jour optimiste dans l'UI
    setInvoices(prev => 
      prev.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv)
    );

    const { error } = await supabase
      .from('invoices')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert(`Erreur lors de la mise à jour : ${error.message}`);
      fetchInvoices(); // Restauration en cas d'erreur
    }
  };

  // Suppression d'une facture
  const handleDeleteInvoice = async (id: string, invoiceNumber: string) => {
    if (!confirm(`Confirmer la suppression de la facture ${invoiceNumber} ?`)) return;

    setInvoices(prev => prev.filter(inv => inv.id !== id));

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`Erreur de suppression : ${error.message}`);
      fetchInvoices();
    }
  };

  const calculateTotal = (inv: Invoice) => 
    inv.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);

  // Recalcul en temps réel des KPIs
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + calculateTotal(i), 0);
  const totalPending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + calculateTotal(i), 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + calculateTotal(i), 0);

  const filteredInvoices = activeFilter === 'all' 
    ? invoices 
    : invoices.filter(i => i.status === activeFilter);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-indigo-400 font-mono text-sm">
        Chargement des données en direct...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 md:p-12">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* En-tête */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-8">
          <div>
            <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest block mb-1">
              Tableau de bord financier
            </span>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase">
              Facturation Agence
            </h1>
          </div>
          <Link
            href="/factures/nouvelle"
            className="w-fit py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Plus size={16} /> Nouvelle facture
          </Link>
        </header>

        {/* Cartes KPI */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider">Encaissé ce mois</span>
              <CheckCircle2 size={18} className="text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-white mb-1">{formatCurrency(totalPaid)}</div>
            <span className="text-[11px] text-emerald-400 font-medium">Fonds sécurisés</span>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider">En attente d'échéance</span>
              <Clock size={18} className="text-indigo-400" />
            </div>
            <div className="text-3xl font-extrabold text-white mb-1">{formatCurrency(totalPending)}</div>
            <span className="text-[11px] text-indigo-400 font-medium">Échéance à 30 jours</span>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider">Retards critiques</span>
              <AlertTriangle size={18} className="text-rose-400" />
            </div>
            <div className="text-3xl font-extrabold text-rose-400 mb-1">{formatCurrency(totalOverdue)}</div>
            <span className="text-[11px] text-rose-400/80 font-medium">Nécessite une relance</span>
          </div>
        </section>

        {/* Liste des factures */}
        <section className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-indigo-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">Factures récentes</h2>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['all', 'paid', 'pending', 'overdue'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    activeFilter === tab ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'all' ? 'Toutes' : tab === 'paid' ? 'Payées' : tab === 'pending' ? 'En cours' : 'Retards'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-slate-500 uppercase font-mono tracking-wider">
                <tr>
                  <th className="pb-3 px-4">Référence</th>
                  <th className="pb-3 px-4">Client & Projet</th>
                  <th className="pb-3 px-4">Échéance</th>
                  <th className="pb-3 px-4">Montant HT</th>
                  <th className="pb-3 px-4">Statut</th>
                  <th className="pb-3 px-4 text-right">Actions rapides</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                      Aucune facture dans cette catégorie.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-white">{inv.number}</td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-white">{inv.clientName}</div>
                        <div className="text-slate-500 text-[11px]">{inv.projectTitle}</div>
                      </td>
                      <td className="py-4 px-4 text-slate-400">{inv.dueDate}</td>
                      <td className="py-4 px-4 font-semibold text-white">
                        {formatCurrency(calculateTotal(inv))}
                      </td>
                      <td className="py-4 px-4">
                        {inv.status === 'paid' && (
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md font-bold text-[10px] uppercase">
                            Réglée
                          </span>
                        )}
                        {inv.status === 'pending' && (
                          <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md font-bold text-[10px] uppercase">
                            En attente
                          </span>
                        )}
                        {inv.status === 'overdue' && (
                          <span className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md font-bold text-[10px] uppercase">
                            En retard
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Action : Marquer Payée */}
                          {inv.status !== 'paid' && (
                            <button
                              onClick={() => handleUpdateStatus(inv.id, 'paid')}
                              title="Marquer comme payée"
                              className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-[10px] font-bold uppercase inline-flex items-center gap-1 transition-all"
                            >
                              <Check size={12} /> Payée
                            </button>
                          )}

                          {/* Action : Basculer en Retard */}
                          {inv.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateStatus(inv.id, 'overdue')}
                              title="Signaler en retard"
                              className="px-2.5 py-1 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-[10px] font-bold uppercase inline-flex items-center gap-1 transition-all"
                            >
                              <AlertTriangle size={12} /> Retard
                            </button>
                          )}

                          {/* Action : Relancer un client en retard */}
                          {inv.status === 'overdue' && (
                            <button
                              onClick={() => alert(`Relance envoyée par email à ${inv.clientName} (${inv.clientEmail || 'contact client'}).`)}
                              title="Envoyer un rappel"
                              className="px-2.5 py-1 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 rounded-lg text-[10px] font-bold uppercase inline-flex items-center gap-1 transition-all"
                            >
                              <BellRing size={12} /> Relancer
                            </button>
                          )}

                          {/* Action : Rétablir en attente */}
                          {inv.status === 'paid' && (
                            <button
                              onClick={() => handleUpdateStatus(inv.id, 'pending')}
                              title="Rétablir le statut"
                              className="p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition-all"
                            >
                              <RotateCcw size={13} />
                            </button>
                          )}

                          {/* Action : Supprimer */}
                          <button
                            onClick={() => handleDeleteInvoice(inv.id, inv.number)}
                            title="Supprimer la facture"
                            className="p-1.5 text-slate-500 hover:text-rose-400 bg-slate-900/50 border border-slate-800/80 hover:border-rose-500/30 rounded-lg transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}