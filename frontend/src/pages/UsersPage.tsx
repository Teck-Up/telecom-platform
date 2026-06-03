import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  billing_agent: 'bg-blue-100 text-blue-700',
  recovery_agent: 'bg-orange-100 text-orange-700',
  client: 'bg-green-100 text-green-700',
}
const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur', billing_agent: 'Agent Facturation',
  recovery_agent: 'Agent Recouvrement', client: 'Client'
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => { api.get('/users').then(r => setUsers(r.data.data)) }, [])

  const toggleActive = async (id: number, user: any) => {
    try {
      await api.put(`/users/${id}`, { ...user, is_active: !user.is_active })
      toast.success('Mis à jour')
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u))
    } catch { toast.error('Erreur') }
  }

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Nom</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Rôle</th>
              <th className="px-4 py-3 text-left">Inscription</th>
              <th className="px-4 py-3 text-center">Actif</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleActive(u.id, u)}
                    className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${u.is_active ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${u.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
