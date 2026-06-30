import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Plus, Search, Edit2 } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-yellow-100 text-yellow-800',
  terminated: 'bg-red-100 text-red-800',
}

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', company_name: '', phone: '', address: '', city: '', contract_type: 'postpaid', credit_limit: 0 })

  const load = () => api.get('/clients', { params: { search } }).then(r => setClients(r.data.data))

  useEffect(() => { load() }, [search])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/clients', form)
      toast.success('Client créé')
      setShowModal(false)
      setForm({ name: '', email: '', company_name: '', phone: '', address: '', city: '', contract_type: 'postpaid', credit_limit: 0 })
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur')
    }
  }

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
          <Plus size={16} /> Nouveau client
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={16} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg w-full max-w-sm text-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Rechercher un client..." />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Client </th>
              <th className="px-4 py-3 text-left">Entreprise</th>
              <th className="px-4 py-3 text-left">Contrat</th>
              <th className="px-4 py-3 text-right">Factures</th>
              <th className="px-4 py-3 text-right">Impayés</th>
              <th className="px-4 py-3 text-left">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clients.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{c.user.name}</div>
                  <div className="text-gray-400 text-xs">{c.email}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.company_name || '—'}</td>
                <td className="px-4 py-3 capitalize">{c.contract_type}</td>
                <td className="px-4 py-3 text-right">{c.invoice_count}</td>
                <td className="px-4 py-3 text-right font-medium text-red-600">{fmt(c.total_unpaid)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!clients.length && <div className="text-center py-12 text-gray-400">Aucun client trouvé</div>}
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold mb-4">Nouveau client</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              {[
                { key: 'name', label: 'Nom complet', type: 'text' },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'company_name', label: 'Entreprise', type: 'text' },
                { key: 'phone', label: 'Téléphone', type: 'text' },
                { key: 'address', label: 'Adresse', type: 'text' },
                { key: 'city', label: 'Ville', type: 'text' },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de contrat</label>
                <select value={form.contract_type} onChange={e => setForm({ ...form, contract_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                  <option value="prepaid">Prépayé</option>
                  <option value="postpaid">Postpayé</option>
                  <option value="enterprise">Entreprise</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
