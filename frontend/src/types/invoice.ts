import type { InvoiceStatus } from './client'

export interface InvoiceLineItem {
  id: number
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface InvoiceParty {
  name?: string
  company_name?: string | null
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  postal_code?: string | null
  country?: string | null
  siret?: string | null
  ice?: string | null
}

export interface InvoiceDetail {
  id: number
  invoice_number: string
  client_id: number
  amount_ht: number
  amount_ttc: number
  amount_paid: number
  tva_rate: number
  tva_amount: number
  balance_due: number
  issue_date: string
  due_date: string
  status: InvoiceStatus
  description: string | null
  items: InvoiceLineItem[]
  issued_by: InvoiceParty
  billed_to: InvoiceParty
  billing_agent: { id: number; name: string; email: string } | null
}

export interface InvoiceHistoryEvent {
  id: string
  type: 'created' | 'sent' | 'payment' | 'overdue' | 'paid' | 'recovery' | 'reminder'
  label: string
  description: string
  occurred_at: string
  actor: string
}

export interface InvoicePaymentRow {
  id: number
  amount: number
  payment_date: string
  payment_method: string
  payment_method_label: string
  reference: string | null
  notes: string | null
  status: string
  recorded_by_name: string | null
}

export interface InvoiceListRow {
  id: number
  invoice_number: string
  client_id: number
  client_name: string | null
  company_name: string | null
  amount_ttc: number
  amount_paid: number
  balance_due?: number
  due_date: string
  issue_date: string
  status: InvoiceStatus
}
