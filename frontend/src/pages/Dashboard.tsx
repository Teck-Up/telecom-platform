import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import api from '../services/api'
import { TrendingUp, Users, FileText, AlertTriangle } from 'lucide-react'
import StatsOverview from "../components/dashboard/StatsOverview.tsx";
import RevenueEvolutionChart from "../components/dashboard/RevenueEvolutionChart.tsx";
import InvoiceDistributionChart from "../components/dashboard/InvoiceDistributionChart.tsx";
import RevenuePredictionChart from "../components/dashboard/RevenuePredictionChart.tsx";

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
<StatsOverview/>
      <RevenueEvolutionChart />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">






        <div className="bg-white rounded-xl shadow-sm p-5">
          <RevenuePredictionChart/>
        </div>

        {/* Status distribution */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <InvoiceDistributionChart />

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
