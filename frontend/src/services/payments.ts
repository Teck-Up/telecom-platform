import api from './api'
import type { ApiResponse } from '../types/api'
import type { PaymentDetail } from '../types/payment'
import type { PaymentMethod } from '../types/client'

export interface CreatePaymentPayload {
  invoice_id: number
  amount: number | string
  payment_method: PaymentMethod
  reference?: string
  notes?: string
  payment_date?: string
  bank_name?: string
  bank_agency?: string
  issuer_name?: string
  account_rib?: string
  maturity_date?: string
}

export async function fetchPayment(id: number): Promise<PaymentDetail> {
  const { data } = await api.get<ApiResponse<PaymentDetail>>(`/payments/${id}`)
  return data.data
}

export async function createPayment(payload: CreatePaymentPayload): Promise<{
  id: number
  new_status?: string
  recovery_closed?: number[]
}> {
  const { data } = await api.post<{
    success: boolean
    id: number
    new_status?: string
    recovery_closed?: number[]
    message: string
  }>(
    '/payments',
    payload
  )
  return { id: data.id, new_status: data.new_status, recovery_closed: data.recovery_closed }
}
