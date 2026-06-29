import api from './api'
import type { ApiResponse } from '../types/api'
import type { InvoiceDetail, InvoiceHistoryEvent, InvoicePaymentRow } from '../types/invoice'

export async function fetchInvoice(id: number): Promise<InvoiceDetail> {
  const { data } = await api.get<ApiResponse<InvoiceDetail>>(`/invoices/${id}`)
  return data.data
}

export async function fetchInvoiceHistory(id: number): Promise<InvoiceHistoryEvent[]> {
  const { data } = await api.get<ApiResponse<InvoiceHistoryEvent[]>>(`/invoices/${id}/history`)
  return data.data
}

export async function fetchInvoicePayments(id: number): Promise<InvoicePaymentRow[]> {
  const { data } = await api.get<ApiResponse<InvoicePaymentRow[]>>(`/invoices/${id}/payments`)
  return data.data
}

export async function sendInvoiceReminder(id: number): Promise<void> {
  await api.post(`/invoices/${id}/reminder`)
}

export async function escalateInvoice(id: number, notes?: string): Promise<{ id: number; existing?: boolean }> {
  const { data } = await api.post<{ success: boolean; id: number; existing?: boolean; message: string }>(
    `/invoices/${id}/escalate`,
    { notes }
  )
  return { id: data.id, existing: data.existing }
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
