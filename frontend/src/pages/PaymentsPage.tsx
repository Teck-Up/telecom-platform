import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ invoice_id: '', amount: '', payment_method: 'bank_transfer', reference: '', notes: '' })

  const load = () => api.get('/payments').then(r => setPayments(r.data.data))
  useEffect(() => { load() }, [])
  useEffect(() => {
    api.get('/invoices', { params: { status: 'sent' } }).then(r => setInvoices(r.data.data))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/payments', form)
      toast.success('Paiement enregistré')
      setShowModal(false)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur')
    }
  }

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
  const METHODS: Record<string, string> = { bank_transfer: 'Virement', credit_card: 'Carte', check: 'Chèque', cash: 'Espèces', direct_debit: 'Prélèvement' }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <Plus size={16} /> Enregistrer un paiement
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">N° Facture</th>
              <th className="px-4 py-3 text-left">Client</th>
              <th className="px-4 py-3 text-right">Montant</th>
              <th className="px-4 py-3 text-left">Méthode</th>
              <th className="px-4 py-3 text-left">Référence</th>
              <th className="px-4 py-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-blue-600">{p.invoice_number}</td>
                <td className="px-4 py-3">{p.client_name || p.company_name}</td>
                <td className="px-4 py-3 text-right font-semibold text-green-600">{fmt(p.amount)}</td>
                <td className="px-4 py-3">{METHODS[p.payment_method] || p.payment_method}</td>
                <td className="px-4 py-3 text-gray-500">{p.reference || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(p.payment_date).toLocaleDateString('fr-FR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!payments.length && <div className="text-center py-12 text-gray-400">Aucun paiement enregistré</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Enregistrer un paiement</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Facture</label>
                <select value={form.invoice_id} onChange={e => setForm({ ...form, invoice_id: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                  <option value="">Sélectionner...</option>
                  {invoices.map(inv => <option key={inv.id} value={inv.id}>{inv.invoice_number} — {inv.client_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant (€)</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
                <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                  {Object.entries(METHODS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
                <input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 text-sm">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
