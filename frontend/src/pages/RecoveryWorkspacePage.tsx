import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft, AlertTriangle, Send, Phone, Mail, FileWarning, MessageSquare,
} from 'lucide-react'
import type { DunningTemplate, RecoveryCaseDetail } from '../types/recovery'
import { RISK_TIER_COLORS, RISK_TIER_LABELS } from '../types/recovery'
import {
  fetchRecoveryCase,
  logRecoveryInteraction,
  sendDunningNotice,
  updateRecoveryCase,
} from '../services/recovery'
import { fmtCurrency, fmtDate, fmtDateTime } from '../utils/format'
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  RECOVERY_STATUS_COLORS,
  RECOVERY_STATUS_LABELS,
} from '../constants/labels'
import type { RecoveryStatus } from '../types/client'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />
}

const DUNNING_BUTTONS: { template: DunningTemplate; label: string; icon: typeof Mail; color: string }[] = [
  { template: 'rappel_1', label: 'Rappel 1', icon: Mail, color: 'border-blue-200 text-blue-700 hover:bg-blue-50' },
  { template: 'rappel_2', label: 'Rappel 2', icon: Send, color: 'border-orange-200 text-orange-700 hover:bg-orange-50' },
  { template: 'mise_en_demeure', label: 'Mise en demeure', icon: FileWarning, color: 'border-red-200 text-red-700 hover:bg-red-50' },
]

export default function RecoveryWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const caseId = Number(id)
  const [recoveryCase, setRecoveryCase] = useState<RecoveryCaseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [noteType, setNoteType] = useState<'phone' | 'email' | 'note'>('note')
  const [noteContent, setNoteContent] = useState('')

  const load = useCallback(async () => {
    if (!caseId) return
    setLoading(true)
    try {
      setRecoveryCase(await fetchRecoveryCase(caseId))
    } catch {
      toast.error('Dossier introuvable')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { load() }, [load])

  const handleDunning = async (template: DunningTemplate) => {
    setActionLoading(true)
    try {
      await sendDunningNotice(caseId, template)
      toast.success('Relance envoyée')
      load()
    } catch {
      toast.error('Erreur envoi relance')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLogInteraction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteContent.trim()) return
    setActionLoading(true)
    try {
      await logRecoveryInteraction(caseId, noteType, noteContent.trim())
      toast.success('Interaction enregistrée')
      setNoteContent('')
      load()
    } catch {
      toast.error('Erreur enregistrement')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStatusChange = async (status: RecoveryStatus) => {
    try {
      await updateRecoveryCase(caseId, { status })
      toast.success('Statut mis à jour')
      load()
    } catch {
      toast.error('Erreur mise à jour')
    }
  }

  if (loading || !recoveryCase) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <Link to="/recovery" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-2">
          <ArrowLeft size={16} /> Retour au recouvrement
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Dossier #{recoveryCase.id}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {recoveryCase.client.company_name || recoveryCase.client.name}
              {recoveryCase.invoice && ` · ${recoveryCase.invoice.invoice_number}`}
            </p>
          </div>
          <select
            value={recoveryCase.status}
            onChange={e => handleStatusChange(e.target.value as RecoveryStatus)}
            className={`text-sm rounded-lg px-3 py-2 border-0 font-medium ${RECOVERY_STATUS_COLORS[recoveryCase.status]}`}
          >
            {Object.entries(RECOVERY_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-xs text-gray-500 uppercase">Niveau de risque</p>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${RISK_TIER_COLORS[recoveryCase.risk_tier]}`}>
            {RISK_TIER_LABELS[recoveryCase.risk_tier]}
          </span>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-xs text-gray-500 uppercase">Exposition totale</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{fmtCurrency(recoveryCase.total_exposure)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-xs text-gray-500 uppercase">Jours de retard</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{recoveryCase.overdue_days}j</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-xs text-gray-500 uppercase">Priorité</p>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${PRIORITY_COLORS[recoveryCase.priority]}`}>
            {PRIORITY_LABELS[recoveryCase.priority]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Action center */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-orange-500" /> Centre d'actions
            </h2>
            <div className="space-y-2">
              {DUNNING_BUTTONS.map(({ template, label, icon: Icon, color }) => (
                <button
                  key={template}
                  disabled={actionLoading}
                  onClick={() => handleDunning(template)}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition disabled:opacity-50 ${color}`}
                >
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
          </div>

          {recoveryCase.invoice && (
            <div className="bg-white rounded-xl shadow-sm p-5 text-sm">
              <p className="text-gray-500 text-xs uppercase mb-2">Facture liée</p>
              <Link to={`/invoices/${recoveryCase.invoice.id}`} className="font-mono text-blue-600 hover:underline">
                {recoveryCase.invoice.invoice_number}
              </Link>
              <p className="mt-2">Montant dû: <span className="font-semibold text-red-600">{fmtCurrency(recoveryCase.overdue_amount)}</span></p>
              <p>Pénalités: <span className="font-semibold text-orange-600">{fmtCurrency(recoveryCase.penalty_amount)}</span></p>
              <p className="text-gray-500 mt-1">Échéance: {fmtDate(recoveryCase.invoice.due_date)}</p>
            </div>
          )}

          <form onSubmit={handleLogInteraction} className="bg-white rounded-xl shadow-sm p-5 space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageSquare size={18} className="text-blue-600" /> Journal d'interactions
            </h2>
            <select
              value={noteType}
              onChange={e => setNoteType(e.target.value as 'phone' | 'email' | 'note')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
            >
              <option value="note">Note interne</option>
              <option value="phone">Appel téléphonique</option>
              <option value="email">Email</option>
            </select>
            <textarea
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
              placeholder="Ex: Client a promis de payer vendredi..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={actionLoading || !noteContent.trim()}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Enregistrer
            </button>
          </form>
        </div>

        {/* Timeline */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-6">Chronologie des interactions</h2>
          <div className="space-y-4">
            {recoveryCase.timeline.map((entry, i) => (
              <div key={entry.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    entry.type === 'phone' ? 'bg-purple-100 text-purple-600'
                      : entry.type === 'legal_notice' ? 'bg-red-100 text-red-600'
                        : 'bg-blue-100 text-blue-600'
                  }`}>
                    {entry.type === 'phone' ? <Phone size={14} /> : entry.type === 'legal_notice' ? <FileWarning size={14} /> : <Mail size={14} />}
                  </div>
                  {i < recoveryCase.timeline.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-2" />}
                </div>
                <div className="pb-6 flex-1">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-medium text-sm">{entry.label}</p>
                    <p className="text-xs text-gray-400 whitespace-nowrap">{fmtDateTime(entry.occurred_at)}</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{entry.content}</p>
                  <p className="text-xs text-gray-400 mt-1">Par {entry.author}</p>
                </div>
              </div>
            ))}
            {!recoveryCase.timeline.length && (
              <p className="text-center text-gray-400 py-8">Aucune interaction enregistrée</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
