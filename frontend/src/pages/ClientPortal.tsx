import { useEffect, useState } from 'react'
import api from '../services/api'
import { Download } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'À payer', partially_paid: 'Paiement partiel',
  paid: 'Payée', overdue: 'En retard', cancelled: 'Annulée'
}
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', sent: 'bg-blue-100 text-blue-700',
  partially_paid: 'bg-yellow-100 text-yellow-700', paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-400',
}

export default function ClientPortal() {
  const { user } = useAuthStore()
  const [invoices, setInvoices] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    api.get('/invoices').then(r => setInvoices(r.data.data))
    api.get('/notifications').then(r => setNotifications(r.data.data))
  }, [])

  const downloadPDF = async (id: number, number: string) => {
    const r = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' })
    const url = URL.createObjectURL(r.data)
    const a = document.createElement('a'); a.href = url; a.download = `facture-${number}.pdf`; a.click()
    URL.revokeObjectURL(url)
  }

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
  const unpaid = invoices.filter(i => ['sent', 'partially_paid', 'overdue'].includes(i.status))
  const totalUnpaid = unpaid.reduce((s, i) => s + (i.amount_ttc - i.amount_paid), 0)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon Espace Client</h1>
        <p className="text-gray-500">Bienvenue, {user?.name}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total factures', value: invoices.length },
          { label: 'Factures payées', value: invoices.filter(i => i.status === 'paid').length },
          { label: 'Montant à payer', value: fmt(totalUnpaid), highlight: totalUnpaid > 0 },
        ].map(({ label, value, highlight }) => (
          <div key={label} className={`bg-white rounded-xl shadow-sm p-5 ${highlight ? 'border-l-4 border-red-500' : ''}`}>
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-2xl font-bold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Notifications */}
      {notifications.filter(n => !n.is_read).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h2 className="font-semibold text-yellow-800 mb-2">Notifications ({notifications.filter(n => !n.is_read).length})</h2>
          {notifications.filter(n => !n.is_read).map(n => (
            <div key={n.id} className="text-sm text-yellow-700 py-1">{n.title}: {n.message}</div>
          ))}
        </div>
      )}

      {/* Invoices table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="text-lg font-semibold">Mes factures</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">N° Facture</th>
              <th className="px-4 py-3 text-right">Montant TTC</th>
              <th className="px-4 py-3 text-right">Payé</th>
              <th className="px-4 py-3 text-left">Échéance</th>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 text-center">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map(inv => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-blue-600">{inv.invoice_number}</td>
                <td className="px-4 py-3 text-right font-medium">{fmt(inv.amount_ttc)}</td>
                <td className="px-4 py-3 text-right text-green-600">{fmt(inv.amount_paid)}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(inv.due_date).toLocaleDateString('fr-FR')}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status]}`}>
                    {STATUS_LABELS[inv.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => downloadPDF(inv.id, inv.invoice_number)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition">
                    <Download size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!invoices.length && <div className="text-center py-12 text-gray-400">Aucune facture</div>}
      </div>
    </div>
  )
}
