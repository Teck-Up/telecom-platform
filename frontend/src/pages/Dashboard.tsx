import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import api from '../services/api'
import { TrendingUp, Users, FileText, AlertTriangle } from 'lucide-react'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyée', partially_paid: 'Partiel', paid: 'Payée', overdue: 'En retard', cancelled: 'Annulée'
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/stats').then(r => { setStats(r.data.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Chiffre d\'Affaires', value: fmt(stats?.totals?.total_ca || 0), icon: TrendingUp, color: 'bg-blue-500' },
          { label: 'Impayés', value: fmt(stats?.totals?.total_unpaid || 0), icon: AlertTriangle, color: 'bg-red-500' },
          { label: 'Clients Actifs', value: stats?.totals?.total_clients || 0, icon: Users, color: 'bg-green-500' },
          { label: 'Factures en retard', value: stats?.totals?.overdue_count || 0, icon: FileText, color: 'bg-orange-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
            <div className={`${color} p-3 rounded-lg text-white`}><Icon size={22} /></div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly CA Chart */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold mb-4">Chiffre d'Affaires Mensuel</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats?.monthlyCA || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => fmt(Number(v))} />
              <Bar dataKey="ca" fill="#3b82f6" name="CA" radius={[4, 4, 0, 0]} />
              <Bar dataKey="paid" fill="#10b981" name="Encaissé" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status distribution */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold mb-4">Répartition des Factures</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={stats?.statusDist || []} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80}
                label={({ status, count }) => `${STATUS_LABELS[status] || status}: ${count}`}>
                {(stats?.statusDist || []).map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top unpaid clients */}
      {stats?.topUnpaid?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold mb-4">Top clients impayés</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b">
              <th className="pb-2">Client</th><th className="pb-2">Entreprise</th>
              <th className="pb-2 text-right">Factures</th><th className="pb-2 text-right">Montant impayé</th>
            </tr></thead>
            <tbody>
              {stats.topUnpaid.map((c: any) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="py-2">{c.name}</td>
                  <td className="py-2 text-gray-500">{c.company_name}</td>
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
