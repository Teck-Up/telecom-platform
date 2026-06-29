export type ClientStatus = 'active' | 'suspended' | 'terminated'
export type ContractType = 'prepaid' | 'postpaid' | 'enterprise'
export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'
export type RecoveryStatus = 'open' | 'in_progress' | 'resolved' | 'legal' | 'closed'
export type RecoveryPriority = 'low' | 'medium' | 'high' | 'critical'
export type PaymentMethod = 'bank_transfer' | 'credit_card' | 'check' | 'cash' | 'direct_debit'

export type ClientProfileTab = 'overview' | 'invoices' | 'payments' | 'recovery'

export interface AccountManager {
  id: number
  name: string
  email: string
}

export interface ClientDetail {
  id: number
  user_id: number | null
  account_manager_id: number | null
  company_name: string | null
  phone: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  country: string | null
  siret: string | null
  ice: string | null
  contract_type: ContractType
  credit_limit: number
  status: ClientStatus
  created_at: string
  updated_at: string
  name: string | null
  email: string | null
  user_is_active: boolean
  account_manager: AccountManager | null
  invoice_count: number
  total_billed_ttc: number
  total_paid: number
  total_unpaid: number
  overdue_count: number
  average_days_to_pay: number | null
}

export interface ClientFinancials {
  total_billed_ttc: number
  total_paid: number
  total_outstanding: number
  average_days_to_pay: number | null
  invoice_count: number
  overdue_count: number
  open_recovery_cases: number
  recovery_exposure: number
  total_penalties: number
  credit_limit: number
  credit_available: number
}

export interface ClientInvoiceRow {
  id: number
  invoice_number: string
  amount_ht: number
  amount_ttc: number
  amount_paid: number
  balance_due: number
  tva_rate: number
  issue_date: string
  due_date: string
  status: InvoiceStatus
  description: string | null
  billing_agent_name: string | null
}

export interface ClientPaymentRow {
  id: number
  invoice_id: number
  invoice_number: string | null
  amount: number
  payment_date: string
  payment_method: PaymentMethod
  payment_method_label: string
  reference: string | null
  notes: string | null
  recorded_by_name: string | null
}

export interface ClientRecoveryRow {
  id: number
  invoice_id: number
  invoice_number: string | null
  status: RecoveryStatus
  priority: RecoveryPriority
  overdue_amount: number
  penalty_amount: number
  overdue_days: number
  notes: string | null
  agent_name: string | null
  resolved_at: string | null
  created_at: string
}

export interface ClientListItem {
  id: number
  name: string | null
  email: string | null
  company_name: string | null
  contract_type: ContractType
  status: ClientStatus
  invoice_count: number
  total_unpaid: number
}
