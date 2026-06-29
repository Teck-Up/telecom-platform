import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Building2, Mail, Phone, MapPin, UserCircle,
  TrendingUp, Wallet, AlertTriangle, Clock, Download, Search,
} from 'lucide-react'
import type {
  ClientDetail,
  ClientFinancials,
  ClientInvoiceRow,
  ClientPaymentRow,
  ClientProfileTab,
  ClientRecoveryRow,
  ClientStatus,
  InvoiceStatus,
} from '../types/client'
import {
  fetchClient,
  fetchClientFinancials,
  fetchClientInvoices,
  fetchClientPayments,
  fetchClientRecoveryCases,
  updateClientStatus,
  downloadInvoicePdf,
} from '../services/clients'
import { fmtCurrency, fmtDate, fmtDateTime } from '../utils/format'
import {
  CLIENT_STATUS_COLORS,
  CLIENT_STATUS_LABELS,
  CONTRACT_LABELS,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  RECOVERY_STATUS_COLORS,
  RECOVERY_STATUS_LABELS,
} from '../constants/labels'

const TABS: { id: ClientProfileTab; label: string }[] = [
  { id: 'overview', label: 'Vue d\'ensemble' },
  { id: 'invoices', label: 'Factures' },
  { id: 'payments', label: 'Paiements' },
  { id: 'recovery', label: 'Recouvrement' },
]

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />
}

function ProfileSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
    </div>
  )
}

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const clientId = Number(id)

  const [tab, setTab] = useState<ClientProfileTab>('overview')
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [financials, setFinancials] = useState<ClientFinancials | null>(null)
  const [invoices, setInvoices] = useState<ClientInvoiceRow[]>([])
  const [payments, setPayments] = useState<ClientPaymentRow[]>([])
  const [recoveryCases, setRecoveryCases] = useState<ClientRecoveryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tabLoading, setTabLoading] = useState(false)
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus | ''>('')

  const loadClient = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const [clientData, financialData] = await Promise.all([
        fetchClient(clientId),
        fetchClientFinancials(clientId),
      ])
      setClient(clientData)
      setFinancials(financialData)
    } catch {
      toast.error('Impossible de charger le client')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => { loadClient() }, [loadClient])

  useEffect(() => {
    if (!clientId || loading) return

    const loadTab = async () => {
      setTabLoading(true)
      try {
        if (tab === 'invoices') {
          const res = await fetchClientInvoices(clientId, {
            search: invoiceSearch || undefined,
            status: invoiceStatus,
          })
          setInvoices(res.data)
        } else if (tab === 'payments') {
          const res = await fetchClientPayments(clientId)
          setPayments(res.data)
        } else if (tab === 'recovery') {
          const res = await fetchClientRecoveryCases(clientId)
          setRecoveryCases(res.data)
        }
      } catch {
        toast.error('Erreur de chargement des données')
      } finally {
        setTabLoading(false)
      }
    }

    if (tab !== 'overview') loadTab()
  }, [tab, clientId, loading, invoiceSearch, invoiceStatus])

  const handleStatusToggle = async () => {
    if (!client) return
    const next: ClientStatus = client.status === 'active' ? 'suspended' : 'active'
    try {
      await updateClientStatus(client.id, next)
      toast.success(`Compte ${CLIENT_STATUS_LABELS[next].toLowerCase()}`)
      setClient({ ...client, status: next })
    } catch {
      toast.error('Erreur lors de la mise à jour du statut')
    }
  }

  if (loading || !client || !financials) {
    return <ProfileSkeleton />
  }

  const taxId = client.siret || client.ice

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-2">
            <ArrowLeft size={16} /> Retour aux clients
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {client.company_name || client.name || 'Client'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {client.name}{client.email ? ` · ${client.email}` : ''}
          </p>
        </div>
        <button
          onClick={handleStatusToggle}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            client.status === 'active'
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
          }`}
        >
          {client.status === 'active' ? 'Compte actif — Suspendre' : 'Compte suspendu — Réactiver'}
        </button>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl shadow-sm p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-700">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{client.company_name || '—'}</h2>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${CLIENT_STATUS_COLORS[client.status]}`}>
                {CLIENT_STATUS_LABELS[client.status]}
              </span>
              <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                {CONTRACT_LABELS[client.contract_type]}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {taxId && (
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-medium text-gray-800">SIRET / ICE:</span> {taxId}
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={15} className="text-gray-400" /> {client.phone}
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail size={15} className="text-gray-400" /> {client.email}
              </div>
            )}
            {(client.address || client.city) && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin size={15} className="text-gray-400" />
                {[client.address, client.postal_code, client.city, client.country].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
        </div>

        <div className="border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-6">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <UserCircle size={18} className="text-blue-600" />
            Chargé de compte
          </div>
          {client.account_manager ? (
            <div className="text-sm">
              <p className="font-medium">{client.account_manager.name}</p>
              <p className="text-gray-500">{client.account_manager.email}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Non assigné</p>
          )}
          <div className="mt-4 text-xs text-gray-500">
            Plafond crédit: <span className="font-semibold text-gray-800">{fmtCurrency(client.credit_limit)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                tab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total facturé (TTC)', value: fmtCurrency(financials.total_billed_ttc), icon: TrendingUp, color: 'bg-blue-500' },
            { label: 'Total encaissé', value: fmtCurrency(financials.total_paid), icon: Wallet, color: 'bg-green-500' },
            { label: 'Solde impayé', value: fmtCurrency(financials.total_outstanding), icon: AlertTriangle, color: 'bg-red-500' },
            {
              label: 'Délai moyen de paiement',
              value: financials.average_days_to_pay != null ? `${financials.average_days_to_pay} jours` : '—',
              icon: Clock,
              color: 'bg-purple-500',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
              <div className={`${color} p-3 rounded-lg text-white`}><Icon size={20} /></div>
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-lg font-bold text-gray-900">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">Factures</p>
            <p className="text-2xl font-bold">{financials.invoice_count}</p>
            <p className="text-xs text-red-600 mt-1">{financials.overdue_count} en retard</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">Dossiers recouvrement ouverts</p>
            <p className="text-2xl font-bold">{financials.open_recovery_cases}</p>
            <p className="text-xs text-orange-600 mt-1">{fmtCurrency(financials.recovery_exposure)} exposés</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">Pénalités cumulées</p>
            <p className="text-2xl font-bold text-red-600">{fmtCurrency(financials.total_penalties)}</p>
            <p className="text-xs text-gray-500 mt-1">Crédit disponible: {fmtCurrency(financials.credit_available)}</p>
          </div>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={16} />
              <input
                value={invoiceSearch}
                onChange={e => setInvoiceSearch(e.target.value)}
                className="pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="N° facture..."
              />
            </div>
            <select
              value={invoiceStatus}
              onChange={e => setInvoiceStatus(e.target.value as InvoiceStatus | '')}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none"
            >
              <option value="">Tous les statuts</option>
              {Object.entries(INVOICE_STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {tabLoading ? (
              <div className="p-8 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">N° Facture</th>
                    <th className="px-4 py-3 text-right">Montant TTC</th>
                    <th className="px-4 py-3 text-right">Solde dû</th>
                    <th className="px-4 py-3 text-left">Échéance</th>
                    <th className="px-4 py-3 text-left">Statut</th>
                    <th className="px-4 py-3 text-center">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-blue-600">
                      <Link to={`/invoices/${inv.id}`} className="hover:underline">{inv.invoice_number}</Link>
                    </td>
                      <td className="px-4 py-3 text-right">{fmtCurrency(inv.amount_ttc)}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">{fmtCurrency(inv.balance_due)}</td>
                      <td className="px-4 py-3 text-gray-500">{fmtDate(inv.due_date)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${INVOICE_STATUS_COLORS[inv.status]}`}>
                          {INVOICE_STATUS_LABELS[inv.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => downloadInvoicePdf(inv.id, inv.invoice_number)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition"
                        >
                          <Download size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!tabLoading && !invoices.length && (
              <div className="text-center py-12 text-gray-400">Aucune facture pour ce client</div>
            )}
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {tabLoading ? (
            <div className="p-8 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Facture</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3 text-left">Méthode</th>
                  <th className="px-4 py-3 text-left">Référence</th>
                  <th className="px-4 py-3 text-left">Enregistré par</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-gray-500">{fmtDateTime(p.payment_date)}</td>
                    <td className="px-4 py-3 font-mono text-blue-600">{p.invoice_number || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">{fmtCurrency(p.amount)}</td>
                    <td className="px-4 py-3">{p.payment_method_label}</td>
                    <td className="px-4 py-3 text-gray-500">{p.reference || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{p.recorded_by_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!tabLoading && !payments.length && (
            <div className="text-center py-12 text-gray-400">Aucun paiement enregistré</div>
          )}
        </div>
      )}

      {tab === 'recovery' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {tabLoading ? (
            <div className="p-8 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Facture</th>
                  <th className="px-4 py-3 text-right">Montant dû</th>
                  <th className="px-4 py-3 text-right">Pénalités</th>
                  <th className="px-4 py-3 text-right">Retard</th>
                  <th className="px-4 py-3 text-left">Priorité</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recoveryCases.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-blue-600">{c.invoice_number || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">{fmtCurrency(c.overdue_amount)}</td>
                    <td className="px-4 py-3 text-right text-orange-600">{fmtCurrency(c.penalty_amount)}</td>
                    <td className="px-4 py-3 text-right">{c.overdue_days}j</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[c.priority]}`}>
                        {PRIORITY_LABELS[c.priority]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RECOVERY_STATUS_COLORS[c.status]}`}>
                        {RECOVERY_STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.agent_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!tabLoading && !recoveryCases.length && (
            <div className="text-center py-12 text-gray-400">Aucun dossier de recouvrement</div>
          )}
        </div>
      )}
    </div>
  )
}
