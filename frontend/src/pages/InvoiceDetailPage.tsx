import { useCallback, useEffect, useState } from 'react'

import { Link, useNavigate, useParams } from 'react-router-dom'

import toast from 'react-hot-toast'

import {

  ArrowLeft, ChevronDown, Download, Mail, AlertTriangle, CreditCard, Clock, FileText, Wallet, X,

} from 'lucide-react'

import { useAuthStore } from '../store/authStore'

import type { InvoiceDetail, InvoiceHistoryEvent, InvoicePaymentRow } from '../types/invoice'

import type { PaymentMethod } from '../types/client'

import {

  downloadInvoicePdf,

  escalateInvoice,

  fetchInvoice,

  fetchInvoiceHistory,

  fetchInvoicePayments,

  sendInvoiceReminder,

} from '../services/invoices'

import { createPayment } from '../services/payments'

import PaymentDocumentScanner, { PaymentFormScanOverlay } from '../components/PaymentDocumentScanner'

import PaymentBankDetailsSection from '../components/PaymentBankDetailsSection'

import { EMPTY_BANK_DETAILS, scanResultToBankDetails, type PaymentBankDetails, type PaymentScanResult } from '../types/ai'

import { fmtCurrency, fmtDate, fmtTime } from '../utils/format'

import { INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS } from '../constants/labels'

import { PAYMENT_STATUS_COLORS } from '../types/payment'



const STAFF = ['admin', 'billing_agent', 'recovery_agent']

const HISTORY_PREVIEW_COUNT = 4



const PAYMENT_METHODS: Record<PaymentMethod, string> = {

  bank_transfer: 'Virement',

  credit_card: 'Carte bancaire',

  check: 'Chèque',

  cash: 'Espèces',

  direct_debit: 'Prélèvement',

}



interface PaymentForm {

  amount: string

  payment_method: PaymentMethod

  reference: string

  notes: string

}



function Skeleton({ className = '' }: { className?: string }) {

  return <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />

}



function getHistoryDotColor(event: InvoiceHistoryEvent): string {

  if (event.type === 'payment' || event.type === 'paid') return 'bg-emerald-500'

  if (event.type === 'recovery') return 'bg-rose-500'

  if (event.type === 'reminder') {

    const text = `${event.label} ${event.description}`.toLowerCase()

    if (text.includes('mise en demeure') || text.includes('legal_notice')) return 'bg-rose-500'

    return 'bg-amber-500'

  }

  if (event.type === 'overdue') return 'bg-amber-500'

  if (event.type === 'created' || event.type === 'sent') return 'bg-slate-400'

  return 'bg-slate-400'

}



function sortHistoryNewestFirst(events: InvoiceHistoryEvent[]): InvoiceHistoryEvent[] {

  return [...events].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())

}



interface TimelineEventProps {

  event: InvoiceHistoryEvent

  expanded: boolean

  onToggle: () => void

  isLast: boolean

}



function TimelineEvent({ event, expanded, onToggle, isLast }: TimelineEventProps) {

  const dotColor = getHistoryDotColor(event)

  const hasDetail = Boolean(event.description?.trim())



  return (

    <div className="flex gap-3">

      <div className="flex flex-col items-center shrink-0 w-2.5">

        <div className={`w-2.5 h-2.5 rounded-full ${dotColor} mt-1.5 shrink-0`} />

        {!isLast && <div className="w-px flex-1 bg-gray-200 mt-1 min-h-4" />}

      </div>

      <div className="flex-1 min-w-0 pb-3">

        <div className="flex items-start gap-1">

          <div className="flex-1 min-w-0">

            <p className="text-sm font-medium text-slate-900">{event.label}</p>

            {hasDetail && (

              <p className={`text-xs text-gray-500 mt-0.5 ${expanded ? 'whitespace-pre-wrap' : 'line-clamp-1'}`}>

                {event.description}

              </p>

            )}

            <p className="text-xs text-gray-400 mt-1">

              {fmtDate(event.occurred_at)} · {event.actor}

            </p>

          </div>

          {hasDetail && (

            <button

              type="button"

              onClick={onToggle}

              aria-expanded={expanded}

              aria-label={expanded ? 'Réduire' : 'Voir le détail'}

              className="p-1 text-gray-400 hover:text-gray-600 shrink-0 rounded hover:bg-slate-100"

            >

              <ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />

            </button>

          )}

        </div>

      </div>

    </div>

  )

}



interface HistoryTimelineProps {

  events: InvoiceHistoryEvent[]

  limit?: number

  expandedIds: Set<string>

  onToggle: (id: string) => void

  onViewAll?: () => void

}



function HistoryTimeline({ events, limit, expandedIds, onToggle, onViewAll }: HistoryTimelineProps) {

  const sorted = sortHistoryNewestFirst(events)

  const visible = limit ? sorted.slice(0, limit) : sorted

  const hasMore = limit != null && sorted.length > limit



  if (!events.length) {

    return <p className="text-sm text-gray-400">Aucun événement</p>

  }



  return (

    <>

      <div className="space-y-0">

        {visible.map((event, i) => (

          <TimelineEvent

            key={event.id}

            event={event}

            expanded={expandedIds.has(event.id)}

            onToggle={() => onToggle(event.id)}

            isLast={i === visible.length - 1 && !hasMore}

          />

        ))}

      </div>

      {hasMore && onViewAll && (

        <button

          type="button"

          onClick={onViewAll}

          className="mt-3 w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium py-2 border-t border-gray-100"

        >

          Voir tout l&apos;historique ({sorted.length})

        </button>

      )}

    </>

  )

}



interface HistoryDrawerProps {

  open: boolean

  events: InvoiceHistoryEvent[]

  expandedIds: Set<string>

  onToggle: (id: string) => void

  onClose: () => void

}



function HistoryDrawer({ open, events, expandedIds, onToggle, onClose }: HistoryDrawerProps) {

  useEffect(() => {

    if (!open) return

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }

    document.addEventListener('keydown', onKey)

    document.body.style.overflow = 'hidden'

    return () => {

      document.removeEventListener('keydown', onKey)

      document.body.style.overflow = ''

    }

  }, [open, onClose])



  if (!open) return null



  return (

    <>

      <div

        className="fixed inset-0 bg-black/40 z-40 transition-opacity"

        onClick={onClose}

        aria-hidden

      />

      <aside

        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col animate-[slideIn_0.25s_ease-out]"

        role="dialog"

        aria-labelledby="history-drawer-title"

      >

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">

          <h2 id="history-drawer-title" className="font-semibold text-gray-900 flex items-center gap-2">

            <Clock size={18} className="text-blue-600" />

            Historique complet

          </h2>

          <button

            type="button"

            onClick={onClose}

            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-slate-100"

            aria-label="Fermer"

          >

            <X size={18} />

          </button>

        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">

          <HistoryTimeline

            events={events}

            expandedIds={expandedIds}

            onToggle={onToggle}

          />

        </div>

      </aside>

    </>

  )

}



export default function InvoiceDetailPage() {

  const { id } = useParams<{ id: string }>()

  const invoiceId = Number(id)

  const navigate = useNavigate()

  const { user } = useAuthStore()

  const isStaff = user ? STAFF.includes(user.role) : false



  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)

  const [history, setHistory] = useState<InvoiceHistoryEvent[]>([])

  const [payments, setPayments] = useState<InvoicePaymentRow[]>([])

  const [loading, setLoading] = useState(true)

  const [actionLoading, setActionLoading] = useState(false)

  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const [scanningDocument, setScanningDocument] = useState(false)

  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false)

  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Set<string>>(new Set())

  const [paymentForm, setPaymentForm] = useState<PaymentForm>({

    amount: '',

    payment_method: 'bank_transfer',

    reference: '',

    notes: '',

  })

  const [bankDetails, setBankDetails] = useState<PaymentBankDetails>(EMPTY_BANK_DETAILS)



  const toggleHistoryItem = (eventId: string) => {

    setExpandedHistoryIds(prev => {

      const next = new Set(prev)

      if (next.has(eventId)) next.delete(eventId)

      else next.add(eventId)

      return next

    })

  }



  const openPaymentModal = () => {

    if (!invoice) return

    setPaymentForm({

      amount: String(invoice.balance_due),

      payment_method: 'bank_transfer',

      reference: '',

      notes: '',

    })

    setBankDetails(EMPTY_BANK_DETAILS)

    setShowPaymentModal(true)

  }



  const load = useCallback(async () => {

    if (!invoiceId) return

    setLoading(true)

    try {

      const [inv, hist, pays] = await Promise.all([

        fetchInvoice(invoiceId),

        fetchInvoiceHistory(invoiceId),

        fetchInvoicePayments(invoiceId),

      ])

      setInvoice(inv)

      setHistory(hist)

      setPayments(pays)

    } catch {

      toast.error('Facture introuvable')

    } finally {

      setLoading(false)

    }

  }, [invoiceId])



  useEffect(() => { load() }, [load])



  const handleReminder = async () => {

    setActionLoading(true)

    try {

      await sendInvoiceReminder(invoiceId)

      toast.success('Relance email envoyée')

      load()

    } catch {

      toast.error('Erreur envoi relance')

    } finally {

      setActionLoading(false)

    }

  }



  const handleEscalate = async () => {

    setActionLoading(true)

    try {

      const result = await escalateInvoice(invoiceId)

      toast.success(result.existing ? 'Dossier recouvrement déjà ouvert' : 'Dossier recouvrement créé')

      if (result.id) navigate(`/recovery/${result.id}`)

    } catch {

      toast.error('Erreur escalade')

    } finally {

      setActionLoading(false)

    }

  }



  const handleDocumentAnalyzed = (result: PaymentScanResult) => {
    setPaymentForm(prev => ({
      ...prev,
      ...(result.amount ? { amount: result.amount } : {}),
      ...(result.reference ? { reference: result.reference } : {}),
      ...(result.payment_method ? { payment_method: result.payment_method } : {}),
    }))
    setBankDetails(scanResultToBankDetails(result))
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {

    e.preventDefault()

    const amount = Number(paymentForm.amount)

    if (!amount || amount <= 0) {

      toast.error('Montant invalide')

      return

    }

    if (invoice && amount > invoice.balance_due) {

      toast.error(`Le montant ne peut pas dépasser ${fmtCurrency(invoice.balance_due)}`)

      return

    }



    setActionLoading(true)

    try {

      const result = await createPayment({

        invoice_id: invoiceId,

        amount,

        payment_method: paymentForm.payment_method,

        reference: paymentForm.reference || undefined,

        notes: paymentForm.notes || undefined,

        ...Object.fromEntries(
          Object.entries(bankDetails).filter(([, value]) => value.trim())
        ),

      })

      setShowPaymentModal(false)

      if (result.new_status === 'paid') {

        toast.success(

          result.recovery_closed?.length

            ? 'Paiement enregistré — facture soldée, dossier recouvrement clôturé'

            : 'Paiement enregistré — facture soldée'

        )

      } else {

        toast.success('Paiement partiel enregistré')

      }

      load()

    } catch (err: unknown) {

      const message = err && typeof err === 'object' && 'response' in err

        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message

        : undefined

      toast.error(message || 'Erreur enregistrement paiement')

    } finally {

      setActionLoading(false)

    }

  }



  if (loading || !invoice) {

    return (

      <div className="p-6 space-y-4 w-full">

        <Skeleton className="h-8 w-64" />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          <Skeleton className="h-96 xl:col-span-5" />

          <Skeleton className="h-96 xl:col-span-4" />

          <Skeleton className="h-96 xl:col-span-3" />

        </div>

      </div>

    )

  }



  const canPay = invoice.balance_due > 0

  const paymentsTotal = payments.reduce((s, p) => s + p.amount, 0)



  return (

    <div className="p-6 space-y-6 w-full">

      <div className="flex items-start justify-between gap-4 flex-wrap">

        <div>

          <Link to="/invoices" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-2">

            <ArrowLeft size={16} /> Retour aux factures

          </Link>

          <div className="flex items-center gap-3 flex-wrap">

            <h1 className="text-2xl font-bold font-mono text-gray-900">{invoice.invoice_number}</h1>

            <span className={`px-3 py-1 rounded-full text-sm font-medium ${INVOICE_STATUS_COLORS[invoice.status]}`}>

              {INVOICE_STATUS_LABELS[invoice.status]}

            </span>

          </div>

          <p className="text-gray-500 text-sm mt-1">

            Émise le {fmtDate(invoice.issue_date)} · Échéance {fmtDate(invoice.due_date)}

          </p>

        </div>

        <div className="flex gap-2 flex-wrap">

          <button

            onClick={() => downloadInvoicePdf(invoice.id, invoice.invoice_number)}

            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-slate-50"

          >

            <Download size={16} /> PDF

          </button>

          {isStaff && canPay && (

            <button

              onClick={openPaymentModal}

              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"

            >

              <CreditCard size={16} /> Enregistrer paiement

            </button>

          )}

        </div>

      </div>



      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        {/* Invoice preview */}

        <div className="xl:col-span-5 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

          <div className="bg-blue-900 text-white px-6 py-4 flex justify-between items-center">

            <div>

              <p className="text-blue-200 text-xs uppercase tracking-wide">Facture</p>

              <p className="text-xl font-bold font-mono">{invoice.invoice_number}</p>

            </div>

            <FileText size={32} className="text-blue-300" />

          </div>



          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-100">

            <div>

              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Émis par</p>

              <p className="font-semibold">{invoice.issued_by.name}</p>

              <p className="text-sm text-gray-600">{invoice.issued_by.address}</p>

              <p className="text-sm text-gray-500">{invoice.issued_by.email}</p>

            </div>

            <div>

              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Facturé à</p>

              <p className="font-semibold">{invoice.billed_to.company_name || invoice.billed_to.contact_name}</p>

              <p className="text-sm text-gray-600">

                {[invoice.billed_to.address, invoice.billed_to.postal_code, invoice.billed_to.city].filter(Boolean).join(', ')}

              </p>

              {(invoice.billed_to.siret || invoice.billed_to.ice) && (

                <p className="text-sm text-gray-500">SIRET/ICE: {invoice.billed_to.siret || invoice.billed_to.ice}</p>

              )}

              <p className="text-sm text-gray-500">{invoice.billed_to.email}</p>

            </div>

          </div>



          <div className="p-6">

            <table className="w-full text-sm">

              <thead>

                <tr className="border-b border-slate-100 text-gray-500 text-xs uppercase">

                  <th className="pb-2.5 text-left font-semibold">Description</th>

                  <th className="pb-2.5 text-right font-semibold w-14">Qté</th>

                  <th className="pb-2.5 text-right font-semibold w-24">P.U. HT</th>

                  <th className="pb-2.5 text-right font-semibold w-24">Total HT</th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-50">

                {invoice.items.map(item => (

                  <tr key={item.id}>

                    <td className="py-3 text-slate-900 font-medium">{item.description}</td>

                    <td className="py-3 text-right text-slate-800 font-medium tabular-nums">{item.quantity}</td>

                    <td className="py-3 text-right text-slate-800 font-medium tabular-nums">{fmtCurrency(item.unit_price)}</td>

                    <td className="py-3 text-right text-slate-900 font-semibold tabular-nums">{fmtCurrency(item.total)}</td>

                  </tr>

                ))}

              </tbody>

            </table>



            <div className="mt-6 border-t border-slate-100 pt-4 space-y-1 text-sm max-w-xs ml-auto">

              <div className="flex justify-between"><span className="text-gray-500">Total HT</span><span className="text-slate-800">{fmtCurrency(invoice.amount_ht)}</span></div>

              <div className="flex justify-between"><span className="text-gray-500">TVA ({invoice.tva_rate}%)</span><span className="text-slate-800">{fmtCurrency(invoice.tva_amount)}</span></div>

              <div className="flex justify-between font-bold text-base border-t border-slate-100 pt-2 text-slate-900"><span>Total TTC</span><span>{fmtCurrency(invoice.amount_ttc)}</span></div>

              <div className="flex justify-between text-green-600"><span>Montant payé</span><span>{fmtCurrency(invoice.amount_paid)}</span></div>

              <div className="flex justify-between font-bold text-red-600 text-base"><span>Solde dû</span><span>{fmtCurrency(invoice.balance_due)}</span></div>

            </div>

          </div>

        </div>



        {/* Payments */}

        <div className="xl:col-span-4 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">

          <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between gap-3 shrink-0">

            <h2 className="font-semibold text-gray-900 flex items-center gap-2 min-w-0">

              <Wallet size={18} className="text-green-600 shrink-0" />

              <span className="truncate">Paiements enregistrés</span>

              <span className="text-sm font-normal text-gray-500 shrink-0">({payments.length})</span>

            </h2>

            {isStaff && canPay && (

              <button

                onClick={openPaymentModal}

                className="text-sm text-green-600 hover:text-green-800 font-medium shrink-0"

              >

                + Ajouter

              </button>

            )}

          </div>

          {payments.length > 0 ? (

            <>

              <div className="flex-1 overflow-y-auto max-h-[420px]">

                <table className="w-full text-sm table-fixed">

                  <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] tracking-wide">

                    <tr>

                      <th className="px-3 py-2 text-left w-[30%]">Date</th>

                      <th className="px-3 py-2 text-right w-[22%]">Montant</th>

                      <th className="px-3 py-2 text-left w-[22%]">Méthode</th>

                      <th className="px-3 py-2 text-left w-[26%]">Statut</th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-gray-100">

                    {payments.map(p => (

                      <tr key={p.id} className="hover:bg-slate-50 align-top">

                        <td className="px-3 py-2.5">

                          <div className="leading-tight">

                            <span className="text-slate-800 font-medium text-xs">{fmtDate(p.payment_date)}</span>

                            <span className="text-slate-400 text-[10px] ml-1">{fmtTime(p.payment_date)}</span>

                          </div>

                          {p.reference && (

                            <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5" title={p.reference}>

                              {p.reference}

                            </p>

                          )}

                          {isStaff && p.recorded_by_name && (

                            <p className="text-[10px] text-gray-400 truncate mt-0.5">{p.recorded_by_name}</p>

                          )}

                        </td>

                        <td className="px-3 py-2.5 text-right font-semibold text-green-600 text-xs tabular-nums">

                          {fmtCurrency(p.amount)}

                        </td>

                        <td className="px-3 py-2.5 text-xs text-slate-700 truncate" title={p.payment_method_label}>

                          {p.payment_method_label}

                        </td>

                        <td className="px-3 py-2.5">

                          <div className="flex flex-col gap-1 items-start">

                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium leading-tight ${PAYMENT_STATUS_COLORS[p.status as keyof typeof PAYMENT_STATUS_COLORS] || PAYMENT_STATUS_COLORS.success}`}>

                              {p.status === 'success' ? 'Succès' : p.status === 'pending' ? 'En attente' : 'Échoué'}

                            </span>

                            {isStaff && (

                              <Link to={`/payments/${p.id}`} className="text-blue-600 hover:underline text-[10px]">

                                Reçu

                              </Link>

                            )}

                          </div>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4 shrink-0">

                <span className="text-sm font-medium text-gray-700">Total encaissé</span>

                <span className="font-bold text-green-700 tabular-nums">{fmtCurrency(paymentsTotal)}</span>

              </div>

            </>

          ) : (

            <div className="text-center py-12 px-4 text-gray-400 text-sm">

              Aucun paiement enregistré pour cette facture

            </div>

          )}

        </div>



        {/* Side panel */}

        <div className="xl:col-span-3 space-y-4">

          {isStaff && (

            <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">

              <h2 className="font-semibold text-gray-900">Actions</h2>

              {canPay && (

                <>

                  <button

                    disabled={actionLoading}

                    onClick={openPaymentModal}

                    className="w-full flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"

                  >

                    <CreditCard size={16} /> Enregistrer un paiement

                  </button>

                  <button

                    disabled={actionLoading}

                    onClick={handleReminder}

                    className="w-full flex items-center gap-2 px-4 py-2.5 border border-blue-200 text-blue-700 rounded-lg text-sm hover:bg-blue-50 disabled:opacity-50"

                  >

                    <Mail size={16} /> Envoyer relance email

                  </button>

                  <button

                    disabled={actionLoading}

                    onClick={handleEscalate}

                    className="w-full flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50"

                  >

                    <AlertTriangle size={16} /> Escalader au recouvrement

                  </button>

                </>

              )}

              {!canPay && (

                <p className="text-sm text-green-600 font-medium">Facture entièrement réglée</p>

              )}

            </div>

          )}



          <div className="bg-white rounded-xl shadow-sm p-5">

            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">

              <Clock size={18} className="text-blue-600" /> Historique

            </h2>

            <HistoryTimeline

              events={history}

              limit={HISTORY_PREVIEW_COUNT}

              expandedIds={expandedHistoryIds}

              onToggle={toggleHistoryItem}

              onViewAll={() => setShowHistoryDrawer(true)}

            />

          </div>

        </div>

      </div>



      <HistoryDrawer

        open={showHistoryDrawer}

        events={history}

        expandedIds={expandedHistoryIds}

        onToggle={toggleHistoryItem}

        onClose={() => setShowHistoryDrawer(false)}

      />



      {showPaymentModal && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">

          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">

            <h2 className="text-lg font-bold mb-1">Enregistrer un paiement</h2>

            <p className="text-sm text-gray-500 mb-4 font-mono">

              {invoice.invoice_number} · Solde dû: {fmtCurrency(invoice.balance_due)}

            </p>

            <PaymentDocumentScanner

              onScanningChange={setScanningDocument}

              onAnalyzed={handleDocumentAnalyzed}

              disabled={scanningDocument || actionLoading}

            />

            <form onSubmit={handlePaymentSubmit} className="space-y-3 mt-4 relative">

              <PaymentFormScanOverlay visible={scanningDocument} />

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-1">Montant (€)</label>

                <input

                  type="number"

                  step="0.01"

                  min="0.01"

                  max={invoice.balance_due}

                  value={paymentForm.amount}

                  onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}

                  required

                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"

                />

                <button

                  type="button"

                  onClick={() => setPaymentForm({ ...paymentForm, amount: String(invoice.balance_due) })}

                  className="text-xs text-green-600 hover:underline mt-1"

                >

                  Payer le solde complet ({fmtCurrency(invoice.balance_due)})

                </button>

              </div>

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>

                <select

                  value={paymentForm.payment_method}

                  onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value as PaymentMethod })}

                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"

                >

                  {Object.entries(PAYMENT_METHODS).map(([value, label]) => (

                    <option key={value} value={value}>{label}</option>

                  ))}

                </select>

              </div>

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-1">Référence bancaire</label>

                <input

                  value={paymentForm.reference}

                  onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}

                  placeholder="VIR-2026-..."

                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"

                />

              </div>

              <PaymentBankDetailsSection value={bankDetails} onChange={setBankDetails} />

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>

                <textarea

                  value={paymentForm.notes}

                  onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}

                  rows={2}

                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"

                />

              </div>

              <div className="flex justify-end gap-3 pt-2">

                <button

                  type="button"

                  onClick={() => setShowPaymentModal(false)}

                  className="px-4 py-2 text-gray-600 text-sm"

                >

                  Annuler

                </button>

                <button

                  type="submit"

                  disabled={actionLoading}

                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50"

                >

                  {actionLoading ? 'Enregistrement...' : 'Confirmer le paiement'}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>

  )

}


