export interface DashboardTotals {
  total_clients: number
  active_clients: number
  total_invoices: number
  overdue_count: number
  paid_count: number
  recovery_cases: number
  total_ca: number
  total_paid: number
  total_unpaid: number
  invoiced_today: number
  collected_this_month: number
}

export interface DashboardRecovery {
  open_count: number
  open_amount: number
  total_penalties: number
  closed_this_month: number
}

export interface DashboardPaymentMethod {
  method: string
  label: string
  count: number
  total: number
}

export interface DashboardTopUnpaid {
  client_id: number
  name: string | null
  company_name: string | null
  unpaid_invoices: number
  unpaid_amount: number
}

export interface DashboardUpcomingDue {
  id: number
  invoice_number: string
  client_name: string | null
  company_name: string | null
  due_date: string
  balance_due: number
  status: string
  is_overdue: boolean
}

export interface DashboardStats {
  totals: DashboardTotals
  recovery: DashboardRecovery
  monthlyCA: Array<{ month: string; ca: number; paid: number; invoices: number }>
  statusDist: Array<{ status: string; count: number; total: number }>
  paymentMethods: DashboardPaymentMethod[]
  topUnpaid: DashboardTopUnpaid[]
  upcomingDue: DashboardUpcomingDue[]
}
