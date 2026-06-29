import type { PaymentMethod } from './client'
import type { InvoiceStatus } from './client'

export type PaymentStatus = 'success' | 'pending' | 'failed'

export interface PaymentListRow {
  id: number
  invoice_id: number
  invoice_number: string | null
  client_name: string | null
  company_name: string | null
  amount: number
  payment_date: string
  payment_method: PaymentMethod
  payment_method_label: string
  reference: string | null
  bank_name?: string | null
  bank_agency?: string | null
  issuer_name?: string | null
  account_rib?: string | null
  maturity_date?: string | null
  status: PaymentStatus
  status_label: string
}

export interface LinkedInvoiceSummary {
  id: number
  invoice_number: string
  amount_ttc: number
  amount_paid: number
  balance_before: number
  balance_after: number
  status: InvoiceStatus
  issue_date: string
  due_date: string
}

export interface PaymentDetail extends PaymentListRow {
  transaction_id: string
  client_id: number
  notes: string | null
  recorded_by_name: string | null
  created_at: string
  linked_invoice: LinkedInvoiceSummary | null
}

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  success: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
}
