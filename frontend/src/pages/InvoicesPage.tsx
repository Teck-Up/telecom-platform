import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Plus, Download, Search, ChevronRight } from 'lucide-react'
import type { InvoiceListRow } from '../types/invoice'
import type { ApiResponse } from '../types/api'
import { INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS } from '../constants/labels'
import { fmtCurrency } from '../utils/format'
import { useAuthStore } from '../store/authStore'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceListRow[]>([])
  const { user } = useAuthStore()
  const isStaff = user && ['admin', 'billing_agent', 'recovery_agent'].includes(user.role)
  const [clients, setClients] = useState<{ id: number; name: string | null; company_name: string | null }[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ client_id: '', due_date: '', description: '', tva_rate: 20 })
  const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: 0 }])

  const load = () =>
    api.get<ApiResponse<InvoiceListRow[]>>('/invoices', { params: { search, status } })
      .then(r => setInvoices(r.data.data))

  useEffect(() => { load() }, [search, status])
  useEffect(() => {
    if (isStaff) api.get('/clients').then(r => setClients(r.data.data))
  }, [isStaff])

  const addItem = () => setItems([...items, { description: '', quantity: 1, unit_price: 0 }])
  const updateItem = (i: number, field: string, value: any) => {
    const updated = [...items]; updated[i] = { ...updated[i], [field]: value }; setItems(updated)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/invoices', { ...form, items })
      toast.success('Facture créée')
      setShowModal(false)
      setItems([{ description: '', quantity: 1, unit_price: 0 }])
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur')
    }
  }

  const downloadPDF = async (id: number, number: string) => {
    const r = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' })
    const url = URL.createObjectURL(r.data)
    const a = document.createElement('a'); a.href = url; a.download = `facture-${number}.pdf`; a.click()
    URL.revokeObjectURL(url)
  }

  const fmt = fmtCurrency
  const total = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
        {isStaff && (
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <Plus size={16} /> Nouvelle facture
        </button>
        )}
      </div>

      <div className="flex gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Rechercher..." />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none">
          <option value="">Tous les statuts</option>
          {Object.entries(INVOICE_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">N° Facture</th>
              <th className="px-4 py-3 text-left">Client</th>
              <th className="px-4 py-3 text-right">Montant TTC</th>
              <th className="px-4 py-3 text-right">Payé</th>
              <th className="px-4 py-3 text-left">Échéance</th>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 text-center">PDF</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map(inv => (
              <tr key={inv.id} className="hover:bg-slate-50 group">
                <td className="px-4 py-3">
                  <Link to={`/invoices/${inv.id}`} className="font-mono text-blue-600 hover:underline">
                    {inv.invoice_number}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div>{inv.client_name}</div>
                  <div className="text-gray-400 text-xs">{inv.company_name}</div>
                </td>
                <td className="px-4 py-3 text-right font-medium">{fmt(inv.amount_ttc)}</td>
                <td className="px-4 py-3 text-right text-green-600">{fmt(inv.amount_paid)}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(inv.due_date).toLocaleDateString('fr-FR')}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${INVOICE_STATUS_COLORS[inv.status]}`}>
                    {INVOICE_STATUS_LABELS[inv.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => downloadPDF(inv.id, inv.invoice_number)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition">
                    <Download size={15} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <Link to={`/invoices/${inv.id}`} className="text-gray-400 hover:text-blue-600">
                    <ChevronRight size={18} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!invoices.length && <div className="text-center py-12 text-gray-400">Aucune facture trouvée</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Nouvelle facture</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                    <option value="">Sélectionner...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date d'échéance</label>
                  <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lignes de facturation</label>
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-5 gap-2 mb-2">
                    <input placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                      className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
                    <input type="number" placeholder="Qté" value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
                    <input type="number" placeholder="P.U." value={item.unit_price} onChange={e => updateItem(i, 'unit_price', Number(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
                    <div className="flex items-center justify-center text-sm font-medium">
                      {fmt(item.quantity * item.unit_price)}
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addItem} className="text-blue-600 text-sm hover:underline">+ Ajouter une ligne</button>
                <div className="text-right font-bold mt-2">Total HT: {fmt(total)} | TTC: {fmt(total * 1.2)}</div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 text-sm">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
