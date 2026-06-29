import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Receipt, FileText, CheckCircle2, Clock, XCircle } from 'lucide-react'
import type { PaymentDetail } from '../types/payment'
import { PAYMENT_STATUS_COLORS } from '../types/payment'
import { fetchPayment } from '../services/payments'
import { fmtCurrency, fmtDateTime } from '../utils/format'
import { INVOICE_STATUS_LABELS } from '../constants/labels'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />
}

const STATUS_ICON = {
  success: CheckCircle2,
  pending: Clock,
  failed: XCircle,
}

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const paymentId = Number(id)
  const [payment, setPayment] = useState<PaymentDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!paymentId) return
    setLoading(true)
    try {
      setPayment(await fetchPayment(paymentId))
    } catch {
      toast.error('Paiement introuvable')
    } finally {
      setLoading(false)
    }
  }, [paymentId])

  useEffect(() => { load() }, [load])

  if (loading || !payment) {
    return (
      <div className="p-6 space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const StatusIcon = STATUS_ICON[payment.status]

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <Link to="/payments" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-2">
          <ArrowLeft size={16} /> Retour aux paiements
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Reçu de paiement</h1>
        <p className="text-gray-500 text-sm font-mono mt-1">{payment.transaction_id}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-green-700 text-white px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-green-200 text-xs uppercase">Reçu</p>
            <p className="text-3xl font-bold">{fmtCurrency(payment.amount)}</p>
          </div>
          <Receipt size={40} className="text-green-300" />
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs uppercase mb-1">Date / Heure</p>
              <p className="font-medium">{fmtDateTime(payment.payment_date)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase mb-1">Méthode</p>
              <p className="font-medium">{payment.payment_method_label}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase mb-1">Référence bancaire</p>
              <p className="font-medium font-mono">{payment.reference || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase mb-1">Enregistré par</p>
              <p className="font-medium">{payment.recorded_by_name || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase mb-1">Client</p>
              <p className="font-medium">{payment.client_name || payment.company_name || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase mb-1">Statut</p>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLORS[payment.status]}`}>
                <StatusIcon size={14} />
                {payment.status_label}
              </span>
            </div>
          </div>

          {payment.notes && (
            <div className="text-sm bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs uppercase mb-1">Notes</p>
              <p>{payment.notes}</p>
            </div>
          )}

          {(payment.bank_name || payment.account_rib || payment.issuer_name || payment.maturity_date) && (
            <div className="text-sm bg-blue-50 rounded-lg p-3 space-y-2">
              <p className="text-blue-800 text-xs uppercase font-medium">Détails bancaires du document</p>
              {payment.bank_name && (
                <p><span className="text-gray-500">Banque :</span> {payment.bank_name}</p>
              )}
              {payment.bank_agency && (
                <p><span className="text-gray-500">Agence :</span> {payment.bank_agency}</p>
              )}
              {payment.issuer_name && (
                <p><span className="text-gray-500">Émetteur :</span> {payment.issuer_name}</p>
              )}
              {payment.account_rib && (
                <p><span className="text-gray-500">RIB :</span> <span className="font-mono">{payment.account_rib}</span></p>
              )}
              {payment.maturity_date && (
                <p><span className="text-gray-500">Échéance :</span> {payment.maturity_date}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {payment.linked_invoice && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={18} className="text-blue-600" /> Facture associée
          </h2>
          <Link
            to={`/invoices/${payment.linked_invoice.id}`}
            className="block border border-blue-100 rounded-lg p-4 hover:bg-blue-50 transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-mono text-blue-600 font-semibold">{payment.linked_invoice.invoice_number}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Statut: {INVOICE_STATUS_LABELS[payment.linked_invoice.status as keyof typeof INVOICE_STATUS_LABELS]}
                </p>
              </div>
              <p className="font-bold">{fmtCurrency(payment.linked_invoice.amount_ttc)} TTC</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm border-t pt-3">
              <div>
                <p className="text-gray-500 text-xs">Montant facture</p>
                <p className="font-medium">{fmtCurrency(payment.linked_invoice.amount_ttc)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Payé (après)</p>
                <p className="font-medium text-green-600">{fmtCurrency(payment.linked_invoice.amount_paid)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Solde restant</p>
                <p className="font-medium text-red-600">{fmtCurrency(payment.linked_invoice.balance_after)}</p>
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
