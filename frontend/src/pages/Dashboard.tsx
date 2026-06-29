import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import api from '../services/api'
import type { DashboardStats } from '../types/dashboard'
import {
  TrendingUp, Users, FileText, AlertTriangle, Calendar, Wallet,
  Shield, ChevronRight,
} from 'lucide-react'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyée', partially_paid: 'Partiel', paid: 'Payée', overdue: 'En retard', cancelled: 'Annulée',
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ success: boolean; data: DashboardStats }>('/dashboard/stats')
      .then(r => { setStats(r.data.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR')

  const kpiCards = [
    { label: "Chiffre d'affaires", value: fmt(stats?.totals?.total_ca || 0), icon: TrendingUp, color: 'bg-blue-500' },
    { label: 'Impayés', value: fmt(stats?.totals?.total_unpaid || 0), icon: AlertTriangle, color: 'bg-red-500' },
    { label: "Facturé aujourd'hui", value: fmt(stats?.totals?.invoiced_today || 0), icon: Calendar, color: 'bg-indigo-500' },
    { label: 'Encaissé ce mois', value: fmt(stats?.totals?.collected_this_month || 0), icon: Wallet, color: 'bg-emerald-500' },
    { label: 'Clients actifs', value: String(stats?.totals?.active_clients || 0), icon: Users, color: 'bg-green-500' },
    { label: 'Factures en retard', value: String(stats?.totals?.overdue_count || 0), icon: FileText, color: 'bg-orange-500' },
  ]

  const recoveryCards = [
    { label: 'Dossiers ouverts', value: String(stats?.recovery?.open_count || 0) },
    { label: 'Montant en recouvrement', value: fmt(stats?.recovery?.open_amount || 0) },
    { label: 'Pénalités cumulées', value: fmt(stats?.recovery?.total_penalties || 0) },
    { label: 'Clôturés ce mois', value: String(stats?.recovery?.closed_this_month || 0) },
  ]

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
            <div className={`${color} p-2.5 rounded-lg text-white shrink-0`}><Icon size={20} /></div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">{label}</p>
              <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold mb-4">Chiffre d&apos;affaires mensuel</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats?.monthlyCA || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number | string) => fmt(Number(v))} />
              <Legend />
              <Bar dataKey="ca" fill="#3b82f6" name="Facturé" radius={[4, 4, 0, 0]} />
              <Bar dataKey="paid" fill="#10b981" name="Encaissé" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold mb-4">Modes de paiement</h2>
          {(stats?.paymentMethods?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={stats?.paymentMethods || []}
                  dataKey="total"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ label, total }) => `${label}: ${fmt(Number(total))}`}
                >
                  {(stats?.paymentMethods || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number | string) => fmt(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 py-16 text-center">Aucun paiement enregistré</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold mb-4">Répartition des factures</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={stats?.statusDist || []}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={75}
                label={({ status, count }) => `${STATUS_LABELS[status] || status}: ${count}`}
              >
                {(stats?.statusDist || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Shield size={20} className="text-rose-600" /> Recouvrement
            </h2>
            <Link to="/recovery" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              Voir tout <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {recoveryCards.map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar size={20} className="text-amber-600" /> Échéances (30 jours)
            </h2>
            <Link to="/invoices" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              Factures <ChevronRight size={14} />
            </Link>
          </div>
          {(stats?.upcomingDue?.length ?? 0) > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Facture</th>
                  <th className="pb-2">Client</th>
                  <th className="pb-2">Échéance</th>
                  <th className="pb-2 text-right">Solde</th>
                </tr>
              </thead>
              <tbody>
                {stats!.upcomingDue.map(row => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2">
                      <Link to={`/invoices/${row.id}`} className="font-mono text-blue-600 hover:underline">
                        {row.invoice_number}
                      </Link>
                    </td>
                    <td className="py-2 text-gray-600 truncate max-w-[120px]">
                      {row.company_name || row.client_name || '—'}
                    </td>
                    <td className="py-2">
                      <span className={row.is_overdue ? 'text-red-600 font-medium' : ''}>
                        {fmtDate(row.due_date)}
                        {row.is_overdue && ' · retard'}
                      </span>
                    </td>
                    <td className="py-2 text-right font-semibold">{fmt(row.balance_due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-400 py-8 text-center">Aucune échéance dans les 30 prochains jours</p>
          )}
        </div>
      </div>

      {(stats?.topUnpaid?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold mb-4">Top clients impayés</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Client</th>
                <th className="pb-2">Entreprise</th>
                <th className="pb-2 text-right">Factures</th>
                <th className="pb-2 text-right">Montant impayé</th>
              </tr>
            </thead>
            <tbody>
              {stats!.topUnpaid.map(c => (
                <tr key={c.client_id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2">{c.name || '—'}</td>
                  <td className="py-2 text-gray-500">{c.company_name || '—'}</td>
                  <td className="py-2 text-right">{c.unpaid_invoices}</td>
                  <td className="py-2 text-right font-semibold text-red-600">{fmt(c.unpaid_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
