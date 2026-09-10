"use client";

"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Clock, AlertTriangle, CheckCircle2, Plus, 
  BellRing, Filter, Check, RotateCcw, Trash2, Eye,
  Search, ArrowUpDown, X, Download, Pencil, LogOut 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Invoice, InvoiceStatus } from '@/types/invoice';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | InvoiceStatus>('all');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [sendingId, setSendingId] = useState<string | null>(null);

const handleSendReminder = async (inv: Invoice) => {
  if (!inv.clientEmail) {
    alert("Impossible de relancer : aucun email n'est renseigné pour ce client.");
    return;
  }

  // Calcul du montant TTC pour l'email
  const totalHT = calculateTotal(inv);
  const discountAmount = totalHT * (inv.discountPercent / 100);
  const totalTTC = (totalHT - discountAmount) * (1 + inv.taxRate / 100);

  const confirmSend = confirm(
    `Envoyer un email de relance à ${inv.clientName} (${inv.clientEmail}) pour la facture ${inv.number} ?`
  );
  if (!confirmSend) return;

  setSendingId(inv.id);

  try {
    const res = await fetch('/api/send-reminder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientEmail: inv.clientEmail,
        clientName: inv.clientName,
        invoiceNumber: inv.number,
        dueDate: inv.dueDate,
        amountTTC: formatCurrency(totalTTC),
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || "Échec de l'envoi");
    }

    alert(`✅ Relance envoyée avec succès à ${inv.clientEmail} !`);
  } catch (error: any) {
    console.error(error);
    alert(`❌ Erreur : ${error.message}`);
  } finally {
    setSendingId(null);
  }
};
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

  const handleUpdateStatus = async (id: string, newStatus: InvoiceStatus) => {
    setInvoices(prev => 
      prev.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv)
    );

    const { error } = await supabase
      .from('invoices')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert(`Erreur : ${error.message}`);
      fetchInvoices();
    }
  };

  const handleDeleteInvoice = async (id: string, invoiceNumber: string) => {
    if (!confirm(`Supprimer définitivement la facture ${invoiceNumber} ?`)) return;

    setInvoices(prev => prev.filter(inv => inv.id !== id));

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`Erreur : ${error.message}`);
      fetchInvoices();
    }
  };

  const calculateTotal = (inv: Invoice) => 
    inv.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);

  // KPIs
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + calculateTotal(i), 0);
  const totalPending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + calculateTotal(i), 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + calculateTotal(i), 0);

  // Filtrage et Tri
  const filteredInvoices = invoices
    .filter((inv) => {
      const matchesStatus = activeFilter === 'all' || inv.status === activeFilter;
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = 
        !term ||
        inv.number.toLowerCase().includes(term) ||
        inv.clientName.toLowerCase().includes(term) ||
        inv.projectTitle.toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.dueDate).getTime();
      const dateB = new Date(b.dueDate).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  // Export CSV
  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      alert("Aucune facture à exporter.");
      return;
    }

    const headers = [
      "Numéro",
      "Client",
      "Email Client",
      "Projet",
      "Date d'émission",
      "Date d'échéance",
      "Statut",
      "Montant HT (€)",
      "TVA (%)",
      "Remise (%)",
      "Montant TTC (€)"
    ];

    const rows = filteredInvoices.map((inv) => {
      const totalHT = calculateTotal(inv);
      const discountAmount = totalHT * (inv.discountPercent / 100);
      const taxableBase = totalHT - discountAmount;
      const totalTTC = taxableBase * (1 + inv.taxRate / 100);

      const statusLabel =
        inv.status === 'paid' ? 'Payée' :
        inv.status === 'pending' ? 'En attente' : 'En retard';

      const escape = (val: string | number | undefined) => `"${String(val ?? '').replace(/"/g, '""')}"`;

      return [
        escape(inv.number),
        escape(inv.clientName),
        escape(inv.clientEmail),
        escape(inv.projectTitle),
        escape(inv.issueDate),
        escape(inv.dueDate),
        escape(statusLabel),
        escape(totalHT.toFixed(2)),
        escape(inv.taxRate),
        escape(inv.discountPercent),
        escape(totalTTC.toFixed(2))
      ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `factures_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-indigo-400 font-mono text-sm">
        Chargement des données...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 md:p-12">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header */}
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
          <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = '/login';
          }}
          title="Se déconnecter"
          className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-xl transition-all"
        >
          <LogOut size={16} />
        </button>
        </header>

        {/* KPIs */}
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

        {/* Section Table avec Barre d'outils */}
        <section className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 space-y-6">
          
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            
            {/* Barre de recherche */}
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Rechercher par client, référence, projet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder:text-slate-500 outline-none transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Actions : Export CSV + Tri par date + Filtres statut */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleExportCSV}
                title="Exporter les factures affichées en format CSV / Excel"
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <Download size={13} className="text-emerald-400" />
                Exporter CSV ({filteredInvoices.length})
              </button>

              <button
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 transition-colors"
                title="Inverser l'ordre par date"
              >
                <ArrowUpDown size={13} className="text-indigo-400" />
                {sortOrder === 'desc' ? 'Plus récentes' : 'Plus anciennes'}
              </button>

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
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

          </div>

          {/* Tableau */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-slate-500 uppercase font-mono tracking-wider">
                <tr>
                  <th className="pb-3 px-4">Référence</th>
                  <th className="pb-3 px-4">Client & Projet</th>
                  <th className="pb-3 px-4">Échéance</th>
                  <th className="pb-3 px-4">Montant HT</th>
                  <th className="pb-3 px-4">Statut</th>
                  <th className="pb-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 italic">
                      {searchTerm 
                        ? `Aucun résultat pour "${searchTerm}".` 
                        : "Aucune facture dans cette catégorie."}
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
                          <Link
                            href={`/factures/${inv.id}`}
                            title="Consulter et imprimer le PDF"
                            className="p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-lg transition-all"
                          >
                            <Eye size={13} />
                          </Link>
                          {/* Bouton de modification */}
                          <Link
                            href={`/factures/${inv.id}/modifier`}
                            title="Modifier la facture"
                            className="p-1.5 text-slate-400 hover:text-indigo-400 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-lg transition-all"
                          >
                            <Pencil size={13} />
                          </Link>

                          {inv.status !== 'paid' && (
                            <button
                              onClick={() => handleUpdateStatus(inv.id, 'paid')}
                              title="Marquer comme payée"
                              className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-[10px] font-bold uppercase inline-flex items-center gap-1 transition-all"
                            >
                              <Check size={12} /> Payée
                            </button>
                          )}

                          {inv.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateStatus(inv.id, 'overdue')}
                              title="Signaler en retard"
                              className="px-2.5 py-1 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-[10px] font-bold uppercase inline-flex items-center gap-1 transition-all"
                            >
                              <AlertTriangle size={12} /> Retard
                            </button>
                          )}

                          {inv.status === 'overdue' && (
                            <button
                              type="button"
                              disabled={sendingId === inv.id}
                              onClick={() => handleSendReminder(inv)}
                              title="Envoyer un rappel par email"
                              className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 disabled:opacity-50 border border-rose-500/30 rounded-lg text-[10px] font-bold uppercase inline-flex items-center gap-1 transition-all"
                            >
                              <BellRing size={12} className={sendingId === inv.id ? "animate-spin" : ""} />
                              {sendingId === inv.id ? "Envoi..." : "Relancer"}
                            </button>
                          )}

                          {inv.status === 'paid' && (
                            <button
                              onClick={() => handleUpdateStatus(inv.id, 'pending')}
                              title="Rétablir en attente"
                              className="p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition-all"
                            >
                              <RotateCcw size={13} />
                            </button>
                          )}

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