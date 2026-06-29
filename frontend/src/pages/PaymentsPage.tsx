import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Plus, ChevronRight } from 'lucide-react'
import type { ApiResponse } from '../types/api'
import type { InvoiceListRow } from '../types/invoice'
import { PAYMENT_STATUS_COLORS, type PaymentListRow } from '../types/payment'
import { fmtCurrency } from '../utils/format'
import PaymentDocumentScanner, { PaymentFormScanOverlay } from '../components/PaymentDocumentScanner'
import PaymentBankDetailsSection from '../components/PaymentBankDetailsSection'
import { EMPTY_BANK_DETAILS, scanResultToBankDetails, type PaymentBankDetails, type PaymentScanResult } from '../types/ai'
import type { PaymentMethod } from '../types/client'

const METHODS: Record<string, string> = {
  bank_transfer: 'Virement',
  credit_card: 'Carte',
  check: 'Chèque',
  cash: 'Espèces',
  direct_debit: 'Prélèvement',
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentListRow[]>([])
  const [invoices, setInvoices] = useState<InvoiceListRow[]>([])
  const [showModal, setShowModal] = useState(false)
  const [scanningDocument, setScanningDocument] = useState(false)
  const [form, setForm] = useState({ invoice_id: '', amount: '', payment_method: 'bank_transfer' as PaymentMethod, reference: '', notes: '' })
  const [bankDetails, setBankDetails] = useState<PaymentBankDetails>(EMPTY_BANK_DETAILS)

  const loadInvoices = () =>
    api.get<ApiResponse<InvoiceListRow[]>>('/invoices', { params: { payable: true } })
      .then(r => setInvoices(r.data.data))
      .catch(() => toast.error('Impossible de charger les factures'))

  const load = () =>
    api.get<ApiResponse<PaymentListRow[]>>('/payments').then(r => setPayments(r.data.data))

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (showModal) loadInvoices()
  }, [showModal])

  const handleInvoiceSelect = (invoiceId: string) => {
    const inv = invoices.find(i => String(i.id) === invoiceId)
    setForm({
      ...form,
      invoice_id: invoiceId,
      amount: inv ? String(inv.balance_due ?? inv.amount_ttc - inv.amount_paid) : '',
    })
  }

  const handleDocumentAnalyzed = (result: PaymentScanResult) => {
    setForm(prev => ({
      ...prev,
      ...(result.amount ? { amount: result.amount } : {}),
      ...(result.reference ? { reference: result.reference } : {}),
      ...(result.payment_method ? { payment_method: result.payment_method } : {}),
    }))
    setBankDetails(scanResultToBankDetails(result))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data } = await api.post<{
        success: boolean
        new_status?: string
        recovery_closed?: number[]
      }>('/payments', {
        ...form,
        ...Object.fromEntries(
          Object.entries(bankDetails).filter(([, value]) => value.trim())
        ),
      })
      if (data.new_status === 'paid') {
        toast.success(
          data.recovery_closed?.length
            ? 'Paiement enregistré — facture soldée, dossier recouvrement clôturé'
            : 'Paiement enregistré — facture soldée'
        )
      } else {
        toast.success('Paiement enregistré')
      }
      setShowModal(false)
      setForm({ invoice_id: '', amount: '', payment_method: 'bank_transfer', reference: '', notes: '' })
      setBankDetails(EMPTY_BANK_DETAILS)
      setScanningDocument(false)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur')
    }
  }

  const fmt = fmtCurrency

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
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 group">
                <td className="px-4 py-3 font-mono">
                  <Link to={`/payments/${p.id}`} className="text-blue-600 hover:underline">{p.invoice_number}</Link>
                </td>
                <td className="px-4 py-3">{p.client_name || p.company_name}</td>
                <td className="px-4 py-3 text-right font-semibold text-green-600">{fmt(p.amount)}</td>
                <td className="px-4 py-3">{p.payment_method_label}</td>
                <td className="px-4 py-3 text-gray-500">{p.reference || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLORS[p.status]}`}>
                    {p.status_label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link to={`/payments/${p.id}`} className="text-gray-400 hover:text-blue-600">
                    <ChevronRight size={18} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!payments.length && <div className="text-center py-12 text-gray-400">Aucun paiement enregistré</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Enregistrer un paiement</h2>
            <PaymentDocumentScanner
              onScanningChange={setScanningDocument}
              onAnalyzed={handleDocumentAnalyzed}
              disabled={scanningDocument}
            />
            <form onSubmit={handleSubmit} className="space-y-3 mt-4 relative">
              <PaymentFormScanOverlay visible={scanningDocument} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Facture</label>
                <select value={form.invoice_id} onChange={e => handleInvoiceSelect(e.target.value)} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                  <option value="">Sélectionner...</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} — {inv.client_name || inv.company_name} — {fmt(inv.balance_due ?? inv.amount_ttc - inv.amount_paid)} dû
                    </option>
                  ))}
                </select>
                {!invoices.length && (
                  <p className="text-xs text-amber-600 mt-1">Aucune facture impayée (sent, partiel, en retard)</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant (€)</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
                <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value as PaymentMethod })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                  {Object.entries(METHODS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
                <input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
              </div>
              <PaymentBankDetailsSection value={bankDetails} onChange={setBankDetails} />
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
