import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Plus, ChevronRight } from 'lucide-react'
import type { ApiResponse } from '../types/api'
import type { RecoveryListRow } from '../types/recovery'
import { PRIORITY_COLORS, PRIORITY_LABELS, RECOVERY_STATUS_COLORS } from '../constants/labels'
import { fmtCurrency } from '../utils/format'

export default function RecoveryPage() {
  const [cases, setCases] = useState<RecoveryListRow[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ client_id: '', invoice_id: '', priority: 'medium', notes: '' })

  const load = () =>
    api.get<ApiResponse<RecoveryListRow[]>>('/recovery').then(r => setCases(r.data.data))
  useEffect(() => { load() }, [])
  useEffect(() => { api.get('/invoices', { params: { status: 'overdue' } }).then(r => setInvoices(r.data.data)) }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/recovery', form)
      toast.success('Dossier créé'); setShowCreate(false); load()
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined
      toast.error(message || 'Erreur')
    }
  }

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.put(`/recovery/${id}`, { status })
      toast.success('Mis à jour'); load()
    } catch { toast.error('Erreur') }
  }

  const fmt = fmtCurrency

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Recouvrement</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <Plus size={16} /> Nouveau dossier
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Client</th>
              <th className="px-4 py-3 text-left">Facture</th>
              <th className="px-4 py-3 text-right">Montant dû</th>
              <th className="px-4 py-3 text-right">Jours retard</th>
              <th className="px-4 py-3 text-left">Priorité</th>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cases.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 group">
                <td className="px-4 py-3">
                  <Link to={`/recovery/${c.id}`} className="block">
                    <div className="font-medium text-blue-600 group-hover:underline">{c.client_name}</div>
                    <div className="text-gray-400 text-xs">{c.company_name}</div>
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-blue-600">{c.invoice_number}</td>
                <td className="px-4 py-3 text-right font-semibold text-red-600">{fmt(c.overdue_amount)}</td>
                <td className="px-4 py-3 text-right text-gray-600">{c.overdue_days}j</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[c.priority]}`}>{c.priority}</span>
                </td>
                <td className="px-4 py-3">
                  <select value={c.status} onChange={e => updateStatus(c.id, e.target.value)}
                    className={`text-xs rounded-full px-2 py-0.5 border-0 outline-none cursor-pointer font-medium ${RECOVERY_STATUS_COLORS[c.status]}`}>
                    {['open', 'in_progress', 'resolved', 'legal', 'closed'].map(s =>
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    )}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <Link to={`/recovery/${c.id}`} className="text-gray-400 hover:text-blue-600">
                    <ChevronRight size={18} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!cases.length && <div className="text-center py-12 text-gray-400">Aucun dossier de recouvrement</div>}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Nouveau dossier de recouvrement</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Facture en retard</label>
                <select value={form.invoice_id} onChange={e => {
                  const inv = invoices.find(i => i.id === Number(e.target.value))
                  setForm({ ...form, invoice_id: e.target.value, client_id: inv?.client_id || '' })
                }} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                  <option value="">Sélectionner...</option>
                  {invoices.map(inv => <option key={inv.id} value={inv.id}>{inv.invoice_number} — {inv.client_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                  <option value="low">Faible</option><option value="medium">Moyenne</option>
                  <option value="high">Haute</option><option value="critical">Critique</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" rows={3} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-600 text-sm">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
