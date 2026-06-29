import api from './api'
import type { ApiResponse, PaginatedResponse } from '../types/api'
import type {
  ClientDetail,
  ClientFinancials,
  ClientInvoiceRow,
  ClientPaymentRow,
  ClientRecoveryRow,
  ClientStatus,
  InvoiceStatus,
  RecoveryStatus,
} from '../types/client'

export async function fetchClient(id: number): Promise<ClientDetail> {
  const { data } = await api.get<ApiResponse<ClientDetail>>(`/clients/${id}`)
  return data.data
}

export async function fetchClientFinancials(id: number): Promise<ClientFinancials> {
  const { data } = await api.get<ApiResponse<ClientFinancials>>(`/clients/${id}/financials`)
  return data.data
}

export async function fetchClientInvoices(
  id: number,
  params?: { search?: string; status?: InvoiceStatus | ''; page?: number; limit?: number }
): Promise<PaginatedResponse<ClientInvoiceRow>> {
  const { data } = await api.get<PaginatedResponse<ClientInvoiceRow>>(`/clients/${id}/invoices`, { params })
  return data
}

export async function fetchClientPayments(
  id: number,
  params?: { page?: number; limit?: number }
): Promise<PaginatedResponse<ClientPaymentRow>> {
  const { data } = await api.get<PaginatedResponse<ClientPaymentRow>>(`/clients/${id}/payments`, { params })
  return data
}

export async function fetchClientRecoveryCases(
  id: number,
  params?: { status?: RecoveryStatus | ''; page?: number; limit?: number }
): Promise<PaginatedResponse<ClientRecoveryRow>> {
  const { data } = await api.get<PaginatedResponse<ClientRecoveryRow>>(`/clients/${id}/recovery-cases`, { params })
  return data
}

export async function updateClientStatus(id: number, status: ClientStatus): Promise<void> {
  await api.patch(`/clients/${id}/status`, { status })
}

export async function downloadInvoicePdf(id: number, invoiceNumber: string): Promise<void> {
  const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `facture-${invoiceNumber}.pdf`
  anchor.click()
  URL.revokeObjectURL(url)
}
